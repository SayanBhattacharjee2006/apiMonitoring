import { BaseRepository } from "./BaseRepository.js";

const MAX_LIMIT = 1000;
const query_TIMEOUT_MS = 30000;

export class MetricsRepository extends BaseRepository {
    constructor({ postgres: pg, logger: l } = {}) {
        super({ logger: l });
        this.postgres = pg;
    }

    async upsertEndpointMetrics(metricsData) {
        try {
            const {
                clientId,
                serviceName,
                endpoint,
                method,
                totalHits,
                errorHits,
                avgLatency,
                minLatency,
                maxLatency,
                timeBucket,
            } = metricsData;

            const query = `
            INSERT INTO endpoint_metrics (
            client_id, service_name, endpoint, method, total_hits, error_hits,
            avg_latency, min_latency, max_latency, time_bucket
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (client_id, service_name, endpoint, method, time_bucket)
            DO UPDATE SET
               total_hits = endpoint_metrics.total_hits + EXCLUDED.total_hits,
               error_hits = endpoint_metrics.error_hits + EXCLUDED.error_hits,
               avg_latency = (
                (endpoint_metrics.avg_latency * endpoint_metrics.total_hits) + (EXCLUDED.avg_latency * EXCLUDED.total_hits) / (endpoint_metrics.total_hits + EXCLUDED.total_hits) 
               ),
                min_latency = LEAST(endpoint_metrics.min_latency, EXCLUDED.min_latency),
                max_latency = GREATEST(endpoint_metrics.max_latency, EXCLUDED.max_latency),
                updated_at = CURRENT_TIMESTAMP
            `;

            this._query(query, [
                clientId,
                serviceName,
                endpoint,
                method,
                totalHits,
                errorHits,
                avgLatency,
                minLatency,
                maxLatency,
                timeBucket,
            ]);
        } catch (err) {
            this.logger.error("Error upserting endpoint metrics:", err);
            throw err;
        }
    }

    async getMetrices(filters = {}) {
        try {
            const {
                clientId,
                serviceName,
                endpoint,
                startTime,
                endTime,
                limit = 100,
                offset = 0,
            } = filters;
            const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT); // Ensure limit is between 1 and MAX_LIMIT
            const safeOffset = Math.max(offset, 0); // Ensure offset is non-negative

            const query = `
            SELECT
                service_name,
                endpoint,
                method,
                SUM(total_hits) as total_hits,
                SUM(error_hits) as error_hits,
                SUM(avg_latency * total_hits) / NULLIF(SUM(total_hits), 0) as avg_latency,
                MIN(min_latency) as min_latency,
                MAX(max_latency) as max_latency,
                time_bucket
            FROM endpoint_metrics
            `;

            const params = [];
            let paramIndex = 1;

            let whereConditions = [];

            if (clientId) {
                whereConditions.push(`client_id = $${paramIndex++}`);
                params.push(clientId);
            }

            if (serviceName) {
                whereConditions.push(`service_name = $${paramIndex++}`);
                params.push(serviceName);
            }

            if (endpoint) {
                whereConditions.push(`endpoint = $${paramIndex++}`);
                params.push(endpoint);
            }

            if (startTime) {
                whereConditions.push(`time_bucket >= $${paramIndex++}`);
                params.push(startTime);
            }

            if (endTime) {
                whereConditions.push(`time_bucket <= $${paramIndex++}`);
                params.push(endTime);
            }

            if (whereConditions.length > 0) {
                query += ` WHERE ${whereConditions.join(" AND ")}`;
            }

            query += `
                GROUP BY service_name, endpoint, method, time_bucket
                ORDER BY time_bucket DESC
                LIMIT $${paramIndex}
                OFFSET $${paramIndex + 1}
            `;

            params.push(safeLimit, safeOffset);

            const result = await this._query(query, params);
            return result.rows;
        } catch (err) {
            this.logger.error("Error fetching metrics:", err);
            throw err;
        }
    }

    async getTopEndPoints(clientId, limit = 10, startTime = null) {
        try {
            const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
            let query = `
        SELECT
          service_name,
          endpoint,
          method,
          SUM(total_hits) as total_hits,
          SUM(avg_latency * total_hits) / NULLIF(SUM(total_hits), 0) as avg_latency,
          SUM(error_hits) as error_hits
        FROM endpoint_metrics
      `;

            const params = [];
            let paramIndex = 1;

            if (clientId) {
                query += ` WHERE client_id = $${paramIndex++}`;
                params.push(clientId);
            }

            if (startTime) {
                query += clientId != null ? " AND" : " WHERE";
                query += ` time_bucket >= $${paramIndex++}`;
                params.push(startTime);
            }

            query += `
        GROUP BY service_name, endpoint, method
        ORDER BY total_hits DESC
        LIMIT $${paramIndex}
      `;

            params.push(safeLimit);

            const result = this._query(query, params);
            return result.rows;
        } catch (err) {
            this.logger.error("Error fetching top endpoints:", err);
            throw err;
        }
    }

    async getOverallStats(clientId, startTime = null, endTime = null) {
        try {
            let query = `
        SELECT
          SUM(total_hits) as total_hits,
          SUM(error_hits) as error_hits,
          SUM(avg_latency * total_hits) / NULLIF(SUM(total_hits), 0) as avg_latency,
          COUNT(DISTINCT service_name) as unique_services,
          COUNT(DISTINCT endpoint) as unique_endpoints
        FROM endpoint_metrics
      `;

            const params = [];
            let paramIndex = 1;

            if (clientId) {
                query += ` WHERE client_id = $${paramIndex++}`;
                params.push(clientId);
            }

            if (startTime) {
                query += clientId != null ? " AND" : " WHERE";
                query += ` time_bucket >= $${paramIndex++}`;
                params.push(startTime);
            }

            if (endTime) {
                query +=
                    clientId != null || startTime != null ? " AND" : " WHERE";
                query += ` time_bucket <= $${paramIndex++}`;
                params.push(endTime);
            }

            const result = this._query(query, params);
            return result.rows[0] || {};
        } catch (err) {
            this.logger.error("Error fetching overall stats:", err);
            throw err;
        }
    }

    _query(sql, params = [], client = this.postgres) {
        const target = client || this.postgres;

        if(!target || typeof target.query !== "function") {
            this.logger.error("DB query error: Postgres client not configured");
            throw new Error("Postgres client not configured on MetricsRepository");
        }

        return target.query({
            text: sql,
            values: params,
            statement_timeout: query_TIMEOUT_MS,
        })
    }
}
