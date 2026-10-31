import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { cleanAllDatabases } from "../setup/testDatabase.js";
import { purgeTestQueues, connectTestRabbitMQ } from "../setup/testRabbitMQ.js";
import { startTestConsumer, stopTestConsumer } from "../helpers/consumerHelper.js";
import { waitForCondition, sleep } from "../helpers/polling.js";
import { generateApiHitPayload, randomSuffix } from "../helpers/testData.js";
import config from "../../src/shared/config/index.js";
import ApiHits from "../../src/shared/models/ApiHits.js";
import mongoose from "mongoose";
import postgres from "../../src/shared/config/postgres.js";

describe("Phase 12: Durable Idempotency & Aggregation Integration Verification", () => {
    let consumerInstance;

    beforeAll(async () => {
        consumerInstance = await startTestConsumer();
    });

    beforeEach(async () => {
        await cleanAllDatabases();
        await purgeTestQueues();
        // Clear consumer's in-memory processed IDs set for clean test run
        if (consumerInstance?.processedIds) {
            consumerInstance.processedIds.clear();
        }
    });

    afterEach(async () => {
        await cleanAllDatabases();
        await purgeTestQueues();
    });

    afterAll(async () => {
        await stopTestConsumer();
    });

    it("Test 1 & 2: Normal processing inserts into processed_events and skips duplicates without incrementing metrics", async () => {
        const { channel } = await connectTestRabbitMQ();
        const testEventId = `idempotent-test-event-${randomSuffix()}`;
        const clientId = new mongoose.Types.ObjectId();
        const apiKeyId = new mongoose.Types.ObjectId();

        const hitPayload = {
            ...generateApiHitPayload(),
            eventId: testEventId,
            clientId,
            apiKeyId,
            ip: "127.0.0.1",
            userAgent: "vitest-agent",
            timestamp: new Date().toISOString(),
        };

        const message = {
            type: "API_HIT",
            data: hitPayload,
            messageId: testEventId,
            publishedAt: new Date().toISOString(),
        };

        const messageBuffer = Buffer.from(JSON.stringify(message));

        // 1. Publish the first message to RabbitMQ
        channel.sendToQueue(config.rabbitMQ.queue, messageBuffer, {
            messageId: testEventId,
            persistent: true,
            contentType: "application/json",
        });

        // 2. Wait for first processing to complete in MongoDB
        const firstPersisted = await waitForCondition(
            async () => {
                return await ApiHits.findOne({ eventId: testEventId });
            },
            {
                timeout: 10000,
                interval: 200,
                description: "First event persistence in MongoDB",
            }
        );
        expect(firstPersisted).toBeDefined();

        // 3. Verify PostgreSQL processed_events ledger has the event
        const ledgerRecord = await postgres.query(
            "SELECT event_id, client_id FROM processed_events WHERE event_id = $1",
            [testEventId]
        );
        expect(ledgerRecord.rows.length).toBe(1);
        expect(ledgerRecord.rows[0].client_id).toBe(clientId.toString());

        // 4. Capture Postgres total_hits count
        const initialMetric = await postgres.query(
            "SELECT total_hits FROM endpoint_metrics WHERE client_id = $1 AND endpoint = $2",
            [clientId.toString(), hitPayload.endpoint]
        );
        expect(initialMetric.rows.length).toBe(1);
        const initialHits = Number(initialMetric.rows[0].total_hits);

        // 5. Send duplicate message with the same messageId
        channel.sendToQueue(config.rabbitMQ.queue, messageBuffer, {
            messageId: testEventId,
            persistent: true,
            contentType: "application/json",
        });

        await sleep(1000);

        // 6. Verify MongoDB still has exactly 1 document with this eventId
        const totalMongoDocs = await ApiHits.countDocuments({ eventId: testEventId });
        expect(totalMongoDocs).toBe(1);

        // 7. Verify PostgreSQL metric was NOT re-incremented
        const postDuplicateMetric = await postgres.query(
            "SELECT total_hits FROM endpoint_metrics WHERE client_id = $1 AND endpoint = $2",
            [clientId.toString(), hitPayload.endpoint]
        );
        expect(Number(postDuplicateMetric.rows[0].total_hits)).toBe(initialHits);
    });

    it("Test 3: Duplicate event after consumer restart does NOT increment metrics (durable Postgres idempotency)", async () => {
        const { channel } = await connectTestRabbitMQ();
        const testEventId = `restart-test-event-${randomSuffix()}`;
        const clientId = new mongoose.Types.ObjectId();
        const apiKeyId = new mongoose.Types.ObjectId();

        const hitPayload = {
            ...generateApiHitPayload(),
            eventId: testEventId,
            clientId,
            apiKeyId,
            ip: "127.0.0.1",
            userAgent: "vitest-agent",
            timestamp: new Date().toISOString(),
        };

        const message = {
            type: "API_HIT",
            data: hitPayload,
            messageId: testEventId,
            publishedAt: new Date().toISOString(),
        };

        const messageBuffer = Buffer.from(JSON.stringify(message));

        // 1. Publish first event
        channel.sendToQueue(config.rabbitMQ.queue, messageBuffer, {
            messageId: testEventId,
            persistent: true,
            contentType: "application/json",
        });

        // 2. Wait for processing
        await waitForCondition(
            async () => {
                const doc = await ApiHits.findOne({ eventId: testEventId });
                return doc !== null;
            },
            { timeout: 10000, interval: 200, description: "Wait for initial event processing" }
        );

        // Verify ledger record
        const ledgerCheck = await postgres.query(
            "SELECT event_id FROM processed_events WHERE event_id = $1",
            [testEventId]
        );
        expect(ledgerCheck.rows.length).toBe(1);

        const metricBefore = await postgres.query(
            "SELECT total_hits FROM endpoint_metrics WHERE client_id = $1 AND endpoint = $2",
            [clientId.toString(), hitPayload.endpoint]
        );
        const hitsBefore = Number(metricBefore.rows[0].total_hits);

        // 3. Simulate consumer restart: clear in-memory cache completely
        consumerInstance.processedIds.clear();
        expect(consumerInstance.processedIds.size).toBe(0);

        // 4. Republish the same event
        channel.sendToQueue(config.rabbitMQ.queue, messageBuffer, {
            messageId: testEventId,
            persistent: true,
            contentType: "application/json",
        });

        await sleep(1000);

        // 5. Verify Postgres metrics did NOT increase
        const metricAfter = await postgres.query(
            "SELECT total_hits FROM endpoint_metrics WHERE client_id = $1 AND endpoint = $2",
            [clientId.toString(), hitPayload.endpoint]
        );
        expect(Number(metricAfter.rows[0].total_hits)).toBe(hitsBefore);
    });

    it("Test 8: Different event IDs with identical dimensions increment metrics independently", async () => {
        const { channel } = await connectTestRabbitMQ();
        const clientId = new mongoose.Types.ObjectId();
        const apiKeyId = new mongoose.Types.ObjectId();
        const basePayload = generateApiHitPayload();

        const eventId1 = `dim-test-event-1-${randomSuffix()}`;
        const eventId2 = `dim-test-event-2-${randomSuffix()}`;

        const payload1 = {
            ...basePayload,
            eventId: eventId1,
            clientId,
            apiKeyId,
            timestamp: new Date().toISOString(),
        };

        const payload2 = {
            ...basePayload,
            eventId: eventId2,
            clientId,
            apiKeyId,
            timestamp: payload1.timestamp, // Same time bucket
        };

        // Publish event 1
        channel.sendToQueue(config.rabbitMQ.queue, Buffer.from(JSON.stringify({
            type: "API_HIT",
            data: payload1,
            messageId: eventId1,
        })), { messageId: eventId1, persistent: true });

        // Publish event 2
        channel.sendToQueue(config.rabbitMQ.queue, Buffer.from(JSON.stringify({
            type: "API_HIT",
            data: payload2,
            messageId: eventId2,
        })), { messageId: eventId2, persistent: true });

        // Wait for both to be saved in MongoDB
        await waitForCondition(
            async () => {
                const count = await ApiHits.countDocuments({
                    eventId: { $in: [eventId1, eventId2] },
                });
                return count === 2;
            },
            { timeout: 10000, interval: 200, description: "Wait for both events in MongoDB" }
        );

        // Verify both events in processed_events ledger
        const ledgerRecords = await postgres.query(
            "SELECT event_id FROM processed_events WHERE event_id IN ($1, $2)",
            [eventId1, eventId2]
        );
        expect(ledgerRecords.rows.length).toBe(2);

        // Verify endpoint_metrics total_hits = 2
        const metricRecord = await postgres.query(
            "SELECT total_hits FROM endpoint_metrics WHERE client_id = $1 AND endpoint = $2",
            [clientId.toString(), basePayload.endpoint]
        );
        expect(Number(metricRecord.rows[0].total_hits)).toBe(2);
    });
});
