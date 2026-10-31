import { z } from "zod";
import postgres from "../../shared/config/postgres.js";
import rabbitmq from "../../shared/config/rabbitmq.js";
import mongo from "../../shared/config/mongodb.js";
import logger from "../../shared/config/logger.js";
import config from "../../shared/config/index.js";
import ProcessorContainer from "./Dependencies/dependencies.js";
import { EVENT_TYPES } from "../../shared/events/eventsContracts.js";
import {
    RetryStrategy,
    isRetryable,
} from "../../shared/events/producer/RetryStrategy.js";
import { CircuitBreaker } from "../../shared/events/producer/CircuitBreaker.js";

const messageSchema = z.object({
    type: z.enum([EVENT_TYPES.API_HIT]),
    data: z.record(z.string(), z.unknown()),
    messageId: z.string().optional(),
    timestamp: z.union([z.string(), z.number()]).optional(),
});

class EventConsumer {
    constructor({
        processorService,
        logger,
        rabbitmq,
        retryStrategy,
        circuitBreaker,
        config,
        postgres,
        mongo,
    }) {
        this._processorService = processorService;
        this._logger = logger;
        this._rabbitmq = rabbitmq;
        this._retryStrategy = retryStrategy;
        this._circuitBreaker = circuitBreaker;
        this._config = config;
        this._postgres = postgres;
        this._mongo = mongo;

        this.isRunning = false;
        this._channel = null;
        this._stats = {
            processed: 0,
            failed: 0,
            retried: 0,
            dlqrouted: 0,
            lastProcessedAt: null,
        };
        this.processedIds = new Set();
        this.poisonMessages = new Map();
    }

    async start() {
        try {
            // first connect to all databases
            await this._connectDatabases();
            // connect to message broker
            this._channel = await this._rabbitmq.connect();

            const prefetch = this._config?.consumer?.prefetch ?? 10;
            await this._channel.prefetch(prefetch);

            this._channel.on("error", (error) => {
                this._logger.error(`RabbitMQ channel error: ${error.message}`, {
                    error,
                });
                this._circuitBreaker.onfailure();
            });

            this._channel.on("close", async () => {
                this._logger.warn("RabbitMQ channel closed unexpectedly");
                if (this.isRunning) {
                    await this._reconnect();
                }
            });

            this._logger.info(
                `started consuming from queue: ${this._config.rabbitMQ.queue}`,
            );
            this.isRunning = true;

            await this._channel.consume(
                this._config.rabbitMQ.queue,
                async (msg) => {
                    if (msg !== null) {
                        await this._handleMessage(msg);
                    }
                },
                { noAck: false, consumerTag: `consumer-${Date.now()}` },
            );

            this._logger.info("Event consumer is running");
        } catch (error) {
            this._logger.error(
                `Failed to start event consumer: ${error.message}`,
            );
            await this._cleanup();
            throw error;
        }
    }

    async _connectDatabases() {
        const maxRetries = 5;
        let retries = 0;

        while (retries < maxRetries) {
            try {
                this._logger.info(
                    `Attempting to connect to databases (Attempt ${retries + 1}/${maxRetries})`,
                );
                await Promise.all([
                    this._postgres.testConnection(),
                    this._mongo.connect(),
                ]);

                this._logger.info("Successfully connected to all databases");
                return; // Exit the loop if successful
            } catch (error) {
                retries++;
                this._logger.error(
                    `Database connection attempt ${retries} failed: ${error.message}`,
                    { error },
                );
                if (retries >= maxRetries) {
                    this._logger.error(
                        "Max database connection attempts reached. Exiting.",
                    );
                    throw error;
                }

                await new Promise((resolve) =>
                    setTimeout(resolve, 5000 * retries),
                );
            }
        }
    }

    async _reconnect() {
        try {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            this._channel = await this._rabbitmq.connect();
            const prefetch = this._config?.consumer?.prefetch ?? 10;
            await this._channel.prefetch(prefetch);

            this._channel.on("error", (error) => {
                this._logger.error(`RabbitMQ channel error: ${error.message}`, {
                    error,
                });
                this._circuitBreaker.onfailure();
            });

            this._channel.on("close", async () => {
                this._logger.warn("RabbitMQ channel closed unexpectedly");
                if (this.isRunning) {
                    await this._reconnect();
                }
            });

            await this._channel.consume(
                this._config.rabbitMQ.queue,
                async (msg) => {
                    if (msg !== null) {
                        await this._handleMessage(msg);
                    }
                },
                { noAck: false, consumerTag: `consumer-${Date.now()}` },
            );
        } catch (error) {
            this._logger.error("Failed to reconnect to RabbitMQ:", error);
            if (this.isRunning) {
                setTimeout(() => this._reconnect(), 10000);
            }
        }
    }

    async _cleanup() {
        try {
            this.isRunning = false;
            if (this._channel) {
                await this._channel.close();
                this._channel = null;
            }
        } catch (error) {
            this._logger.error(`Error during cleanup: ${error.message}`, {
                error,
            });
        }
    }

    async _handleMessage(msg) {
        if (!this._circuitBreaker.allowRequest()) {
            this._logger.warn("Circuit breaker is open, skipping message");
            this._channel.nack(msg, false, true);
            return;
        }

        const startTime = new Date();
        let messageData = null;

        try {
            messageData = this._parseMessage(msg);

            // Fast-path in-memory idempotency check (optimization only)
            if (this.processedIds.has(messageData.messageId)) {
                this._logger.debug("Duplicate message skipped by in-memory cache", {
                    messageId: messageData.messageId,
                });
                this._channel.ack(msg);
                return;
            }

            // Process message (Mongo save + Postgres atomic transaction)
            await this._processeMessage(messageData);

            // Acknowledge ONLY after Mongo save and PostgreSQL aggregation succeed (or was already committed)
            this._channel.ack(msg);
            this._circuitBreaker.onSuccess();
            this._stats.processed++;
            this._stats.lastProcessedAt = new Date();

            // Add to in-memory set ONLY on successful commit
            this.processedIds.add(messageData.messageId);

            if (this.processedIds.size > 10000) {
                const first = this.processedIds.values().next().value;
                this.processedIds.delete(first);
            }

            this.poisonMessages.delete(messageData.type);
        } catch (error) {
            await this._handleMessageError(error, msg, messageData, startTime);
        }
    }

    _parseMessage(msg) {
        try {
            const content = msg.content.toString();
            const rawParsed = JSON.parse(content);
            const parsedMessage = messageSchema.safeParse(rawParsed);
            if (!parsedMessage.success) {
                throw new Error(
                    `Schema Validation failed: ${parsedMessage.error.issues.map((i) => i.message).join(",")}`,
                );
            }

            // Canonical durable idempotency key: must be valid non-empty string and not "unknown"
            const canonicalEventId =
                msg.properties?.messageId ||
                parsedMessage.data.messageId ||
                parsedMessage.data.data?.eventId;

            if (
                !canonicalEventId ||
                typeof canonicalEventId !== "string" ||
                canonicalEventId.trim() === "" ||
                canonicalEventId === "unknown"
            ) {
                throw new Error(
                    "Message validation failed: canonical eventId / messageId is missing, empty, or 'unknown'",
                );
            }

            // Ensure eventId in inner payload matches canonicalEventId
            const payloadData = { ...parsedMessage.data.data };
            if (!payloadData.eventId) {
                payloadData.eventId = canonicalEventId;
            }

            return {
                ...parsedMessage.data,
                data: payloadData,
                messageId: canonicalEventId,
                retryCount: Number.parseInt(
                    msg.properties?.headers?.["x-retry-count"] || 0,
                ),
            };
        } catch (error) {
            throw new Error(`Message validation failed: ${error.message}`);
        }
    }

    async _processeMessage(messageData) {
        switch (messageData.type) {
            case EVENT_TYPES.API_HIT:
                await this._processorService.processEvent(messageData.data);
                break;

            default:
                throw new Error("Unknown message type: " + messageData.type);
        }
    }

    async _handleMessageError(error, msg, messageData, startTime) {
        const messageId =
            messageData?.messageId || msg.properties?.messageId || "unknown";
        const retryCount = messageData?.retryCount || 0;

        this._circuitBreaker.onfailure();
        this._stats.failed++;

        const eventType = messageData?.type ?? "unknown";
        const poisonCount = (this.poisonMessages.get(eventType) || 0) + 1;
        this.poisonMessages.set(eventType, poisonCount);

        if (poisonCount >= 10) {
            this._logger.error("Poison message pattern detected", {
                eventType,
                consecutiveFailures: poisonCount,
            });
        }

        if (
            !isRetryable(error) ||
            !this._retryStrategy.shouldRetry(retryCount)
        ) {
            await this._sendToDlq(
                msg,
                error,
                retryCount >= this._retryStrategy.maxRetries
                    ? "MAX_RETRIES_EXCEEDED"
                    : "NON_RETRYABLE",
            );
            return;
        }

        await this._retryMessage(msg, retryCount);
    }

    async _sendToDlq(msg, error, reason) {
        const dlqName = `${this._config.rabbitMQ.queue}.dlq`;
        try {
            await this._channel.assertQueue(dlqName, { durable: true });
            const sent = this._channel.sendToQueue(dlqName, msg.content, {
                ...msg.properties,
                persistent: true,
                headers: {
                    ...msg.properties?.headers,
                    "x-dlq-reason": reason,
                    "x-dlq-error": error?.message || "Unknown error",
                    "x-dlq-timestamp": new Date().toISOString(),
                    "x-original-queue": `${this._config.rabbitMQ.queue}`,
                },
            });

            if (sent) {
                this._channel.ack(msg);
                this._stats.dlqrouted++;
                this._logger.warn(`Message routed to DLQ [${reason}]:`, {
                    messageId: msg.properties?.messageId,
                    error: error?.message,
                });
            } else {
                this._logger.error(
                    "Failed to send message to DLQ (sendToQueue returned false), preserving message on queue",
                    {
                        messageId: msg.properties?.messageId,
                    },
                );
                this._channel.nack(msg, false, true);
            }
        } catch (dlqErr) {
            this._logger.error(`Error sending message to DLQ: ${dlqErr.message}`, {
                error: dlqErr,
                originalError: error?.message,
            });
            this._channel.nack(msg, false, true);
        }
    }

    async _retryMessage(msg, retryCount) {
        const delay = this._retryStrategy.delay(retryCount);

        const retryHeaders = {
            ...msg.properties?.headers,
            "x-retry-count": retryCount + 1,
            "x-timestamp": new Date().toISOString(),
            "x-retry-delay": delay,
            "x-original-queue": `${this._config.rabbitMQ.queue}`,
        };

        setTimeout(async () => {
            try {
                const sent = this._channel.sendToQueue(
                    this._config.rabbitMQ.queue,
                    msg.content,
                    {
                        ...msg.properties,
                        headers: retryHeaders,
                    },
                );

                if (sent) {
                    this._channel.ack(msg);
                    this._stats.retried++;

                    this._logger.info("Message scheduled for retry", {
                        messageId: msg.properties?.messageId,
                        retryCount: retryCount + 1,
                        delay,
                    });
                } else {
                    this._logger.error("Failed to republish message for retry, routing to DLQ");
                    await this._sendToDlq(msg, new Error("Buffer full during retry publish"), "RETRY_FAILED");
                }
            } catch (error) {
                this._logger.error("Failed to schedule retry:", error);
                await this._sendToDlq(msg, error, "RETRY_FAILED");
            }
        }, delay);
    }

    async stop() {
        try {
            await this._cleanup();

            await Promise.all([
                this._rabbitmq.close(),
                this._postgres.close(),
                this._mongo.disconnect(),
            ]);
        } catch (error) {
            throw new Error("Error stopping consumer: " + error?.message);
        }
    }
}

const retryStrategy = new RetryStrategy({
    maxRetries: config.rabbitMQ.retryAttempts,
    baseDelayMs: config.rabbitMQ.retryDelay,
    maxDelayMs: 30_000,
    jitterFactor: 0.3,
});

const circuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    cooldownMs: 30_000,
    halfOpenMaxAttempts: 3,
    logger,
});

const consumer = new EventConsumer({
    processorService: ProcessorContainer.services.processorService,
    rabbitmq,
    mongo,
    postgres,
    config,
    logger,
    retryStrategy,
    circuitBreaker,
});

async function startConsumerWithRetry() {
    const startupRetry = new RetryStrategy({
        maxRetries: 5,
        baseDelayMs: 1000,
        maxDelayMs: 30_000,
    });
    let attempt = 0;

    while (startupRetry.shouldRetry(attempt) || attempt === 0) {
        try {
            logger.info(`Starting consumer (attempt ${attempt + 1})`);

            await consumer.start();
            logger.info("Consumer started successfully");
            return;
        } catch (error) {
            attempt++;
            logger.error(`Consumer start attempt ${attempt} failed:`, error);

            if (!startupRetry.shouldRetry(attempt)) {
                logger.error('Max retries reached, exiting...');
                process.exit(1);
            }

            await startupRetry.wait(attempt - 1);
        }
    }
}

process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await consumer.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await consumer.stop();
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

export { EventConsumer, startConsumerWithRetry };

if (process.env.NODE_ENV !== "test") {
    await startConsumerWithRetry();
}

export default consumer;
