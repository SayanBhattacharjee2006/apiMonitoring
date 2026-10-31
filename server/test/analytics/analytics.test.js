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
import { generateClientData, generateClientUserData, generateApiKeyData } from "../helpers/testData.js";
import postgres from "../../src/shared/config/postgres.js";

describe("Phase 13: Analytics & Cross-Tenant Data Isolation (GET /api/analytics/*)", () => {
    let superAdmin;
    let clientA;
    let clientB;
    let clientAAdmin;
    let clientBAdmin;
    let apiKeyA;
    let apiKeyB;

    beforeAll(async () => {
        await startTestConsumer();
    });

    beforeEach(async () => {
        await cleanAllDatabases();
        await purgeTestQueues();

        // 1. Setup Super Admin
        superAdmin = await onboardSuperAdmin(app);

        // 2. Setup Client A
        clientA = await createTestClient(app, superAdmin, {
            name: "Tenant Alpha",
            email: "alpha@tenant.example.com",
        });
        const userAData = generateClientUserData("client-admin");
        await createTestClientUser(app, superAdmin, clientA._id, userAData);
        clientAAdmin = await loginUser(app, userAData.username, userAData.password);
        apiKeyA = await createTestApiKey(app, clientAAdmin, clientA._id, generateApiKeyData());

        // 3. Setup Client B
        clientB = await createTestClient(app, superAdmin, {
            name: "Tenant Beta",
            email: "beta@tenant.example.com",
        });
        const userBData = generateClientUserData("client-admin");
        await createTestClientUser(app, superAdmin, clientB._id, userBData);
        clientBAdmin = await loginUser(app, userBData.username, userBData.password);
        apiKeyB = await createTestApiKey(app, clientBAdmin, clientB._id, generateApiKeyData());

        // 4. Ingest 2 hits for Client A (1 success, 1 error)
        await sendApiHit(app, apiKeyA.keyValue, {
            serviceName: "alpha-auth-service",
            endpoint: "/api/v1/auth/login",
            method: "POST",
            statusCode: 200,
            latencyMs: 50.0,
        });
        await sendApiHit(app, apiKeyA.keyValue, {
            serviceName: "alpha-order-service",
            endpoint: "/api/v1/orders",
            method: "GET",
            statusCode: 500,
            latencyMs: 150.0,
        });

        // 5. Ingest 1 hit for Client B (1 success)
        await sendApiHit(app, apiKeyB.keyValue, {
            serviceName: "beta-payment-service",
            endpoint: "/api/v1/checkout",
            method: "POST",
            statusCode: 200,
            latencyMs: 80.0,
        });

        // 6. Wait until PostgreSQL has processed all 3 hits
        await waitForCondition(
            async () => {
                const resA = await postgres.query(
                    "SELECT SUM(total_hits) as sum FROM endpoint_metrics WHERE client_id = $1",
                    [clientA._id.toString()]
                );
                const resB = await postgres.query(
                    "SELECT SUM(total_hits) as sum FROM endpoint_metrics WHERE client_id = $1",
                    [clientB._id.toString()]
                );
                const hitsA = Number(resA.rows[0]?.sum || 0);
                const hitsB = Number(resB.rows[0]?.sum || 0);
                return hitsA === 2 && hitsB === 1;
            },
            {
                timeout: 12000,
                interval: 250,
                description: "Postgres aggregation for both tenants",
            }
        );
    });

    afterEach(async () => {
        await cleanAllDatabases();
        await purgeTestQueues();
    });

    describe("Stats Endpoint (GET /api/analytics/stats)", () => {
        it("allows Super Admin to view global analytics when no clientId is provided", async () => {
            const res = await request(app)
                .get("/api/analytics/stats")
                .set("Cookie", superAdmin.cookie);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            const { data } = res.body;

            // Global totals across Client A (2) + Client B (1) = 3 total hits
            expect(data.totalHits).toBe(3);
            expect(data.errorHits).toBe(1);
            expect(data.successHits).toBe(2);
            expect(data.errorRate).toBeCloseTo(33.33, 1);
            expect(data.uniqueServices).toBe(3);
        });

        it("allows Super Admin to filter stats by specific clientId query param", async () => {
            const res = await request(app)
                .get(`/api/analytics/stats?clientId=${clientA._id}`)
                .set("Cookie", superAdmin.cookie);

            expect(res.status).toBe(200);
            const { data } = res.body;

            // Client A stats only
            expect(data.totalHits).toBe(2);
            expect(data.errorHits).toBe(1);
            expect(data.successHits).toBe(1);
        });

        it("enforces tenant isolation: Client A sees only Client A stats", async () => {
            const res = await request(app)
                .get("/api/analytics/stats")
                .set("Cookie", clientAAdmin.cookie);

            expect(res.status).toBe(200);
            const { data } = res.body;

            expect(data.totalHits).toBe(2);
            expect(data.errorHits).toBe(1);
            expect(data.successHits).toBe(1);
            expect(data.uniqueServices).toBe(2);
        });

        it("enforces tenant isolation: Client B sees only Client B stats", async () => {
            const res = await request(app)
                .get("/api/analytics/stats")
                .set("Cookie", clientBAdmin.cookie);

            expect(res.status).toBe(200);
            const { data } = res.body;

            expect(data.totalHits).toBe(1);
            expect(data.errorHits).toBe(0);
            expect(data.successHits).toBe(1);
            expect(data.uniqueServices).toBe(1);
        });
    });

    describe("Dashboard Endpoint (GET /api/analytics/dashboard)", () => {
        it("returns combined dashboard data including stats, topEndpoints, and timeSeries", async () => {
            const res = await request(app)
                .get("/api/analytics/dashboard")
                .set("Cookie", clientAAdmin.cookie);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            const { dashboard } = { dashboard: res.body.data };

            expect(dashboard.stats).toBeDefined();
            expect(dashboard.stats.totalHits).toBe(2);

            expect(dashboard.topEndpoints).toBeDefined();
            expect(Array.isArray(dashboard.topEndpoints)).toBe(true);
            expect(dashboard.topEndpoints.length).toBeGreaterThan(0);

            expect(dashboard.recentTimeSeries).toBeDefined();
            expect(Array.isArray(dashboard.recentTimeSeries)).toBe(true);
        });

        it("rejects unauthenticated requests to dashboard with 401", async () => {
            const res = await request(app).get("/api/analytics/dashboard");

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });
        it("rejects invalid date range (startTime > endTime) with 400", async () => {
            const res = await request(app)
                .get("/api/analytics/dashboard?startTime=2026-10-31T15:00:00Z&endTime=2026-10-31T10:00:00Z")
                .set("Cookie", clientAAdmin.cookie);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/Invalid time range/);
        });

        it("filters dashboard sections consistently within an active time window", async () => {
            const now = new Date();
            const start = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
            const end = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

            const res = await request(app)
                .get(`/api/analytics/dashboard?startTime=${start}&endTime=${end}`)
                .set("Cookie", clientAAdmin.cookie);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            const { stats, topEndpoints, recentTimeSeries } = res.body.data;

            expect(stats.totalHits).toBe(2);
            expect(topEndpoints.length).toBeGreaterThan(0);
            expect(recentTimeSeries.length).toBeGreaterThan(0);
        });

        it("returns empty structure when time window has no data", async () => {
            const pastStart = new Date("2020-01-01T00:00:00Z").toISOString();
            const pastEnd = new Date("2020-01-02T00:00:00Z").toISOString();

            const res = await request(app)
                .get(`/api/analytics/dashboard?startTime=${pastStart}&endTime=${pastEnd}`)
                .set("Cookie", clientAAdmin.cookie);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            const { stats, topEndpoints, recentTimeSeries } = res.body.data;

            expect(stats.totalHits).toBe(0);
            expect(stats.errorHits).toBe(0);
            expect(stats.successHits).toBe(0);
            expect(topEndpoints).toEqual([]);
            expect(recentTimeSeries).toEqual([]);
        });

        it("includes partial boundary hour bucket when startTime falls inside the hour", async () => {
            // When startTime falls inside the hour, boundary bucket is included
            const now = new Date();
            // Start inside the current hour (e.g. at minute 30)
            const partialStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), 30, 0, 0));
            const end = new Date(now.getTime() + 60 * 60 * 1000);

            const res = await request(app)
                .get(`/api/analytics/dashboard?startTime=${partialStart.toISOString()}&endTime=${end.toISOString()}`)
                .set("Cookie", clientAAdmin.cookie);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            const { stats } = res.body.data;

            // Hits ingested for Client A in this hour are included despite partial start timestamp
            expect(stats.totalHits).toBe(2);
            expect(stats.errorHits).toBe(1);
            expect(stats.successHits).toBe(1);
        });
    });
});
