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

describe("Phase 12: Idempotency Verification", () => {
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

    it("skips duplicate messages with the same messageId without duplicating DB records or metrics", async () => {
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

        // 3. Capture Postgres total_hits count
        const initialMetric = await postgres.query(
            "SELECT total_hits FROM endpoint_metrics WHERE client_id = $1 AND endpoint = $2",
            [clientId.toString(), hitPayload.endpoint]
        );
        expect(initialMetric.rows.length).toBe(1);
        const initialHits = Number(initialMetric.rows[0].total_hits);

        // 4. Send the exact duplicate message with the same messageId
        channel.sendToQueue(config.rabbitMQ.queue, messageBuffer, {
            messageId: testEventId,
            persistent: true,
            contentType: "application/json",
        });

        // 5. Allow consumer to handle the duplicate message
        await sleep(1000);

        // 6. Verify MongoDB still has exactly 1 document with this eventId
        const totalMongoDocs = await ApiHits.countDocuments({ eventId: testEventId });
        expect(totalMongoDocs).toBe(1);

        // 7. Verify PostgreSQL metric was NOT re-incremented by the duplicate message
        const postDuplicateMetric = await postgres.query(
            "SELECT total_hits FROM endpoint_metrics WHERE client_id = $1 AND endpoint = $2",
            [clientId.toString(), hitPayload.endpoint]
        );
        expect(Number(postDuplicateMetric.rows[0].total_hits)).toBe(initialHits);
    });
});
