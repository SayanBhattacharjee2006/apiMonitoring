import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnalyticsController } from "../../src/services/analyticService/controller/analyticsController.js";
import { AnalyticService } from "../../src/services/analyticService/services/analyticService.js";
import { MetricsRepository } from "../../src/services/processorService/repository/MetricsRepository.js";
import AppError from "../../src/shared/utils/AppError.js";

describe("Phase 13: Analytics Date Filtering, Aggregation & Dashboard Consistency (Unit Tests)", () => {
    let mockMetricRepo;
    let mockAuthSvc;
    let mockClientRepo;
    let mockLogger;
    let analyticService;
    let analyticsController;

    beforeEach(() => {
        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
        };

        mockMetricRepo = {
            getOverallStats: vi.fn(),
            getTopEndPoints: vi.fn(),
            getTimeSeriesMetrics: vi.fn(),
            getMetrices: vi.fn(),
            _query: vi.fn(),
            postgres: { query: vi.fn() },
            logger: mockLogger,
        };

        analyticService = new AnalyticService({
            metricRepo: mockMetricRepo,
        });

        mockAuthSvc = {
            checkSuperAdminPermission: vi.fn(),
            getProfile: vi.fn(),
        };

        mockClientRepo = {
            findById: vi.fn(),
        };

        analyticsController = new AnalyticsController({
            analyticService,
            authService: mockAuthSvc,
            clientRepository: mockClientRepo,
        });
    });

    // TEST 1: Top endpoints respects both date boundaries
    it("Test 1: Top endpoints respects both startTime and endTime boundaries in SQL query", async () => {
        const repo = new MetricsRepository({
            postgres: { query: vi.fn().mockResolvedValue({ rows: [] }) },
            logger: mockLogger,
        });

        const querySpy = vi.spyOn(repo, "_query").mockResolvedValue({
            rows: [
                {
                    service_name: "billing-api",
                    endpoint: "/api/v1/invoices",
                    method: "GET",
                    total_hits: "15",
                    avg_latency: "45.2",
                    error_hits: "1",
                },
            ],
        });

        const start = new Date("2026-10-25T00:00:00Z");
        const end = new Date("2026-10-26T00:00:00Z");

        await repo.getTopEndPoints("client-123", 5, start, end);

        expect(querySpy).toHaveBeenCalledTimes(1);
        const [sql, params] = querySpy.mock.calls[0];

        expect(sql).toContain("time_bucket >= $2");
        expect(sql).toContain("time_bucket <= $3");
        expect(sql).toContain("ORDER BY total_hits DESC");
        expect(params).toEqual(["client-123", start, end, 5]);
    });

    // TEST 2: All dashboard sections use the exact same normalized date range
    it("Test 2: getDashboard passes the exact same normalized date range to stats, topEndpoints, and timeSeries", async () => {
        mockAuthSvc.checkSuperAdminPermission.mockResolvedValue(false);
        mockClientRepo.findById.mockResolvedValue({ _id: "6ae37ebb1193a7420d6eab9c" });
        mockAuthSvc.getProfile.mockResolvedValue({ permissions: { canViewAnalytics: true } });

        const overallSpy = vi.spyOn(analyticService, "getOverallStats").mockResolvedValue({
            totalHits: 10,
            errorHits: 0,
            successHits: 10,
            errorRate: 0,
            avgLatency: 50,
            uniqueServices: 1,
            uniqueEndpoints: 1,
        });
        const topSpy = vi.spyOn(analyticService, "getTopEndpoints").mockResolvedValue([]);
        const timeSeriesSpy = vi.spyOn(analyticService, "getTimeSeries").mockResolvedValue([]);

        const startTime = "2026-10-30T10:00:00.000Z";
        const endTime = "2026-10-31T10:00:00.000Z";

        const req = {
            user: { userId: "user-1", clientId: "6ae37ebb1193a7420d6eab9c" },
            query: { startTime, endTime },
        };
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };
        const next = vi.fn();

        await analyticsController.getDashboard(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(overallSpy).toHaveBeenCalledTimes(1);
        expect(topSpy).toHaveBeenCalledTimes(1);
        expect(timeSeriesSpy).toHaveBeenCalledTimes(1);

        const expectedStart = new Date(startTime);
        const expectedEnd = new Date(endTime);

        expect(overallSpy.mock.calls[0][1]).toEqual({
            startTime: expectedStart,
            endTime: expectedEnd,
            effectiveStartTime: expect.any(Date),
            effectiveEndTime: expect.any(Date),
        });
        expect(topSpy.mock.calls[0][1]).toEqual({
            limit: 5,
            startTime: expectedStart,
            endTime: expectedEnd,
            effectiveStartTime: expect.any(Date),
            effectiveEndTime: expect.any(Date),
        });
        expect(timeSeriesSpy.mock.calls[0][1]).toEqual({
            limit: 1000,
            startTime: expectedStart,
            endTime: expectedEnd,
            effectiveStartTime: expect.any(Date),
            effectiveEndTime: expect.any(Date),
        });
    });

    // TEST 3: Default dashboard time range is previous 24 hours for all sections
    it("Test 3: When no dates are provided, all dashboard sections default to identical previous 24 hours", async () => {
        mockAuthSvc.checkSuperAdminPermission.mockResolvedValue(true);

        const overallSpy = vi.spyOn(analyticService, "getOverallStats").mockResolvedValue({});
        const topSpy = vi.spyOn(analyticService, "getTopEndpoints").mockResolvedValue([]);
        const timeSeriesSpy = vi.spyOn(analyticService, "getTimeSeries").mockResolvedValue([]);

        const req = {
            user: { userId: "super-admin-1" },
            query: {},
        };
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };
        const next = vi.fn();

        const beforeCall = Date.now();
        await analyticsController.getDashboard(req, res, next);
        const afterCall = Date.now();

        const statsRange = overallSpy.mock.calls[0][1];
        const topRange = topSpy.mock.calls[0][1];
        const tsRange = timeSeriesSpy.mock.calls[0][1];

        // Verify all 3 received the exact same start and end Date references
        expect(statsRange.startTime).toBe(topRange.startTime);
        expect(statsRange.endTime).toBe(topRange.endTime);
        expect(statsRange.startTime).toBe(tsRange.startTime);
        expect(statsRange.endTime).toBe(tsRange.endTime);

        // Verify the span is approximately 24 hours (86,400,000 ms)
        const diffMs = statsRange.endTime.getTime() - statsRange.startTime.getTime();
        expect(diffMs).toBe(24 * 60 * 60 * 1000);

        expect(statsRange.endTime.getTime()).toBeGreaterThanOrEqual(beforeCall);
        expect(statsRange.endTime.getTime()).toBeLessThanOrEqual(afterCall);
    });

    // TEST 4: Partial and invalid date parameters
    describe("Test 4: Partial and invalid date parameters", () => {
        it("handles start only: start through current time", () => {
            const startStr = "2026-10-30T00:00:00Z";
            const range = analyticsController.normalizeTimeRange(startStr, null);

            expect(range.startTime.toISOString()).toBe(new Date(startStr).toISOString());
            expect(range.endTime.getTime()).toBeGreaterThan(range.startTime.getTime());
        });

        it("handles end only: end minus 24 hours through end", () => {
            const endStr = "2026-10-31T15:00:00Z";
            const range = analyticsController.normalizeTimeRange(null, endStr);

            expect(range.endTime.toISOString()).toBe(new Date(endStr).toISOString());
            const expectedStart = new Date(new Date(endStr).getTime() - 24 * 60 * 60 * 1000);
            expect(range.startTime.toISOString()).toBe(expectedStart.toISOString());
        });

        it("rejects invalid date strings with 400", () => {
            expect(() => analyticsController.normalizeTimeRange("not-a-date", null)).toThrow(AppError);
            expect(() => analyticsController.normalizeTimeRange(null, "invalid-date")).toThrow(AppError);
        });

        it("rejects startTime later than endTime with 400", () => {
            const start = "2026-10-31T16:00:00Z";
            const end = "2026-10-31T12:00:00Z";
            expect(() => analyticsController.normalizeTimeRange(start, end)).toThrow(
                /Invalid time range/
            );
        });
    });

    // TEST 5: Multiple endpoint records per hourly bucket (grouping by time_bucket only)
    it("Test 5: Time series query groups by time_bucket only and calculates weighted average latency correctly", async () => {
        const repo = new MetricsRepository({
            postgres: { query: vi.fn() },
            logger: mockLogger,
        });

        // Mock 120 raw rows aggregated into 24 distinct hourly points in Postgres SQL
        const mockHourlyBuckets = Array.from({ length: 24 }).map((_, i) => ({
            time_bucket: new Date(Date.UTC(2026, 9, 30, i)).toISOString(),
            total_hits: "100", // 5 endpoints * 20 hits each
            error_hits: "5",
            avg_latency: "42.50", // mathematically weighted
        }));

        const querySpy = vi.spyOn(repo, "_query").mockResolvedValue({
            rows: mockHourlyBuckets,
        });

        const result = await repo.getTimeSeriesMetrics({
            clientId: "tenant-1",
            startTime: new Date("2026-10-30T00:00:00Z"),
            endTime: new Date("2026-10-31T00:00:00Z"),
            limit: 1000,
        });

        expect(querySpy).toHaveBeenCalledTimes(1);
        const [sql] = querySpy.mock.calls[0];

        // Must group by time_bucket ONLY, not by service_name or endpoint
        expect(sql).toContain("GROUP BY time_bucket");
        expect(sql).not.toContain("GROUP BY service_name");
        expect(sql).toContain("SUM(avg_latency * total_hits) / NULLIF(SUM(total_hits), 0) AS avg_latency");
        expect(sql).toContain("ORDER BY time_bucket ASC");

        // Returns exactly 24 hourly chart points
        expect(result.length).toBe(24);
        expect(result[0].total_hits).toBe("100");
        expect(result[0].avg_latency).toBe("42.50");
    });

    // TEST 6: 7-day trend returns up to 168 hourly buckets without 24-row truncation
    it("Test 6: 7-day trend supports up to 168 hourly buckets without being truncated to 24", async () => {
        const repo = new MetricsRepository({
            postgres: { query: vi.fn() },
            logger: mockLogger,
        });

        const mock168Buckets = Array.from({ length: 168 }).map((_, i) => ({
            time_bucket: new Date(Date.UTC(2026, 9, 24, i)).toISOString(),
            total_hits: "50",
            error_hits: "1",
            avg_latency: "35.0",
        }));

        vi.spyOn(repo, "_query").mockResolvedValue({ rows: mock168Buckets });

        const service = new AnalyticService({ metricRepo: repo });
        const timeSeries = await service.getTimeSeries("tenant-1", {
            startTime: new Date("2026-10-24T00:00:00Z"),
            endTime: new Date("2026-10-31T00:00:00Z"),
            limit: 1000,
        });

        expect(timeSeries.length).toBe(168);
        expect(timeSeries[0].totalHits).toBe(50);
        expect(timeSeries[167].totalHits).toBe(50);
    });

    // TEST 7: 30-day trend returns up to 720 hourly buckets
    it("Test 7: 30-day trend supports up to 720 hourly buckets", async () => {
        const repo = new MetricsRepository({
            postgres: { query: vi.fn() },
            logger: mockLogger,
        });

        const mock720Buckets = Array.from({ length: 720 }).map((_, i) => ({
            time_bucket: new Date(Date.UTC(2026, 9, 1, i)).toISOString(),
            total_hits: "200",
            error_hits: "2",
            avg_latency: "40.0",
        }));

        vi.spyOn(repo, "_query").mockResolvedValue({ rows: mock720Buckets });

        const service = new AnalyticService({ metricRepo: repo });
        const timeSeries = await service.getTimeSeries("tenant-1", {
            startTime: new Date("2026-10-01T00:00:00Z"),
            endTime: new Date("2026-10-31T00:00:00Z"),
            limit: 1000,
        });

        expect(timeSeries.length).toBe(720);
        expect(timeSeries[719].totalHits).toBe(200);
    });

    // TEST 8: Tenant isolation with custom ranges
    it("Test 8: Preserves tenant isolation for custom queries and Super Admin scope", async () => {
        // 1. Regular Client Admin (Tenant Alpha)
        mockAuthSvc.checkSuperAdminPermission.mockResolvedValue(false);
        mockClientRepo.findById.mockResolvedValue({ _id: "6ae37ebb1193a7420d6eab9c" });
        mockAuthSvc.getProfile.mockResolvedValue({ permissions: { canViewAnalytics: true } });

        const overallSpy = vi.spyOn(mockMetricRepo, "getOverallStats").mockResolvedValue({});
        vi.spyOn(mockMetricRepo, "getTopEndPoints").mockResolvedValue([]);
        vi.spyOn(mockMetricRepo, "getTimeSeriesMetrics").mockResolvedValue([]);

        const reqTenant = {
            user: { userId: "user-alpha", clientId: "6ae37ebb1193a7420d6eab9c" },
            query: { startTime: "2026-10-30T00:00:00Z", endTime: "2026-10-31T00:00:00Z" },
        };
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
        await analyticsController.getDashboard(reqTenant, res, vi.fn());

        expect(overallSpy).toHaveBeenCalledWith(
            "6ae37ebb1193a7420d6eab9c",
            expect.any(Date),
            expect.any(Date)
        );

        // 2. Super Admin without query clientId -> global (null)
        mockAuthSvc.checkSuperAdminPermission.mockResolvedValue(true);
        const reqGlobal = {
            user: { userId: "super-1" },
            query: { startTime: "2026-10-30T00:00:00Z", endTime: "2026-10-31T00:00:00Z" },
        };
        await analyticsController.getDashboard(reqGlobal, res, vi.fn());
        expect(overallSpy).toHaveBeenLastCalledWith(
            null,
            expect.any(Date),
            expect.any(Date)
        );

        // 3. Super Admin scoping specific tenant
        mockClientRepo.findById.mockResolvedValue({ _id: "6ae37ebb1193a7420d6eab9d" });
        const reqScoped = {
            user: { userId: "super-1" },
            query: {
                clientId: "6ae37ebb1193a7420d6eab9d",
                startTime: "2026-10-30T00:00:00Z",
                endTime: "2026-10-31T00:00:00Z",
            },
        };
        await analyticsController.getDashboard(reqScoped, res, vi.fn());
        expect(overallSpy).toHaveBeenLastCalledWith(
            "6ae37ebb1193a7420d6eab9d",
            expect.any(Date),
            expect.any(Date)
        );
    });

    // TEST 9: Empty results handling
    it("Test 9: Correctly handles empty results with zero/empty values and no 100% false assumptions", async () => {
        vi.spyOn(mockMetricRepo, "getOverallStats").mockResolvedValue({});
        vi.spyOn(mockMetricRepo, "getTopEndPoints").mockResolvedValue([]);
        vi.spyOn(mockMetricRepo, "getTimeSeriesMetrics").mockResolvedValue([]);

        const stats = await analyticService.getOverallStats("tenant-empty");
        const top = await analyticService.getTopEndpoints("tenant-empty");
        const ts = await analyticService.getTimeSeries("tenant-empty");

        expect(stats).toEqual({
            totalHits: 0,
            errorHits: 0,
            successHits: 0,
            errorRate: 0,
            avgLatency: 0,
            uniqueServices: 0,
            uniqueEndpoints: 0,
            timeRange: {
                start: expect.any(Date),
                end: expect.any(Date),
            },
        });
        expect(top).toEqual([]);
        expect(ts).toEqual([]);
    });

    // TEST 10: Query ordering and limit applied after grouping
    it("Test 10: Time-series query orders ASC chronologically and limits after grouping", async () => {
        const repo = new MetricsRepository({
            postgres: { query: vi.fn() },
            logger: mockLogger,
        });

        const querySpy = vi.spyOn(repo, "_query").mockResolvedValue({
            rows: [
                { time_bucket: "2026-10-30 10:00:00", total_hits: "10", error_hits: "0", avg_latency: "30" },
                { time_bucket: "2026-10-30 11:00:00", total_hits: "15", error_hits: "1", avg_latency: "35" },
            ],
        });

        await repo.getTimeSeriesMetrics({
            clientId: "tenant-1",
            startTime: new Date("2026-10-30T10:00:00Z"),
            endTime: new Date("2026-10-30T12:00:00Z"),
            limit: 50,
        });

        const [sql, params] = querySpy.mock.calls[0];
        expect(sql).toMatch(/GROUP BY time_bucket\s+ORDER BY time_bucket ASC\s+LIMIT \$4/);
        expect(params[params.length - 1]).toBe(50);
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // Phase 14: Hourly Boundary Inclusion & PostgreSQL Multi-Service Aggregation
    // ─────────────────────────────────────────────────────────────────────────────
    describe("Hourly Boundary Inclusion & Aggregation Semantics", () => {
        // Scenario 1: Start and end inside the same hour
        it("Scenario 1: Start and end inside the same hour selects that single complete hourly bucket", () => {
            const start = "2026-10-31T10:15:00.000Z";
            const end = "2026-10-31T10:45:00.000Z";
            const range = analyticsController.normalizeTimeRange(start, end);

            expect(range.effectiveStartTime.toISOString()).toBe("2026-10-31T10:00:00.000Z");
            expect(range.effectiveEndTime.toISOString()).toBe("2026-10-31T10:00:00.000Z");
            expect(range.startTime.toISOString()).toBe(new Date(start).toISOString());
            expect(range.endTime.toISOString()).toBe(new Date(end).toISOString());

            // MetricsRepository _alignHourlyBoundaries alignment
            const repo = new MetricsRepository({ postgres: { query: vi.fn() }, logger: mockLogger });
            const aligned = repo._alignHourlyBoundaries(range.startTime, range.endTime);
            expect(aligned.alignedStart.toISOString()).toBe("2026-10-31T10:00:00.000Z");
            expect(aligned.alignedEnd.toISOString()).toBe("2026-10-31T10:00:00.000Z");
        });

        // Scenario 2: Start inside an hour, end at exact hour boundary
        it("Scenario 2: Start inside an hour and end at exact hour boundary includes boundary up to that hour", () => {
            const start = "2026-10-31T10:30:00.000Z";
            const end = "2026-10-31T12:00:00.000Z";
            const range = analyticsController.normalizeTimeRange(start, end);

            // 10:30 floored to 10:00; 12:00 exact boundary ends range, so last bucket is 11:00
            expect(range.effectiveStartTime.toISOString()).toBe("2026-10-31T10:00:00.000Z");
            expect(range.effectiveEndTime.toISOString()).toBe("2026-10-31T11:00:00.000Z");

            // Overlapping buckets selected: 10:00 and 11:00
            const hoursCovered =
                (range.effectiveEndTime.getTime() - range.effectiveStartTime.getTime()) / (60 * 60 * 1000) + 1;
            expect(hoursCovered).toBe(2);
        });

        // Scenario 3: Start at exact hour boundary, end inside an hour
        it("Scenario 3: Start at exact hour boundary and end inside an hour includes the partial ending bucket", () => {
            const start = "2026-10-31T10:00:00.000Z";
            const end = "2026-10-31T12:30:00.000Z";
            const range = analyticsController.normalizeTimeRange(start, end);

            // 10:00 exact start; 12:30 inside hour 12:00 -> includes 10:00, 11:00, and 12:00
            expect(range.effectiveStartTime.toISOString()).toBe("2026-10-31T10:00:00.000Z");
            expect(range.effectiveEndTime.toISOString()).toBe("2026-10-31T12:00:00.000Z");

            const hoursCovered =
                (range.effectiveEndTime.getTime() - range.effectiveStartTime.getTime()) / (60 * 60 * 1000) + 1;
            expect(hoursCovered).toBe(3);
        });

        // Scenario 4: Range spanning several hours (10:30–14:30)
        it("Scenario 4: Range spanning several hours includes both boundary buckets and intermediate hours", () => {
            const start = "2026-10-31T10:30:00.000Z";
            const end = "2026-10-31T14:30:00.000Z";
            const range = analyticsController.normalizeTimeRange(start, end);

            expect(range.effectiveStartTime.toISOString()).toBe("2026-10-31T10:00:00.000Z");
            expect(range.effectiveEndTime.toISOString()).toBe("2026-10-31T14:00:00.000Z");

            // Buckets: 10:00, 11:00, 12:00, 13:00, 14:00 (5 complete hourly buckets)
            const hoursCovered =
                (range.effectiveEndTime.getTime() - range.effectiveStartTime.getTime()) / (60 * 60 * 1000) + 1;
            expect(hoursCovered).toBe(5);
        });

        // Scenario 5: Standardized 24-hour boundary semantics (default and explicit paths)
        it("Scenario 5: Standardized 24-hour boundary semantics selects identical effective boundaries for default and explicit paths", () => {
            // Path A: Default no-parameter backend range
            const defaultRange = analyticsController.normalizeTimeRange(null, null);

            // Path B: Explicit requested range with the same start and end timestamps
            const explicitRange = analyticsController.normalizeTimeRange(
                defaultRange.startTime.toISOString(),
                defaultRange.endTime.toISOString()
            );

            // Both paths must produce identical effective hourly boundaries
            expect(defaultRange.effectiveStartTime.toISOString()).toBe(explicitRange.effectiveStartTime.toISOString());
            expect(defaultRange.effectiveEndTime.toISOString()).toBe(explicitRange.effectiveEndTime.toISOString());

            // Rolling 24-hour test at specific minute (e.g. 17:10)
            const rollingStart = "2026-10-30T17:10:00.000Z";
            const rollingEnd = "2026-10-31T17:10:00.000Z";
            const rollingRange = analyticsController.normalizeTimeRange(rollingStart, rollingEnd);

            expect(rollingRange.effectiveStartTime.toISOString()).toBe("2026-10-30T17:00:00.000Z");
            expect(rollingRange.effectiveEndTime.toISOString()).toBe("2026-10-31T17:00:00.000Z");

            // Complete hourly buckets overlapping requested range: 17:00 yesterday through 17:00 today = 25 buckets
            const rollingBucketCount =
                (rollingRange.effectiveEndTime.getTime() - rollingRange.effectiveStartTime.getTime()) / (60 * 60 * 1000) + 1;
            expect(rollingBucketCount).toBe(25);

            // Preserve existing exact-hour end boundary behavior (e.g., 17:00 exact boundary)
            const exactStart = "2026-10-30T17:00:00.000Z";
            const exactEnd = "2026-10-31T17:00:00.000Z";
            const exactRange = analyticsController.normalizeTimeRange(exactStart, exactEnd);

            expect(exactRange.effectiveStartTime.toISOString()).toBe("2026-10-30T17:00:00.000Z");
            expect(exactRange.effectiveEndTime.toISOString()).toBe("2026-10-31T16:00:00.000Z");
            const exactBucketCount =
                (exactRange.effectiveEndTime.getTime() - exactRange.effectiveStartTime.getTime()) / (60 * 60 * 1000) + 1;
            expect(exactBucketCount).toBe(24);
        });

        // Scenario 6: Consistency across stats, top endpoints, and time series
        it("Scenario 6: Consistent hourly boundary semantics across overall stats, top endpoints, and time series", async () => {
            mockAuthSvc.checkSuperAdminPermission.mockResolvedValue(true);

            const repo = new MetricsRepository({
                postgres: { query: vi.fn() },
                logger: mockLogger,
            });

            const querySpy = vi.spyOn(repo, "_query").mockImplementation(async (sql, params) => {
                if (sql.includes("COUNT(DISTINCT service_name)")) {
                    // Overall stats query
                    return {
                        rows: [{
                            total_hits: "450",
                            error_hits: "18",
                            avg_latency: "52.40",
                            unique_services: "3",
                            unique_endpoints: "4",
                        }],
                    };
                }
                if (sql.includes("ORDER BY total_hits DESC")) {
                    // Top endpoints query
                    return {
                        rows: [{
                            service_name: "auth-svc",
                            endpoint: "/api/login",
                            method: "POST",
                            total_hits: "300",
                            avg_latency: "45.0",
                            error_hits: "10",
                        }],
                    };
                }
                if (sql.includes("GROUP BY time_bucket")) {
                    // Time-series query
                    return {
                        rows: [
                            { time_bucket: "2026-10-31 10:00:00", total_hits: "150", error_hits: "5", avg_latency: "50.0" },
                            { time_bucket: "2026-10-31 11:00:00", total_hits: "150", error_hits: "8", avg_latency: "55.0" },
                            { time_bucket: "2026-10-31 12:00:00", total_hits: "150", error_hits: "5", avg_latency: "52.0" },
                        ],
                    };
                }
                return { rows: [] };
            });

            const service = new AnalyticService({ metricRepo: repo });
            const controller = new AnalyticsController({
                analyticService: service,
                authService: mockAuthSvc,
                clientRepository: mockClientRepo,
            });

            const req = {
                user: { userId: "super-admin" },
                query: {
                    startTime: "2026-10-31T10:30:00.000Z",
                    endTime: "2026-10-31T12:30:00.000Z",
                },
            };
            const res = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            };

            await controller.getDashboard(req, res, vi.fn());

            expect(res.status).toHaveBeenCalledWith(200);
            const responseData = res.json.mock.calls[0][0].data;

            // Verify all 3 queries used the exact same effective boundary bucket timestamps
            const overallCall = querySpy.mock.calls.find(([sql]) => sql.includes("COUNT(DISTINCT service_name)"));
            const topEndpointsCall = querySpy.mock.calls.find(([sql]) => sql.includes("ORDER BY total_hits DESC"));
            const timeSeriesCall = querySpy.mock.calls.find(([sql]) => sql.includes("GROUP BY time_bucket"));

            expect(overallCall).toBeDefined();
            expect(topEndpointsCall).toBeDefined();
            expect(timeSeriesCall).toBeDefined();

            // Check that the SQL parameters for time range start with effectiveStartTime (10:00:00) and effectiveEndTime (12:00:00)
            const expectedStart = new Date("2026-10-31T10:00:00.000Z");
            const expectedEnd = new Date("2026-10-31T12:00:00.000Z");

            expect(overallCall[1]).toContainEqual(expectedStart);
            expect(overallCall[1]).toContainEqual(expectedEnd);

            expect(topEndpointsCall[1]).toContainEqual(expectedStart);
            expect(topEndpointsCall[1]).toContainEqual(expectedEnd);

            expect(timeSeriesCall[1]).toContainEqual(expectedStart);
            expect(timeSeriesCall[1]).toContainEqual(expectedEnd);

            // Dashboard response data integrity
            expect(responseData.stats.totalHits).toBe(450);
            expect(responseData.stats.errorHits).toBe(18);
            expect(responseData.topEndpoints.length).toBe(1);
            expect(responseData.recentTimeSeries.length).toBe(3);
        });

        // Maximum Range Validation Test
        it("validates maximum custom range of 30 days and rejects larger ranges with HTTP 400", () => {
            // Exactly 30 days is accepted
            const start30d = "2026-10-01T00:00:00.000Z";
            const end30d = "2026-10-31T00:00:00.000Z";
            const range30d = analyticsController.normalizeTimeRange(start30d, end30d);
            expect(range30d.effectiveStartTime).toBeDefined();

            // 30 days + 1 second is rejected with 400
            const startOver = "2026-10-01T00:00:00.000Z";
            const endOver = "2026-10-31T00:00:01.000Z";
            expect(() => analyticsController.normalizeTimeRange(startOver, endOver)).toThrow(
                /Custom time range cannot exceed 30 days/
            );
        });
    });
});

