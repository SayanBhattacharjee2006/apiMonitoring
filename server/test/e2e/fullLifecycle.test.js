import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/server.js";
import { cleanAllDatabases } from "../setup/testDatabase.js";
import { purgeTestQueues } from "../setup/testRabbitMQ.js";
import { onboardSuperAdmin, loginUser } from "../helpers/auth.js";
import { createTestClient, createTestClientUser } from "../helpers/client.js";
import { createTestApiKey } from "../helpers/apiKey.js";
import { sendApiHit } from "../helpers/ingest.js";
import { startTestConsumer, stopTestConsumer } from "../helpers/consumerHelper.js";
import { waitForCondition } from "../helpers/polling.js";
import {
    generateSuperAdminData,
    generateClientData,
    generateClientUserData,
    generateApiKeyData,
    randomSuffix,
} from "../helpers/testData.js";
import ApiHits from "../../src/shared/models/ApiHits.js";
import postgres from "../../src/shared/config/postgres.js";

describe("Phase 17: Full End-to-End System Lifecycle", () => {
    beforeAll(async () => {
        await purgeTestQueues();
        await cleanAllDatabases();
        await startTestConsumer();
    });

    beforeEach(async () => {
        await cleanAllDatabases();
        await purgeTestQueues();
    });

    afterEach(async () => {
        await cleanAllDatabases();
        await purgeTestQueues();
    });

    afterAll(async () => {
        await stopTestConsumer();
    });

    it("executes the entire business lifecycle automatically from onboarding to analytics and isolation", async () => {
        // Step 1: Onboard Super Admin
        const adminCredentials = generateSuperAdminData();
        const superAdmin = await onboardSuperAdmin(app, adminCredentials);
        expect(superAdmin.user.role).toBe("super-admin");
        expect(superAdmin.cookie).toBeDefined();

        // Step 2: Login as Super Admin & verify profile
        const loginRes = await loginUser(
            app,
            adminCredentials.username,
            adminCredentials.password
        );
        expect(loginRes.user.username).toBe(adminCredentials.username);

        const profileRes = await request(app)
            .get("/api/auth/profile")
            .set("Cookie", loginRes.cookie);
        expect(profileRes.status).toBe(200);
        expect(profileRes.body.data.role).toBe("super-admin");

        // Step 3: Onboard Client A and Client B
        const clientAData = generateClientData(randomSuffix());
        const clientA = await createTestClient(app, superAdmin, clientAData);
        expect(clientA.slug).toBeDefined();

        const clientBData = generateClientData(randomSuffix());
        const clientB = await createTestClient(app, superAdmin, clientBData);
        expect(clientB.slug).toBeDefined();

        // Step 4: Create Client Admin for Client A
        const userAData = generateClientUserData("client-admin");
        await createTestClientUser(app, superAdmin, clientA._id, userAData);

        // Step 5: Log in as Client A Admin
        const clientAAdmin = await loginUser(app, userAData.username, userAData.password);
        expect(clientAAdmin.user.role).toBe("client-admin");

        // Step 6: Create API Key for Client A
        const keyData = generateApiKeyData();
        const apiKeyA = await createTestApiKey(app, clientAAdmin, clientA._id, keyData);
        expect(apiKeyA.keyValue).toMatch(/^apim_/);

        // Step 7: Ingest API Hits for Client A
        const hitPayload1 = {
            serviceName: "e2e-order-service",
            endpoint: "/api/orders/checkout",
            method: "POST",
            statusCode: 200,
            latencyMs: 88.5,
        };
        const ingestRes1 = await sendApiHit(app, apiKeyA.keyValue, hitPayload1);
        expect(ingestRes1.status).toBe(202);
        const eventId1 = ingestRes1.body.data.eventId;

        const hitPayload2 = {
            serviceName: "e2e-order-service",
            endpoint: "/api/orders/checkout",
            method: "POST",
            statusCode: 503,
            latencyMs: 140.0,
        };
        const ingestRes2 = await sendApiHit(app, apiKeyA.keyValue, hitPayload2);
        expect(ingestRes2.status).toBe(202);
        const eventId2 = ingestRes2.body.data.eventId;

        // Step 8: Verify Event Processing in MongoDB (Raw Events)
        const mongoDoc1 = await waitForCondition(
            async () => await ApiHits.findOne({ eventId: eventId1 }),
            {
                timeout: 10000,
                interval: 200,
                description: "MongoDB Raw Event 1 persistence",
            }
        );
        expect(mongoDoc1.endpoint).toBe("/api/orders/checkout");
        expect(mongoDoc1.statusCode).toBe(200);

        const mongoDoc2 = await waitForCondition(
            async () => await ApiHits.findOne({ eventId: eventId2 }),
            {
                timeout: 10000,
                interval: 200,
                description: "MongoDB Raw Event 2 persistence",
            }
        );
        expect(mongoDoc2.statusCode).toBe(503);

        // Step 9: Verify Metric Aggregation in PostgreSQL
        const metricRow = await waitForCondition(
            async () => {
                const res = await postgres.query(
                    "SELECT * FROM endpoint_metrics WHERE client_id = $1 AND endpoint = $2",
                    [clientA._id.toString(), "/api/orders/checkout"]
                );
                return res.rows.length > 0 && Number(res.rows[0].total_hits) === 2 ? res.rows[0] : null;
            },
            {
                timeout: 10000,
                interval: 250,
                description: "Postgres Metric Aggregation for Client A",
            }
        );
        expect(Number(metricRow.total_hits)).toBe(2);
        expect(Number(metricRow.error_hits)).toBe(1);

        // Step 10: Query Analytics API as Client A Admin
        const analyticsRes = await request(app)
            .get("/api/analytics/stats")
            .set("Cookie", clientAAdmin.cookie);
        expect(analyticsRes.status).toBe(200);
        expect(analyticsRes.body.data.totalHits).toBe(2);
        expect(analyticsRes.body.data.errorHits).toBe(1);
        expect(analyticsRes.body.data.successHits).toBe(1);
        expect(analyticsRes.body.data.errorRate).toBe(50);

        // Step 11: Verify Tenant Isolation (Client B has 0 hits)
        const userBData = generateClientUserData("client-admin");
        await createTestClientUser(app, superAdmin, clientB._id, userBData);
        const clientBAdmin = await loginUser(app, userBData.username, userBData.password);

        const analyticsBRes = await request(app)
            .get("/api/analytics/stats")
            .set("Cookie", clientBAdmin.cookie);
        expect(analyticsBRes.status).toBe(200);
        expect(analyticsBRes.body.data.totalHits).toBe(0);

        // Step 12: Super Admin Global Analytics
        const globalRes = await request(app)
            .get("/api/analytics/stats")
            .set("Cookie", superAdmin.cookie);
        expect(globalRes.status).toBe(200);
        expect(globalRes.body.data.totalHits).toBe(2);
    });
});
