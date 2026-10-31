import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProcessorService } from "../../src/services/processorService/service/ProcessorService.js";
import { MetricsRepository } from "../../src/services/processorService/repository/MetricsRepository.js";
import { ApiHitRepository } from "../../src/services/processorService/repository/ApiHitRepository.js";
import { EventConsumer } from "../../src/services/processorService/consumer.js";
import { RetryStrategy, isRetryable } from "../../src/shared/events/producer/RetryStrategy.js";
import { CircuitBreaker } from "../../src/shared/events/producer/CircuitBreaker.js";
import { EVENT_TYPES } from "../../src/shared/events/eventsContracts.js";

describe("Durable Idempotency & Reliable Aggregation Unit & Failure Scenarios", () => {
    let mockApiHitRepo;
    let mockMetricsRepo;
    let processorService;
    let mockLogger;

    beforeEach(() => {
        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
        };

        mockApiHitRepo = {
            save: vi.fn(),
            deleteOldHits: vi.fn(),
        };

        mockMetricsRepo = {
            recordEventAndAggregateMetrics: vi.fn(),
            upsertEndpointMetrics: vi.fn(),
        };

        processorService = new ProcessorService({
            apiHitRepository: mockApiHitRepo,
            metricsRepository: mockMetricsRepo,
        });
    });

    const createSampleEvent = (overrides = {}) => ({
        eventId: "evt-uuid-12345",
        clientId: "client-abc-001",
        serviceName: "payment-service",
        endpoint: "/api/v1/checkout",
        method: "POST",
        statusCode: 200,
        latencyMs: 120,
        timestamp: new Date().toISOString(),
        ...overrides,
    });

    // TEST 1: Normal event processing
    it("Test 1: Normal event processing persists to Mongo and aggregates in Postgres atomically", async () => {
        const event = createSampleEvent();
        mockApiHitRepo.save.mockResolvedValue({ doc: event, isDuplicate: false });
        mockMetricsRepo.recordEventAndAggregateMetrics.mockResolvedValue({
            isDuplicate: false,
            eventId: event.eventId,
        });

        const result = await processorService.processEvent(event);

        expect(mockApiHitRepo.save).toHaveBeenCalledWith(event);
        expect(mockMetricsRepo.recordEventAndAggregateMetrics).toHaveBeenCalledWith(
            expect.objectContaining({
                eventId: event.eventId,
                clientId: event.clientId,
                metricsData: expect.objectContaining({
                    endpoint: "/api/v1/checkout",
                    totalHits: 1,
                    errorHits: 0,
                    avgLatency: 120,
                }),
            })
        );
        expect(result).toEqual({
            status: "PROCESSED",
            eventId: event.eventId,
        });
    });

    // TEST 2: Duplicate event in the same consumer
    it("Test 2: Duplicate event returns DUPLICATE without incrementing metrics", async () => {
        const event = createSampleEvent();
        mockApiHitRepo.save.mockResolvedValue({ doc: event, isDuplicate: true });
        mockMetricsRepo.recordEventAndAggregateMetrics.mockResolvedValue({
            isDuplicate: true,
            eventId: event.eventId,
        });

        const result = await processorService.processEvent(event);

        expect(result).toEqual({
            status: "DUPLICATE",
            eventId: event.eventId,
        });
    });

    // TEST 3: Duplicate event after consumer restart
    it("Test 3: Duplicate event after consumer restart is detected by Postgres ledger without relying on in-memory Set", async () => {
        const event = createSampleEvent();

        // Fresh consumer instance (in-memory Set is empty)
        const mockChannel = {
            ack: vi.fn(),
            nack: vi.fn(),
            sendToQueue: vi.fn().mockReturnValue(true),
            assertQueue: vi.fn().mockResolvedValue({}),
        };

        const consumer = new EventConsumer({
            processorService,
            logger: mockLogger,
            rabbitmq: { connect: vi.fn().mockResolvedValue(mockChannel) },
            retryStrategy: new RetryStrategy(),
            circuitBreaker: new CircuitBreaker({ logger: mockLogger }),
            config: { rabbitMQ: { queue: "test_queue" } },
            postgres: {},
            mongo: {},
        });
        consumer._channel = mockChannel;

        expect(consumer.processedIds.has(event.eventId)).toBe(false);

        // Processor detects duplicate from durable Postgres ledger
        mockApiHitRepo.save.mockResolvedValue({ doc: event, isDuplicate: true });
        mockMetricsRepo.recordEventAndAggregateMetrics.mockResolvedValue({
            isDuplicate: true,
            eventId: event.eventId,
        });

        const rawMsg = {
            content: Buffer.from(
                JSON.stringify({
                    type: EVENT_TYPES.API_HIT,
                    data: event,
                    messageId: event.eventId,
                })
            ),
            properties: {
                messageId: event.eventId,
                headers: {},
            },
        };

        await consumer._handleMessage(rawMsg);

        expect(mockChannel.ack).toHaveBeenCalledWith(rawMsg);
        expect(mockMetricsRepo.recordEventAndAggregateMetrics).toHaveBeenCalledTimes(1);
        expect(consumer.processedIds.has(event.eventId)).toBe(true);
    });

    // TEST 4: PostgreSQL unavailable during aggregation propagates error and allows retry
    it("Test 4: PostgreSQL failure is not swallowed, propagates to consumer, and allows retry without Mongo duplication", async () => {
        const event = createSampleEvent();
        const pgError = new Error("Connection terminated unexpectedly");
        pgError.code = "08006";

        // First attempt: Mongo succeeds, Postgres fails
        mockApiHitRepo.save.mockResolvedValue({ doc: event, isDuplicate: false });
        mockMetricsRepo.recordEventAndAggregateMetrics.mockRejectedValue(pgError);

        await expect(processorService.processEvent(event)).rejects.toThrow("Connection terminated unexpectedly");

        // Verify consumer routes to retry and does NOT acknowledge
        const mockChannel = {
            ack: vi.fn(),
            nack: vi.fn(),
            sendToQueue: vi.fn().mockReturnValue(true),
            assertQueue: vi.fn().mockResolvedValue({}),
        };

        const retryStrategy = new RetryStrategy({ maxRetries: 3 });
        const consumer = new EventConsumer({
            processorService,
            logger: mockLogger,
            rabbitmq: { connect: vi.fn().mockResolvedValue(mockChannel) },
            retryStrategy,
            circuitBreaker: new CircuitBreaker({ logger: mockLogger }),
            config: { rabbitMQ: { queue: "test_queue" } },
            postgres: {},
            mongo: {},
        });
        consumer._channel = mockChannel;

        const rawMsg = {
            content: Buffer.from(
                JSON.stringify({
                    type: EVENT_TYPES.API_HIT,
                    data: event,
                    messageId: event.eventId,
                })
            ),
            properties: {
                messageId: event.eventId,
                headers: { "x-retry-count": 0 },
            },
        };

        await consumer._handleMessage(rawMsg);

        // Must NOT ack message when Postgres aggregation fails
        expect(mockChannel.ack).not.toHaveBeenCalled();
        expect(consumer.processedIds.has(event.eventId)).toBe(false);

        // Second attempt (retry after Postgres recovered): Mongo reports duplicate, Postgres succeeds
        mockApiHitRepo.save.mockResolvedValue({ doc: event, isDuplicate: true });
        mockMetricsRepo.recordEventAndAggregateMetrics.mockResolvedValue({
            isDuplicate: false,
            eventId: event.eventId,
        });

        const retryResult = await processorService.processEvent(event);
        expect(retryResult.status).toBe("PROCESSED");
        expect(mockMetricsRepo.recordEventAndAggregateMetrics).toHaveBeenCalledTimes(3);
    });

    // TEST 5: Failure after ledger insert rolls back transaction
    it("Test 5: MetricsRepository transaction rolls back if metric upsert fails after ledger insert", async () => {
        const mockClient = {
            query: vi.fn(),
            release: vi.fn(),
        };

        const mockPool = {
            connect: vi.fn().mockResolvedValue(mockClient),
        };

        const metricsRepo = new MetricsRepository({
            postgres: mockPool,
            logger: mockLogger,
        });

        // 1. BEGIN succeeds
        // 2. Ledger insert succeeds (returns event_id)
        // 3. Metric upsert fails
        mockClient.query.mockImplementation(async (queryObj) => {
            const sql = typeof queryObj === "string" ? queryObj : queryObj?.text || "";
            if (sql === "BEGIN") return {};
            if (sql.includes("INSERT INTO processed_events")) {
                return { rowCount: 1, rows: [{ event_id: "evt-rollback-test" }] };
            }
            if (sql.includes("INSERT INTO endpoint_metrics")) {
                throw new Error("Disk full / serialization error during metric UPSERT");
            }
            if (sql === "ROLLBACK") return {};
            return {};
        });

        await expect(
            metricsRepo.recordEventAndAggregateMetrics({
                eventId: "evt-rollback-test",
                clientId: "client-123",
                metricsData: {
                    clientId: "client-123",
                    serviceName: "service",
                    endpoint: "/test",
                    method: "GET",
                    totalHits: 1,
                    errorHits: 0,
                    avgLatency: 50,
                    minLatency: 50,
                    maxLatency: 50,
                    timeBucket: new Date(),
                },
            })
        ).rejects.toThrow("Disk full / serialization error during metric UPSERT");

        // Verify rollback was issued and client released
        expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
        expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    // TEST 6: Failure after aggregation but before ACK (redelivery safe)
    it("Test 6: Redelivery after Postgres commit but before RabbitMQ ACK is handled safely by ledger", async () => {
        const mockClient = {
            query: vi.fn(),
            release: vi.fn(),
        };

        const mockPool = {
            connect: vi.fn().mockResolvedValue(mockClient),
        };

        const metricsRepo = new MetricsRepository({
            postgres: mockPool,
            logger: mockLogger,
        });

        // On redelivery, ledger insert returns rowCount: 0 (conflict).
        // Then verification query checks client_id and matches.
        mockClient.query.mockImplementation(async (queryObj) => {
            const sql = typeof queryObj === "string" ? queryObj : queryObj?.text || "";
            if (sql === "BEGIN") return {};
            if (sql.includes("INSERT INTO processed_events")) {
                return { rowCount: 0, rows: [] };
            }
            if (sql.includes("SELECT client_id FROM processed_events")) {
                return { rowCount: 1, rows: [{ client_id: "client-123" }] };
            }
            if (sql === "COMMIT") return {};
            return {};
        });

        const result = await metricsRepo.recordEventAndAggregateMetrics({
            eventId: "evt-committed-before-ack",
            clientId: "client-123",
            metricsData: {
                clientId: "client-123",
                serviceName: "svc",
                endpoint: "/ep",
                method: "GET",
                totalHits: 1,
            },
        });

        expect(result.isDuplicate).toBe(true);
        expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
        // Verify upsertEndpointMetrics was NOT called
        const metricQueries = mockClient.query.mock.calls.filter(([call]) => {
            const sql = typeof call === "string" ? call : call?.text || "";
            return sql.includes("INSERT INTO endpoint_metrics");
        });
        expect(metricQueries.length).toBe(0);
    });

    // TEST 7: Concurrent duplicate deliveries
    it("Test 7: Concurrent duplicate deliveries result in exactly one aggregation", async () => {
        let ledgerInserted = false;
        let metricAggregatedCount = 0;

        const createClientMock = () => {
            const client = {
                query: vi.fn().mockImplementation(async (queryObj) => {
                    const sql = typeof queryObj === "string" ? queryObj : queryObj?.text || "";
                    if (sql === "BEGIN" || sql === "COMMIT") return {};
                    if (sql.includes("INSERT INTO processed_events")) {
                        if (!ledgerInserted) {
                            ledgerInserted = true;
                            return { rowCount: 1, rows: [{ event_id: "evt-concurrent" }] };
                        }
                        return { rowCount: 0, rows: [] };
                    }
                    if (sql.includes("SELECT client_id FROM processed_events")) {
                        return { rowCount: 1, rows: [{ client_id: "client-concurrent" }] };
                    }
                    if (sql.includes("INSERT INTO endpoint_metrics")) {
                        metricAggregatedCount++;
                        return {};
                    }
                    return {};
                }),
                release: vi.fn(),
            };
            return client;
        };

        const mockPool = {
            connect: vi.fn().mockImplementation(async () => createClientMock()),
        };

        const metricsRepo = new MetricsRepository({
            postgres: mockPool,
            logger: mockLogger,
        });

        const params = {
            eventId: "evt-concurrent",
            clientId: "client-concurrent",
            metricsData: {
                clientId: "client-concurrent",
                serviceName: "service",
                endpoint: "/test",
                method: "GET",
                totalHits: 1,
                errorHits: 0,
                avgLatency: 50,
                minLatency: 50,
                maxLatency: 50,
                timeBucket: new Date(),
            },
        };

        const [res1, res2] = await Promise.all([
            metricsRepo.recordEventAndAggregateMetrics(params),
            metricsRepo.recordEventAndAggregateMetrics(params),
        ]);

        const duplicates = [res1, res2].filter((r) => r.isDuplicate);
        const processed = [res1, res2].filter((r) => !r.isDuplicate);

        expect(processed.length).toBe(1);
        expect(duplicates.length).toBe(1);
        expect(metricAggregatedCount).toBe(1);
    });

    // TEST 8: Different events with identical dimensions
    it("Test 8: Different event IDs with identical dimensions both aggregate correctly", async () => {
        let aggregatedCount = 0;

        const createClientMock = (eventId) => ({
            query: vi.fn().mockImplementation(async (queryObj) => {
                const sql = typeof queryObj === "string" ? queryObj : queryObj?.text || "";
                if (sql === "BEGIN" || sql === "COMMIT") return {};
                if (sql.includes("INSERT INTO processed_events")) {
                    return { rowCount: 1, rows: [{ event_id: eventId }] };
                }
                if (sql.includes("INSERT INTO endpoint_metrics")) {
                    aggregatedCount++;
                    return {};
                }
                return {};
            }),
            release: vi.fn(),
        });

        const mockPool = {
            connect: vi.fn()
                .mockResolvedValueOnce(createClientMock("evt-alpha"))
                .mockResolvedValueOnce(createClientMock("evt-beta")),
        };

        const metricsRepo = new MetricsRepository({
            postgres: mockPool,
            logger: mockLogger,
        });

        const baseMetrics = {
            clientId: "client-tenant",
            serviceName: "auth-service",
            endpoint: "/login",
            method: "POST",
            totalHits: 1,
            errorHits: 0,
            avgLatency: 80,
            minLatency: 80,
            maxLatency: 80,
            timeBucket: new Date("2026-10-31T10:00:00Z"),
        };

        const res1 = await metricsRepo.recordEventAndAggregateMetrics({
            eventId: "evt-alpha",
            clientId: "client-tenant",
            metricsData: baseMetrics,
        });

        const res2 = await metricsRepo.recordEventAndAggregateMetrics({
            eventId: "evt-beta",
            clientId: "client-tenant",
            metricsData: baseMetrics,
        });

        expect(res1.isDuplicate).toBe(false);
        expect(res2.isDuplicate).toBe(false);
        expect(aggregatedCount).toBe(2);
    });

    // TEST 9: Tenant identity mismatch
    it("Test 9: Tenant identity mismatch throws EVENT_INTEGRITY_MISMATCH and is non-retryable", async () => {
        const mockClient = {
            query: vi.fn().mockImplementation(async (queryObj) => {
                const sql = typeof queryObj === "string" ? queryObj : queryObj?.text || "";
                if (sql === "BEGIN") return {};
                if (sql.includes("INSERT INTO processed_events")) {
                    return { rowCount: 0, rows: [] }; // duplicate event ID
                }
                if (sql.includes("SELECT client_id FROM processed_events")) {
                    return { rowCount: 1, rows: [{ client_id: "original-client" }] };
                }
                if (sql === "ROLLBACK") return {};
                return {};
            }),
            release: vi.fn(),
        };

        const mockPool = {
            connect: vi.fn().mockResolvedValue(mockClient),
        };

        const metricsRepo = new MetricsRepository({
            postgres: mockPool,
            logger: mockLogger,
        });

        let thrownError = null;
        try {
            await metricsRepo.recordEventAndAggregateMetrics({
                eventId: "collision-evt-id",
                clientId: "intruder-client",
                metricsData: {},
            });
        } catch (err) {
            thrownError = err;
        }

        expect(thrownError).toBeDefined();
        expect(thrownError.code).toBe("EVENT_INTEGRITY_MISMATCH");
        expect(thrownError.message).toContain("collision-evt-id");
        expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
        expect(isRetryable(thrownError)).toBe(false);
    });

    // TEST 10: Retry exhaustion and DLQ
    it("Test 10: Retry exhaustion routes message to DLQ with metadata and acks only after DLQ publish succeeds", async () => {
        const event = createSampleEvent();
        const mockChannel = {
            ack: vi.fn(),
            nack: vi.fn(),
            sendToQueue: vi.fn().mockReturnValue(true),
            assertQueue: vi.fn().mockResolvedValue({}),
        };

        const retryStrategy = new RetryStrategy({ maxRetries: 3 });
        const consumer = new EventConsumer({
            processorService,
            logger: mockLogger,
            rabbitmq: { connect: vi.fn().mockResolvedValue(mockChannel) },
            retryStrategy,
            circuitBreaker: new CircuitBreaker({ logger: mockLogger }),
            config: { rabbitMQ: { queue: "api_hits" } },
            postgres: {},
            mongo: {},
        });
        consumer._channel = mockChannel;

        // Exhausted retries (retryCount = 3, maxRetries = 3)
        const exhaustError = new Error("Database timeout persistent error");
        mockApiHitRepo.save.mockRejectedValue(exhaustError);

        const rawMsg = {
            content: Buffer.from(
                JSON.stringify({
                    type: EVENT_TYPES.API_HIT,
                    data: event,
                    messageId: event.eventId,
                })
            ),
            properties: {
                messageId: event.eventId,
                headers: { "x-retry-count": 3 },
            },
        };

        await consumer._handleMessage(rawMsg);

        // DLQ assertion and sendToQueue must be called
        expect(mockChannel.assertQueue).toHaveBeenCalledWith("api_hits.dlq", { durable: true });
        expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
            "api_hits.dlq",
            rawMsg.content,
            expect.objectContaining({
                persistent: true,
                headers: expect.objectContaining({
                    "x-dlq-reason": "MAX_RETRIES_EXCEEDED",
                    "x-dlq-error": "Database timeout persistent error",
                }),
            })
        );
        // Acknowledged only after DLQ publish
        expect(mockChannel.ack).toHaveBeenCalledWith(rawMsg);
        expect(consumer._stats.dlqrouted).toBe(1);
    });

    // Test rejection of missing / unknown / empty event IDs
    it("Rejects malformed events with missing or 'unknown' eventId", async () => {
        await expect(
            processorService.processEvent({
                eventId: "unknown",
                clientId: "client-123",
                serviceName: "service",
                endpoint: "/test",
                method: "GET",
            })
        ).rejects.toThrow(/Invalid event ID/);

        await expect(
            processorService.processEvent({
                eventId: "",
                clientId: "client-123",
                serviceName: "service",
                endpoint: "/test",
                method: "GET",
            })
        ).rejects.toThrow(/Invalid event ID/);

        await expect(
            processorService.processEvent({
                clientId: "client-123",
                serviceName: "service",
                endpoint: "/test",
                method: "GET",
            })
        ).rejects.toThrow(/Invalid event ID/);
    });
});
