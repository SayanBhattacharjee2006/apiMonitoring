import logger from "../../../shared/config/logger.js";
import AppError from "../../../shared/utils/AppError.js";

export class AnalyticService {
    constructor({ metricRepo }) {
        if (!metricRepo) throw new Error("Metric repository is required");
        this.metricRepo = metricRepo;
    }

    alignToHourlyBuckets(startTime, endTime) {
        const floorToUtcHour = (d) => {
            const copy = new Date(d);
            copy.setUTCMinutes(0, 0, 0);
            return copy;
        };

        const isExactUtcHour = (d) => {
            return (
                d.getUTCMinutes() === 0 &&
                d.getUTCSeconds() === 0 &&
                d.getUTCMilliseconds() === 0
            );
        };

        const start = new Date(startTime);
        const end = new Date(endTime);

        const effectiveStart = floorToUtcHour(start);
        let effectiveEnd;

        if (isExactUtcHour(end) && end.getTime() > start.getTime()) {
            effectiveEnd = new Date(end.getTime() - 60 * 60 * 1000);
            if (effectiveEnd.getTime() < effectiveStart.getTime()) {
                effectiveEnd = effectiveStart;
            }
        } else {
            effectiveEnd = floorToUtcHour(end);
        }

        return {
            effectiveStartTime: effectiveStart,
            effectiveEndTime: effectiveEnd,
        };
    }

    parseTimeFilters(filters = {}) {
        let { startTime, endTime, effectiveStartTime, effectiveEndTime } = filters;

        let start;
        let end;
        const now = new Date();
        let isDefault24h = false;

        if (startTime instanceof Date) {
            start = startTime;
        } else if (startTime) {
            start = new Date(startTime);
        }

        if (endTime instanceof Date) {
            end = endTime;
        } else if (endTime) {
            end = new Date(endTime);
        }

        if (!start && !end) {
            end = now;
            start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        } else if (start && !end) {
            end = now;
        } else if (!start && end) {
            start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        }

        if (!effectiveStartTime || !effectiveEndTime) {
            const aligned = this.alignToHourlyBuckets(start, end);
            effectiveStartTime = effectiveStartTime || aligned.effectiveStartTime;
            effectiveEndTime = effectiveEndTime || aligned.effectiveEndTime;
        }

        return {
            startTime: start,
            endTime: end,
            effectiveStartTime,
            effectiveEndTime,
        };
    }

    async getOverallStats(clientId, filters = {}) {
        try {
            const { startTime, endTime, effectiveStartTime, effectiveEndTime } =
                this.parseTimeFilters(filters);
            const queryStart = effectiveStartTime || startTime;
            const queryEnd = effectiveEndTime || endTime;

            const stats = await this.metricRepo.getOverallStats(
                clientId,
                queryStart,
                queryEnd,
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
            const { limit = 10 } = options;
            const { startTime, endTime, effectiveStartTime, effectiveEndTime } =
                this.parseTimeFilters(options);
            const queryStart = effectiveStartTime || startTime;
            const queryEnd = effectiveEndTime || endTime;

            const endpoints = await this.metricRepo.getTopEndPoints(
                clientId,
                limit,
                queryStart,
                queryEnd,
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
                endpoint,
                limit = 1000,
            } = filters;

            const {
                effectiveStartTime,
                effectiveEndTime,
                startTime: parsedStart,
                endTime: parsedEnd,
            } = this.parseTimeFilters(filters);
            const queryStart = effectiveStartTime || parsedStart;
            const queryEnd = effectiveEndTime || parsedEnd;

            const metrices = await this.metricRepo.getTimeSeriesMetrics({
                clientId,
                serviceName,
                endpoint,
                startTime: queryStart,
                endTime: queryEnd,
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
