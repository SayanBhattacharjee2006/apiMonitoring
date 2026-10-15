import AppError from "../../../shared/utils/AppError.js";
import logger from "../../../shared/config/logger.js";
import ResponseFormatter from "../../../shared/utils/responseFormatter.js";


export class AnalyticsController {
    constructor({
        analyticService: analyticSvc,
        authService: authSvc,
        clientRepository: clientRepo,
    } = {}) {
        if (!analyticSvc || !authSvc || !clientRepo)
            throw new Error(
                "AnalyticsController requires analyticService, authService, and clientRepository",
            );
        this.analyticSvc = analyticSvc;
        this.authSvc = authSvc;
        this.clientRepo = clientRepo;
    }

    async getStats(req, res, next) {
        try {
            const { startTime, endTime } = req.body;

            const isAdmin = await this.ensureCanViewAnalytics(req);
            const finalClientId = await this.resolveFinalClient(req, isAdmin);
            const timeRange = this.validateTimeRange(startTime, endTime);

            const stats = await this.analyticSvc.getOverallStats(
                finalClientId,
                timeRange,
            );

            res.status(200).json(
                ResponseFormatter.success(
                    stats,
                    "Statistics retrieved successfully",
                    200,
                ),
            );
        } catch (error) {
            next(error);
        }
    }

    async ensureCanViewAnalytics(req) {
        if (!req.user || !req.user.userId) {
            throw new AppError("Authentication Required", 401);
        }

        const isSuperAdmin = await this.authSvc.checkSuperAdminPermission(
            req.user.userId,
        );

        if (isSuperAdmin) {
            return true;
        }

        if (!req.user.clientId) {
            throw new AppError("Access denied - No client association", 403);
        }

        const profile = await this.authSvc.getProfile(req.user.userId);

        if (!profile?.permissions?.canViewAnalytics) {
            throw new AppError(
                "Insufficient permissions to view analytics",
                403,
            );
        }

        return false;
    }

    async resolveFinalClient(req, isSuperAdmin) {
        const queryClientId = req.query.clientId;
        const userClientId = req?.user?.clientId;

        if (isSuperAdmin) {
            if (queryClientId) {
                if (!this.isValidObjectId(queryClientId)) {
                    throw new AppError("Invalid Client ID format", 400);
                }

                const client = await this.clientRepo.findById(queryClientId);

                if (!client) {
                    throw new AppError("Client not found", 404);
                }

                return queryClientId;
            }
            return null;
        }

        if (!userClientId)
            throw new AppError("Access denied - No client association", 403);
        if (!this.isValidObjectId(userClientId))
            throw new AppError("Invalid Client ID format", 400);
        const client = await this.clientRepo.findById(userClientId);
        if (!client) throw new AppError("Client not found", 404);
        return userClientId;
    }

    validateTimeRange(startTime, endTime) {
        const parseValue = (v) => {
            if (v === undefined || v === null || v === "") return null;
            if (/^\d+$/.test(String(v))) return Number(v);
            const parsed = Date.parse(String(v));
            return Number.isNaN(parsed) ? NaN : parsed;
        };

        const start = parseValue(startTime);
        const end = parseValue(endTime);

        if (
            (startTime && Number.isNaN(start)) ||
            (endTime && Number.isNaN(end))
        ) {
            throw new AppError("Invalid time format", 400);
        }

        if (start !== null && end !== null && start > end) {
            throw new AppError("Invalid time range", 400);
        }

        return {
            startTime: start,
            endTime: end,
        };
    }

    isValidObjectId(id) {
        return typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
    }

    async getDashboard(req, res, next) {
        try {
            const { startTime, endTime } = req.body;

            const isAdmin = await this.ensureCanViewAnalytics(req);
            const finalClientId = await this.resolveFinalClient(req, isAdmin);
            const timeRange = this.validateTimeRange(startTime, endTime);

            const result = await Promise.allSettled([
                this.analyticSvc.getOverallStats(finalClientId, timeRange),
                this.analyticSvc.getTopEndpoints(finalClientId, {
                    limit: 5,
                    startTime: timeRange.startTime,
                }),
                this.analyticSvc.getTimeSeries(finalClientId, {
                    ...timeRange,
                    limit: 24,
                }),
            ]);

            const [stats, topEndpoints, recentTimeSeries] = result.map(
                (item) => (item.status === "fulfilled" ? item.value : null),
            );

            result.forEach((item, index) => {
                if (item.status === "rejected") {
                    logger.error("Dashboard analytics operation failed", {
                        operation: [
                            "overallStats",
                            "topEndpoints",
                            "timeSeries",
                        ][index],
                        error: item.reason?.message,
                    });
                }
            });

            const dashboard = {
                stats,
                topEndpoints,
                recentTimeSeries,
            };

            res.status(200).json(
                ResponseFormatter.success(
                    dashboard,
                    "Dashboard retrieved successfully",
                    200,
                ),
            );
        } catch (error) {
            next(error);
        }
    }
}