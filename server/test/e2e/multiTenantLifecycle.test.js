import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/server.js";
import { cleanAllDatabases } from "../setup/testDatabase.js";
import { purgeTestQueues } from "../setup/testRabbitMQ.js";
import { onboardSuperAdmin, loginUser } from "../helpers/auth.js";
import { startTestConsumer, stopTestConsumer } from "../helpers/consumerHelper.js";
import { waitForCondition } from "../helpers/polling.js";
import { randomSuffix } from "../helpers/testData.js";
import ApiHits from "../../src/shared/models/ApiHits.js";
import postgres from "../../src/shared/config/postgres.js";

const VALID_STRONG_PASSWORD = "ValidP@ssw0rd2026!";

describe("Multi-Tenant E2E Lifecycle: Independent Self-Service Tenants, Ingestion, and Isolation", () => {
    let superAdmin;

    beforeAll(async () => {
        await purgeTestQueues();
        await cleanAllDatabases();
        await startTestConsumer();
    });

    afterAll(async () => {
        await stopTestConsumer();
    });

    beforeEach(async () => {
        await cleanAllDatabases();
        await purgeTestQueues();

        // Provision Super Admin with cluster bootstrap secret
        const adminData = {
            username: `root_admin_${randomSuffix()}`,
            email: `root_${randomSuffix()}@platform.local`,
            password: VALID_STRONG_PASSWORD,
            bootstrapSecret: process.env.SUPER_ADMIN_BOOTSTRAP_SECRET || "test-bootstrap-secret-key-1234",
        };
        superAdmin = await onboardSuperAdmin(app, adminData);
    });

    afterEach(async () => {
        await cleanAllDatabases();
        await purgeTestQueues();
    });

    it("verifies two independent tenants through full registration, key minting, ingest, consumer processing, and cross-tenant dashboard isolation", async () => {
        // Step 1: Tenant A registers independently via POST /api/auth/register-tenant
        const tenantAPayload = {
            name: `Acme Corp ${randomSuffix()}`,
            email: `contact_${randomSuffix()}@acme.com`,
            website: "https://acme.com",
            description: "Acme Payments & Logistics",
            username: `acme_lead_${randomSuffix()}`,
            password: VALID_STRONG_PASSWORD,
        };
        const resTenantA = await request(app)
            .post("/api/auth/register-tenant")
            .send(tenantAPayload);

        expect(resTenantA.status).toBe(201);
        expect(resTenantA.body.success).toBe(true);
        expect(resTenantA.body.data.client.id).toBeDefined();
        const tenantAClientId = resTenantA.body.data.client.id;
        const tenantACookie = resTenantA.headers["set-cookie"];

        // Step 2: Tenant B registers independently via POST /api/auth/register-tenant
        const tenantBPayload = {
            name: `Beta Global ${randomSuffix()}`,
            email: `contact_${randomSuffix()}@beta.io`,
            website: "https://beta.io",
            description: "Beta Cloud Solutions",
            username: `beta_lead_${randomSuffix()}`,
            password: VALID_STRONG_PASSWORD,
        };
        const resTenantB = await request(app)
            .post("/api/auth/register-tenant")
            .send(tenantBPayload);

        expect(resTenantB.status).toBe(201);
        expect(resTenantB.body.success).toBe(true);
        expect(resTenantB.body.data.client.id).toBeDefined();
        const tenantBClientId = resTenantB.body.data.client.id;
        const tenantBCookie = resTenantB.headers["set-cookie"];

        // Step 3: Tenant A mints an API key
        const keyARes = await request(app)
            .post(`/api/admin/client/${tenantAClientId}/api/keys`)
            .set("Cookie", tenantACookie)
            .send({
                name: "Acme Primary Ingest Key",
                environment: "production",
            });

        expect(keyARes.status).toBe(201);
        expect(keyARes.body.data.keyValue).toBeDefined();
        const apiKeyA = keyARes.body.data.keyValue;

        // Step 4: Tenant B mints an API key
        const keyBRes = await request(app)
            .post(`/api/admin/client/${tenantBClientId}/api/keys`)
            .set("Cookie", tenantBCookie)
            .send({
                name: "Beta Primary Ingest Key",
                environment: "production",
            });

        expect(keyBRes.status).toBe(201);
        expect(keyBRes.body.data.keyValue).toBeDefined();
        const apiKeyB = keyBRes.body.data.keyValue;

        // Step 5: Verify API Key Listing Strips Raw Secret
        const listKeysA = await request(app)
            .get(`/api/admin/client/${tenantAClientId}/api/keys`)
            .set("Cookie", tenantACookie);
        expect(listKeysA.status).toBe(200);
        expect(listKeysA.body.data.length).toBe(1);
        expect(listKeysA.body.data[0].keyValue).toBeUndefined(); // Raw secret stripped on listing!

        // Step 6: Ingest Traffic for Tenant A (2 hits: 1 success, 1 error)
        const hitA1 = await request(app)
            .post("/api/hit")
            .set("x-api-key", apiKeyA)
            .send({
                serviceName: "acme-checkout",
                endpoint: "/v1/charge",
                method: "POST",
                statusCode: 200,
                latencyMs: 45.0,
            });
        expect(hitA1.status).toBe(202);
        const eventIdA1 = hitA1.body.data.eventId;

        const hitA2 = await request(app)
            .post("/api/hit")
            .set("x-api-key", apiKeyA)
            .send({
                serviceName: "acme-checkout",
                endpoint: "/v1/charge",
                method: "POST",
                statusCode: 500,
                latencyMs: 120.0,
            });
        expect(hitA2.status).toBe(202);
        const eventIdA2 = hitA2.body.data.eventId;

        // Step 7: Ingest Traffic for Tenant B (1 hit: success)
        const hitB1 = await request(app)
            .post("/api/hit")
            .set("x-api-key", apiKeyB)
            .send({
                serviceName: "beta-telemetry",
                endpoint: "/v2/dispatch",
                method: "POST",
                statusCode: 200,
                latencyMs: 65.0,
            });
        expect(hitB1.status).toBe(202);
        const eventIdB1 = hitB1.body.data.eventId;

        // Step 8: Wait for Background Processing in MongoDB (Raw Hits)
        const savedDocA1 = await waitForCondition(
            async () => await ApiHits.findOne({ eventId: eventIdA1 }),
            { timeout: 10000, interval: 200, description: "Tenant A hit 1 in MongoDB" }
        );
        expect(savedDocA1.clientId.toString()).toBe(tenantAClientId);

        const savedDocB1 = await waitForCondition(
            async () => await ApiHits.findOne({ eventId: eventIdB1 }),
            { timeout: 10000, interval: 200, description: "Tenant B hit 1 in MongoDB" }
        );
        expect(savedDocB1.clientId.toString()).toBe(tenantBClientId);

        // Step 9: Wait for Aggregated Metrics in PostgreSQL
        const metricRowA = await waitForCondition(
            async () => {
                const res = await postgres.query(
                    "SELECT * FROM endpoint_metrics WHERE client_id = $1 AND endpoint = $2",
                    [tenantAClientId, "/v1/charge"]
                );
                return res.rows.length > 0 && Number(res.rows[0].total_hits) === 2 ? res.rows[0] : null;
            },
            { timeout: 10000, interval: 250, description: "Postgres Metric Aggregation for Tenant A" }
        );
        expect(Number(metricRowA.total_hits)).toBe(2);
        expect(Number(metricRowA.error_hits)).toBe(1);

        const metricRowB = await waitForCondition(
            async () => {
                const res = await postgres.query(
                    "SELECT * FROM endpoint_metrics WHERE client_id = $1 AND endpoint = $2",
                    [tenantBClientId, "/v2/dispatch"]
                );
                return res.rows.length > 0 && Number(res.rows[0].total_hits) === 1 ? res.rows[0] : null;
            },
            { timeout: 10000, interval: 250, description: "Postgres Metric Aggregation for Tenant B" }
        );
        expect(Number(metricRowB.total_hits)).toBe(1);
        expect(Number(metricRowB.error_hits)).toBe(0);

        // Step 10: Verify Tenant A Analytics Isolation
        const statsA = await request(app)
            .get("/api/analytics/stats")
            .set("Cookie", tenantACookie);
        expect(statsA.status).toBe(200);
        expect(statsA.body.data.totalHits).toBe(2);
        expect(statsA.body.data.errorHits).toBe(1);
        expect(statsA.body.data.successHits).toBe(1);
        expect(statsA.body.data.errorRate).toBe(50);

        // Step 11: Verify Tenant B Analytics Isolation
        const statsB = await request(app)
            .get("/api/analytics/stats")
            .set("Cookie", tenantBCookie);
        expect(statsB.status).toBe(200);
        expect(statsB.body.data.totalHits).toBe(1);
        expect(statsB.body.data.errorHits).toBe(0);
        expect(statsB.body.data.successHits).toBe(1);
        expect(statsB.body.data.errorRate).toBe(0);

        // Step 12: Verify Cross-Tenant Access Enforcement
        // Tenant A cannot manage or view Tenant B's keys
        const crossKeyRes = await request(app)
            .get(`/api/admin/client/${tenantBClientId}/api/keys`)
            .set("Cookie", tenantACookie);
        expect(crossKeyRes.status).toBe(403);

        // Tenant B cannot manage or view Tenant A's keys
        const crossKeyBRes = await request(app)
            .get(`/api/admin/client/${tenantAClientId}/api/keys`)
            .set("Cookie", tenantBCookie);
        expect(crossKeyBRes.status).toBe(403);

        // Tenant A cannot query Tenant B stats by providing Tenant B's clientId
        const crossStatsRes = await request(app)
            .get(`/api/analytics/stats?clientId=${tenantBClientId}`)
            .set("Cookie", tenantACookie);
        // Tenant A is scoped to their own client ID, so query returns Tenant A data (totalHits 2, not 1)
        expect(crossStatsRes.status).toBe(200);
        expect(crossStatsRes.body.data.totalHits).toBe(2);

        // Step 13: Super Admin Global Analytics Visibility
        const superAdminGlobal = await request(app)
            .get("/api/analytics/stats")
            .set("Cookie", superAdmin.cookie);
        expect(superAdminGlobal.status).toBe(200);
        expect(superAdminGlobal.body.data.totalHits).toBe(3); // 2 from A + 1 from B
        expect(superAdminGlobal.body.data.errorHits).toBe(1);

        // Super Admin filtered stats for Tenant A
        const superAdminTenantA = await request(app)
            .get(`/api/analytics/stats?clientId=${tenantAClientId}`)
            .set("Cookie", superAdmin.cookie);
        expect(superAdminTenantA.status).toBe(200);
        expect(superAdminTenantA.body.data.totalHits).toBe(2);

        // Super Admin filtered stats for Tenant B
        const superAdminTenantB = await request(app)
            .get(`/api/analytics/stats?clientId=${tenantBClientId}`)
            .set("Cookie", superAdmin.cookie);
        expect(superAdminTenantB.status).toBe(200);
        expect(superAdminTenantB.body.data.totalHits).toBe(1);
    });
});
