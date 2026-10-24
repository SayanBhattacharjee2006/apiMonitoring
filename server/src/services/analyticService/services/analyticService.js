import logger from "../../../shared/config/logger.js";
import AppError from "../../../shared/utils/AppError.js";

export class AnalyticService {
    constructor({ metricRepo }) {
        if (!metricRepo) throw new Error("Metric repository is required");
        this.metricRepo = metricRepo;
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

            return {
                totalHits,
                errorHits,
                successHits: totalHits - errorHits,
                errorRate: Number.parseFloat(errorRate.toFixed(2)),
                avgLatency: Number.parseFloat(stats.avg_latency) || 0,
                uniqueServices: Number.parseInt(stats.unique_services) || 0,
                uniqueEndpoints: Number.parseInt(stats.unique_endpoints) || 0,
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

    parseTimeFilters(filters = {}) {
        let { startTime, endTime } = filters;

        if (!startTime) {
            startTime = new Date();
            startTime.setHours(startTime.getHours() - 24);
        } else {
            startTime = new Date(startTime);
        }

        if (!endTime) {
            endTime = new Date();
        } else {
            endTime = new Date(endTime);
        }

        return {
            startTime,
            endTime,
        };
    }

    async getTopEndpoints(clientId, options = {}) {
        try {
            const { limit = 10, startTime } = options;
            const parsedStartTime = startTime ? new Date(startTime) : null;

            const endpoints = await this.metricRepo.getTopEndPoints(
                clientId,
                limit,
                parsedStartTime,
            );

            return endpoints.map((endpoint) => ({
                serviceName: endpoint.service_name,
                endpoint: endpoint.endpoint,
                method: endpoint.method,
                totalHits: Number.parseInt(endpoint.total_hits),
                avgLatency: Number.parseFloat(endpoint.avg_latency).toFixed(2),
                errorHits: Number.parseInt(endpoint.error_hits),
                errorRate: Number.parseFloat(
                    (Number.parseInt(endpoint.error_hits) /
                        Number.parseInt(endpoint.total_hits)) *
                    100,
                ).toFixed(2),
            }));
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
                limit = 100,
            } = filters;

            const { endTime: end_time, startTime: start_time } =
                this.parseTimeFilters({ startTime, endTime });

            const metrices = await this.metricRepo.getMetrices({
                clientId,
                serviceName,
                endpoint,
                startTime: start_time,
                endTime: end_time,
                limit,
            });

            return metrices.map((metric) => ({
                serviceName: metric.service_name,
                endpoint: metric.endpoint,
                method: metric.method,
                totalHits: Number.parseInt(metric.total_hits),
                errorHits: Number.parseInt(metric.error_hits),
                avgLatency: Number.parseFloat(metric.avg_latency).toFixed(2),
                minLatency: Number.parseFloat(metric.min_latency).toFixed(2),
                maxLatency: Number.parseFloat(metric.max_latency).toFixed(2),
                timeBucket: metric.time_bucket,
            }));
        } catch (error) {
            logger.error("Error getting time series", error);
            throw error;
        }
    }
}
