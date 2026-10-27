import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { app } from "../../src/server.js";
import { cleanAllDatabases } from "../setup/testDatabase.js";
import { purgeTestQueues } from "../setup/testRabbitMQ.js";
import { onboardSuperAdmin } from "../helpers/auth.js";
import { createTestClient } from "../helpers/client.js";
import { createTestApiKey } from "../helpers/apiKey.js";
import { sendApiHit } from "../helpers/ingest.js";
import { generateClientData, generateApiKeyData, generateApiHitPayload } from "../helpers/testData.js";
import Client from "../../src/shared/models/Client.js";
import ApiKey from "../../src/shared/models/Apikey.js";

describe("Phase 9: API Hit Ingestion (POST /api/hit)", () => {
    let superAdmin;
    let client;
    let apiKey;

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

    describe("Successful Ingestion", () => {
        it("accepts a valid API hit with valid API key and returns 202 Queued", async () => {
            const payload = generateApiHitPayload();

            const res = await sendApiHit(app, apiKey.keyValue, payload);

            expect(res.status).toBe(202);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toMatch(/queued for processing/i);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.eventId).toBeDefined();
            expect(res.body.data.status).toBe("queued");
        });
    });

    describe("Authentication & Authorization Failures", () => {
        it("rejects request missing x-api-key header with 401", async () => {
            const payload = generateApiHitPayload();
            const res = await sendApiHit(app, null, payload);

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/api key is required/i);
        });

        it("rejects request with an invalid/non-existent API key with 403", async () => {
            const payload = generateApiHitPayload();
            const res = await sendApiHit(app, "apim_invalid00000000000000000000000000000000", payload);

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/invalid api key/i);
        });

        it("rejects request when the client account is inactive with 403", async () => {
            // Deactivate client
            await Client.findByIdAndUpdate(client._id, { isActive: false });

            const payload = generateApiHitPayload();
            const res = await sendApiHit(app, apiKey.keyValue, payload);

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/client account is inactive/i);
        });

        it("rejects request when API key lacks ingest permissions with 403", async () => {
            // Remove canIngest permission
            await ApiKey.findByIdAndUpdate(apiKey._id, {
                "permissions.canIngest": false,
            });

            const payload = generateApiHitPayload();
            const res = await sendApiHit(app, apiKey.keyValue, payload);

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/does not have ingest permissions/i);
        });
    });

    describe("Payload Validation Failures", () => {
        it("rejects payload missing required serviceName with 400", async () => {
            const payload = generateApiHitPayload();
            delete payload.serviceName;

            const res = await sendApiHit(app, apiKey.keyValue, payload);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/missing required fields.*serviceName/i);
        });

        it("rejects payload with invalid HTTP method with 400", async () => {
            const payload = {
                ...generateApiHitPayload(),
                method: "NON_STANDARD_METHOD",
            };

            const res = await sendApiHit(app, apiKey.keyValue, payload);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/invalid http method/i);
        });

        it("rejects payload with out-of-range status code with 400", async () => {
            const payload = {
                ...generateApiHitPayload(),
                statusCode: 999,
            };

            const res = await sendApiHit(app, apiKey.keyValue, payload);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/invalid status code/i);
        });

        it("rejects payload with negative latency with 400", async () => {
            const payload = {
                ...generateApiHitPayload(),
                latencyMs: -50,
            };

            const res = await sendApiHit(app, apiKey.keyValue, payload);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/invalid latency/i);
        });
    });
});
