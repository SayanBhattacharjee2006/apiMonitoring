import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { app } from "../../src/server.js";
import { cleanAllDatabases } from "../setup/testDatabase.js";
import { purgeTestQueues } from "../setup/testRabbitMQ.js";
import { onboardSuperAdmin } from "../helpers/auth.js";
import { createTestClient } from "../helpers/client.js";
import { createTestApiKey } from "../helpers/apiKey.js";
import { sendApiHit } from "../helpers/ingest.js";
import { startTestConsumer, stopTestConsumer } from "../helpers/consumerHelper.js";
import { waitForCondition } from "../helpers/polling.js";
import { generateClientData, generateApiKeyData, generateApiHitPayload } from "../helpers/testData.js";
import ApiHits from "../../src/shared/models/ApiHits.js";
import postgres from "../../src/shared/config/postgres.js";

describe("Phase 10 & 11: Asynchronous Event Processing (RabbitMQ → Consumer → MongoDB & PostgreSQL)", () => {
    let superAdmin;
    let client;
    let apiKey;

    beforeAll(async () => {
        await startTestConsumer();
    });

    beforeEach(async () => {
        await cleanAllDatabases();
        await purgeTestQueues();
        superAdmin = await onboardSuperAdmin(app);
        client = await createTestClient(app, superAdmin, generateClientData());
        apiKey = await createTestApiKey(app, superAdmin, client._id, generateApiKeyData());
    });

    afterEach(async () => {
        await cleanAllDatabases();
        await purgeTestQueues();
    });

    it("persists accepted API hit to MongoDB raw event storage asynchronously", async () => {
        const payload = generateApiHitPayload();

        // 1. Send API hit
        const res = await sendApiHit(app, apiKey.keyValue, payload);
        expect(res.status).toBe(202);
        const { eventId } = res.body.data;
        expect(eventId).toBeDefined();

        // 2. Poll MongoDB until the event is saved by the consumer
        const savedEvent = await waitForCondition(
            async () => {
                return await ApiHits.findOne({ eventId });
            },
            {
                timeout: 10000,
                interval: 250,
                description: `MongoDB raw event persistence for eventId: ${eventId}`,
            }
        );

        // 3. Verify persisted document in MongoDB
        expect(savedEvent).toBeDefined();
        expect(savedEvent.eventId).toBe(eventId);
        expect(savedEvent.serviceName).toBe(payload.serviceName);
        expect(savedEvent.endpoint).toBe(payload.endpoint);
        expect(savedEvent.method).toBe(payload.method);
        expect(savedEvent.statusCode).toBe(payload.statusCode);
        expect(savedEvent.latencyMs).toBe(payload.latencyMs);
        expect(savedEvent.clientId.toString()).toBe(client._id.toString());
        expect(savedEvent.apiKeyId.toString()).toBe(apiKey._id.toString());
    });

    it("aggregates endpoint metrics into PostgreSQL asynchronously", async () => {
        const payload = {
            ...generateApiHitPayload(),
            latencyMs: 120.0,
            statusCode: 200,
        };

        // 1. Send API hit
        const res = await sendApiHit(app, apiKey.keyValue, payload);
        expect(res.status).toBe(202);

        // 2. Poll PostgreSQL until the metric aggregation row is upserted
        const metricRow = await waitForCondition(
            async () => {
                const queryRes = await postgres.query(
                    `SELECT * FROM endpoint_metrics WHERE client_id = $1 AND endpoint = $2 AND method = $3`,
                    [client._id.toString(), payload.endpoint, payload.method]
                );
                return queryRes.rows.length > 0 ? queryRes.rows[0] : null;
            },
            {
                timeout: 10000,
                interval: 250,
                description: `PostgreSQL metric aggregation for endpoint: ${payload.endpoint}`,
            }
        );

        // 3. Verify PostgreSQL metric values
        expect(metricRow).toBeDefined();
        expect(metricRow.client_id).toBe(client._id.toString());
        expect(metricRow.service_name).toBe(payload.serviceName);
        expect(metricRow.endpoint).toBe(payload.endpoint);
        expect(metricRow.method).toBe(payload.method);
        expect(Number(metricRow.total_hits)).toBe(1);
        expect(Number(metricRow.error_hits)).toBe(0);
        expect(Number.parseFloat(metricRow.avg_latency)).toBeCloseTo(120.0, 1);
        expect(Number.parseFloat(metricRow.min_latency)).toBeCloseTo(120.0, 1);
        expect(Number.parseFloat(metricRow.max_latency)).toBeCloseTo(120.0, 1);
    });

    it("correctly tracks error hits when status code >= 400", async () => {
        const errorPayload = {
            ...generateApiHitPayload(),
            statusCode: 500,
            latencyMs: 250.0,
        };

        await sendApiHit(app, apiKey.keyValue, errorPayload);

        const metricRow = await waitForCondition(
            async () => {
                const queryRes = await postgres.query(
                    `SELECT * FROM endpoint_metrics WHERE client_id = $1 AND endpoint = $2 AND error_hits > 0`,
                    [client._id.toString(), errorPayload.endpoint]
                );
                return queryRes.rows.length > 0 ? queryRes.rows[0] : null;
            },
            {
                timeout: 10000,
                interval: 250,
                description: "PostgreSQL error_hits counter increment",
            }
        );

        expect(metricRow).toBeDefined();
        expect(Number(metricRow.total_hits)).toBe(1);
        expect(Number(metricRow.error_hits)).toBe(1);
    });
});
