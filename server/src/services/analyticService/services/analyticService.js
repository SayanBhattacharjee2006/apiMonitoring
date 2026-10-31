import logger from "../../../shared/config/logger.js";
import AppError from "../../../shared/utils/AppError.js";

export class AnalyticService {
    constructor({ metricRepo }) {
        if (!metricRepo) throw new Error("Metric repository is required");
        this.metricRepo = metricRepo;
    }

    parseTimeFilters(filters = {}) {
        let { startTime, endTime } = filters;

        if (startTime instanceof Date && endTime instanceof Date) {
            return { startTime, endTime };
        }

        const now = new Date();

        if (!startTime && !endTime) {
            return {
                startTime: new Date(now.getTime() - 24 * 60 * 60 * 1000),
                endTime: now,
            };
        }

        if (startTime && !endTime) {
            const start = new Date(startTime);
            return {
                startTime: start,
                endTime: now,
            };
        }

        if (!startTime && endTime) {
            const end = new Date(endTime);
            return {
                startTime: new Date(end.getTime() - 24 * 60 * 60 * 1000),
                endTime: end,
            };
        }

        return {
            startTime: new Date(startTime),
            endTime: new Date(endTime),
        };
    }

    async getOverallStats(clientId, filters = {}) {
        try {
            const { startTime, endTime } = this.parseTimeFilters(filters);
            const stats = await this.metricRepo.getOverallStats(
                clientId,
                startTime,
                endTime,
            );

            const totalHits = Number.parseInt(stats.total_hits, 10) || 0;
            const errorHits = Number.parseInt(stats.error_hits, 10) || 0;
            const errorRate = totalHits > 0 ? (errorHits / totalHits) * 100 : 0;
            const avgLatency = Number.parseFloat(stats.avg_latency) || 0;

            return {
                totalHits,
                errorHits,
                successHits: Math.max(0, totalHits - errorHits),
                errorRate: Number.parseFloat(errorRate.toFixed(2)),
                avgLatency: Number.parseFloat(avgLatency.toFixed(2)),
                uniqueServices: Number.parseInt(stats.unique_services, 10) || 0,
                uniqueEndpoints: Number.parseInt(stats.unique_endpoints, 10) || 0,
                timeRange: {
                    start: startTime,
                    end: endTime,
                },
            };
        } catch (error) {
            logger.error("Error getting overall stats", error);
            throw error;
        }
    }

    async getTopEndpoints(clientId, options = {}) {
        try {
            const { limit = 10, startTime, endTime } = options;
            const { startTime: parsedStart, endTime: parsedEnd } =
                this.parseTimeFilters({ startTime, endTime });

            const endpoints = await this.metricRepo.getTopEndPoints(
                clientId,
                limit,
                parsedStart,
                parsedEnd,
            );

            return endpoints.map((endpoint) => {
                const totalHits = Number.parseInt(endpoint.total_hits, 10) || 0;
                const errorHits = Number.parseInt(endpoint.error_hits, 10) || 0;
                const errorRate =
                    totalHits > 0 ? (errorHits / totalHits) * 100 : 0;
                const avgLatency = Number.parseFloat(endpoint.avg_latency) || 0;

                return {
                    serviceName: endpoint.service_name,
                    endpoint: endpoint.endpoint,
                    method: endpoint.method,
                    totalHits,
                    avgLatency: avgLatency.toFixed(2),
                    errorHits,
                    errorRate: errorRate.toFixed(2),
                };
            });
        } catch (error) {
            logger.error("Error getting top endpoints", error);
            throw error;
        }
    }

    async getTimeSeries(clientId, filters = {}) {
        try {
            const {
                serviceName,
                startTime,
                endTime,
                endpoint,
                limit = 1000,
            } = filters;

            const { endTime: end_time, startTime: start_time } =
                this.parseTimeFilters({ startTime, endTime });

            const metrices = await this.metricRepo.getTimeSeriesMetrics({
                clientId,
                serviceName,
                endpoint,
                startTime: start_time,
                endTime: end_time,
                limit,
            });

            return metrices.map((metric) => ({
                serviceName: metric.service_name || null,
                endpoint: metric.endpoint || null,
                method: metric.method || null,
                totalHits: Number.parseInt(metric.total_hits, 10) || 0,
                errorHits: Number.parseInt(metric.error_hits, 10) || 0,
                avgLatency: Number.parseFloat(
                    Number(metric.avg_latency || 0).toFixed(2),
                ),
                timeBucket: metric.time_bucket,
            }));
        } catch (error) {
            logger.error("Error getting time series", error);
            throw error;
        }
    }
}
export default AnalyticService;
