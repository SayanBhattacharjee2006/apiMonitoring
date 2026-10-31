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
import { MetricsRepository } from "../../src/services/processorService/repository/MetricsRepository.js";
import { AnalyticService } from "../../src/services/analyticService/services/analyticService.js";

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

    describe("PostgreSQL Multi-Service Aggregation & Tenant Isolation (Database Integration)", () => {
        const tenantAId = "6ae37ebb1193a7420d6eab9a";
        const tenantBId = "6ae37ebb1193a7420d6eab9b";

        beforeEach(async () => {
            // Clean test records for both test tenants
            await postgres.query(
                "DELETE FROM endpoint_metrics WHERE client_id IN ($1, $2)",
                [tenantAId, tenantBId]
            );

            // Seed actual rows directly into PostgreSQL endpoint_metrics table
            const insertSql = `
                INSERT INTO endpoint_metrics 
                (client_id, service_name, endpoint, method, total_hits, error_hits, avg_latency, min_latency, max_latency, time_bucket)
                VALUES 
                -- Tenant A: Hourly bucket 10:00 (Contains 10:30 start timestamp) - 2 services sharing bucket
                ($1, 'auth-service', '/api/v1/login', 'POST', 100, 5, 40.000, 10.000, 120.000, '2026-10-31 10:00:00'),
                ($1, 'order-service', '/api/v1/orders', 'GET', 200, 15, 70.000, 20.000, 250.000, '2026-10-31 10:00:00'),
                -- Tenant A: Hourly bucket 11:00 (Intermediate bucket)
                ($1, 'order-service', '/api/v1/orders', 'POST', 300, 0, 50.000, 15.000, 180.000, '2026-10-31 11:00:00'),
                -- Tenant A: Hourly bucket 12:00 (Contains 12:30 end timestamp)
                ($1, 'auth-service', '/api/v1/logout', 'POST', 150, 10, 60.000, 15.000, 150.000, '2026-10-31 12:00:00'),
                -- Tenant A: Hourly bucket 13:00 (OUTSIDE the requested 10:30–12:30 range)
                ($1, 'auth-service', '/api/v1/logout', 'POST', 500, 50, 200.000, 50.000, 800.000, '2026-10-31 13:00:00'),
                -- Tenant B: Overlapping hourly bucket 10:00 (Must NOT leak to Tenant A)
                ($2, 'billing-service', '/api/v1/invoices', 'GET', 1000, 100, 99.000, 30.000, 400.000, '2026-10-31 10:00:00')
            `;

            await postgres.query(insertSql, [tenantAId, tenantBId]);
        });

        afterEach(async () => {
            await postgres.query(
                "DELETE FROM endpoint_metrics WHERE client_id IN ($1, $2)",
                [tenantAId, tenantBId]
            );
        });

        it("executes real SQL queries in PostgreSQL verifying multi-service aggregation, boundary inclusion, weighted latency, and isolation", async () => {
            const repo = new MetricsRepository({ postgres, logger: { info: () => {}, error: () => {} } });
            const analyticSvc = new AnalyticService({ metricRepo: repo });

            // Query Tenant A for window 10:30–12:30 (effective boundaries 10:00–12:00)
            const startTime = new Date("2026-10-31T10:30:00.000Z");
            const endTime = new Date("2026-10-31T12:30:00.000Z");

            const statsA = await analyticSvc.getOverallStats(tenantAId, { startTime, endTime });

            // 1. Records sharing a bucket are aggregated together (Bucket 10:00 combines auth-service + order-service)
            // 2. total_hits is summed correctly (100 + 200 + 300 + 150 = 750)
            expect(statsA.totalHits).toBe(750);

            // 3. error_hits is summed correctly (5 + 15 + 0 + 10 = 30)
            expect(statsA.errorHits).toBe(30);
            expect(statsA.successHits).toBe(720);
            expect(statsA.errorRate).toBe(4.0); // (30 / 750) * 100 = 4.00%

            // 4. Weighted average latency is mathematically correct:
            // Sum(latency * hits) = (40*100) + (70*200) + (50*300) + (60*150) = 4000 + 14000 + 15000 + 9000 = 42000
            // Weighted average = 42000 / 750 = 56.00 ms (unweighted arithmetic mean would be 55.00 ms)
            expect(statsA.avgLatency).toBe(56.0);

            // 5. Start boundary buckets are included (Bucket 10:00 included despite startTime = 10:30)
            // 6. End boundary buckets follow exact-hour policy (Bucket 12:00 included for 12:30)
            // 7. Records outside selected date range are excluded (Bucket 13:00 with 500 hits excluded)
            expect(statsA.uniqueServices).toBe(2);
            expect(statsA.uniqueEndpoints).toBe(3);

            // 8. Tenant A cannot see Tenant B's records
            // Tenant B has 1000 hits in bucket 10:00 which must NOT be in statsA
            expect(statsA.totalHits).not.toBe(1750);

            // 9. Tenant B cannot see Tenant A's records
            const statsB = await analyticSvc.getOverallStats(tenantBId, { startTime, endTime });
            expect(statsB.totalHits).toBe(1000);
            expect(statsB.errorHits).toBe(100);
            expect(statsB.avgLatency).toBe(99.0);
            expect(statsB.uniqueServices).toBe(1);

            // 10. Chronological time-series ordering is preserved
            const timeSeriesA = await analyticSvc.getTimeSeries(tenantAId, { startTime, endTime });
            expect(timeSeriesA.length).toBe(3); // Buckets 10:00, 11:00, 12:00
            expect(timeSeriesA[0].totalHits).toBe(300); // Bucket 10:00 (100 + 200 hits aggregated)
            expect(timeSeriesA[1].totalHits).toBe(300); // Bucket 11:00 (300 hits)
            expect(timeSeriesA[2].totalHits).toBe(150); // Bucket 12:00 (150 hits)

            const t0 = new Date(timeSeriesA[0].timeBucket).getTime();
            const t1 = new Date(timeSeriesA[1].timeBucket).getTime();
            const t2 = new Date(timeSeriesA[2].timeBucket).getTime();
            expect(t0).toBeLessThan(t1);
            expect(t1).toBeLessThan(t2);

            // Test exact-hour end-boundary policy on real database
            // Range 10:30–12:00 ends at exact hour 12:00, so bucket 12:00 is excluded
            const statsExactHour = await analyticSvc.getOverallStats(tenantAId, {
                startTime: new Date("2026-10-31T10:30:00.000Z"),
                endTime: new Date("2026-10-31T12:00:00.000Z"),
            });
            // Includes only 10:00 (300) and 11:00 (300) = 600 hits
            expect(statsExactHour.totalHits).toBe(600);
            expect(statsExactHour.errorHits).toBe(20);
        });
    });
});
