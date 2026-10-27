import amqp from "amqplib";
import config from "../../src/shared/config/index.js";
import rabbitmq from "../../src/shared/config/rabbitmq.js";

let testConnection = null;
let testChannel = null;

/**
 * Connect to RabbitMQ for test operations
 */
export async function connectTestRabbitMQ() {
    if (!testConnection) {
        testConnection = await amqp.connect(config.rabbitMQ.url);
        testChannel = await testConnection.createChannel();

        const queueName = config.rabbitMQ.queue;
        const dlqName = `${queueName}.dlq`;

        await testChannel.assertQueue(dlqName, { durable: true });
        await testChannel.assertQueue(queueName, {
            durable: true,
            arguments: {
                "x-dead-letter-exchange": "",
                "x-dead-letter-routing-key": dlqName,
            },
        });
    }

    return { connection: testConnection, channel: testChannel };
}

/**
 * Health check for RabbitMQ
 */
export async function checkRabbitMQHealth() {
    try {
        const { channel } = await connectTestRabbitMQ();
        return { ok: !!channel };
    } catch (error) {
        return { ok: false, error: error.message };
    }
}

/**
 * Purge messages from test queue and DLQ
 */
export async function purgeTestQueues() {
    try {
        const { channel } = await connectTestRabbitMQ();
        const queueName = config.rabbitMQ.queue;
        const dlqName = `${queueName}.dlq`;

        await channel.purgeQueue(queueName);
        await channel.purgeQueue(dlqName);
    } catch (error) {
        // Queue may not exist yet
    }
}

/**
 * Close test RabbitMQ connection
 */
export async function closeTestRabbitMQ() {
    try {
        if (testChannel) {
            await testChannel.close();
            testChannel = null;
        }
        if (testConnection) {
            await testConnection.close();
            testConnection = null;
        }
        // Also close shared singleton if connected
        await rabbitmq.close();
    } catch (e) {
        // ignore
    }
}
