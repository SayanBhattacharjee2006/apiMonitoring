import { BaseRepository } from "./BaseRepository.js";

const MAX_LIMIT = 1000;
const query_TIMEOUT_MS = 30000;

export class MetricsRepository extends BaseRepository {
    constructor({ postgres: pg, logger: l } = {}) {
        super({ logger: l });
        this.postgres = pg;
    }

    /**
     * Atomically records eventId in processed_events and updates aggregate metrics in one transaction.
     * Prevents duplicate metric aggregation across retries, restarts, and concurrent deliveries.
     *
     * @param {Object} params
     * @param {string} params.eventId
     * @param {string} params.clientId
     * @param {Object} params.metricsData
     * @returns {Promise<{ isDuplicate: boolean, eventId: string }>}
     */
    async recordEventAndAggregateMetrics({ eventId, clientId, metricsData }) {
        if (!eventId || typeof eventId !== "string" || eventId.trim() === "" || eventId === "unknown") {
            throw new Error("Invalid event ID: non-empty string eventId is required for metric aggregation");
        }
        if (!clientId) {
            throw new Error("Invalid client ID: clientId is required for metric aggregation");
        }

        const pool = typeof this.postgres?.getPool === "function"
            ? this.postgres.getPool()
            : this.postgres;

        if (!pool || typeof pool.connect !== "function") {
            this.logger.error("Database error: PostgreSQL pool is not available");
            throw new Error("PostgreSQL pool is not configured on MetricsRepository");
        }

        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            // 1. Attempt to insert event into durable processed_events ledger
            const insertLedgerSql = `
                INSERT INTO processed_events (event_id, client_id, processed_at)
                VALUES ($1, $2, CURRENT_TIMESTAMP)
                ON CONFLICT (event_id) DO NOTHING
                RETURNING event_id;
            `;
            const ledgerResult = await this._query(insertLedgerSql, [eventId, clientId.toString()], client);

            if (ledgerResult.rowCount === 0) {
                // Event ID already exists in ledger. Validate tenant identity.
                const checkSql = `SELECT client_id FROM processed_events WHERE event_id = $1`;
                const checkResult = await this._query(checkSql, [eventId], client);

                if (checkResult.rows.length > 0) {
                    const recordedClientId = checkResult.rows[0].client_id;
                    if (recordedClientId !== clientId.toString()) {
                        this.logger.error("Event integrity error: cross-tenant event ID collision", {
                            eventId,
                            incomingClientId: clientId.toString(),
                            recordedClientId,
                        });
                        const integrityErr = new Error(`Event integrity error: eventId '${eventId}' already exists for another client`);
                        integrityErr.code = "EVENT_INTEGRITY_MISMATCH";
                        throw integrityErr;
                    }
                }

                // Legitimate duplicate: skip aggregation and commit
                await client.query("COMMIT");
                this.logger.info("Event already recorded in ledger, skipping duplicate metric aggregation", {
                    eventId,
                    clientId,
                });
                return { isDuplicate: true, eventId };
            }

            // 2. New event: invoke existing endpoint metrics UPSERT within the same transaction
            await this.upsertEndpointMetrics(metricsData, client);

            await client.query("COMMIT");
            this.logger.info("Event recorded in ledger and metrics aggregated successfully", {
                eventId,
                clientId,
            });
            return { isDuplicate: false, eventId };
        } catch (error) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackErr) {
                this.logger.error("Error during transaction rollback:", rollbackErr);
            }
            throw error;
        } finally {
            client.release();
        }
    }

    async upsertEndpointMetrics(metricsData, client = null) {
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
                (endpoint_metrics.avg_latency * endpoint_metrics.total_hits) + (EXCLUDED.avg_latency * EXCLUDED.total_hits)) / (endpoint_metrics.total_hits + EXCLUDED.total_hits) 
               ,
                min_latency = LEAST(endpoint_metrics.min_latency, EXCLUDED.min_latency),
                max_latency = GREATEST(endpoint_metrics.max_latency, EXCLUDED.max_latency),
                updated_at = CURRENT_TIMESTAMP
            `;

            await this._query(query, [
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
            ], client);
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
            const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
            const safeOffset = Math.max(offset, 0);

            let query = `
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
            const whereConditions = [];

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

    /**
     * Dedicated time-series query:
     * Groups by time_bucket only, aggregates across all services/endpoints,
     * calculates mathematically correct weighted average latency,
     * and orders chronologically with limit applied AFTER grouping.
     *
     * @param {Object} filters
     * @returns {Promise<Array>}
     */
    async getTimeSeriesMetrics(filters = {}) {
        try {
            const {
                clientId,
                serviceName,
                endpoint,
                startTime,
                endTime,
                limit = 1000,
            } = filters;

            const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);

            let query = `
                SELECT
                    time_bucket,
                    SUM(total_hits) AS total_hits,
                    SUM(error_hits) AS error_hits,
                    SUM(avg_latency * total_hits) / NULLIF(SUM(total_hits), 0) AS avg_latency
                FROM endpoint_metrics
            `;

            const params = [];
            let paramIndex = 1;
            const whereConditions = [];

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
                GROUP BY time_bucket
                ORDER BY time_bucket ASC
                LIMIT $${paramIndex}
            `;

            params.push(safeLimit);

            const result = await this._query(query, params);
            return result.rows;
        } catch (err) {
            this.logger.error("Error fetching time-series metrics:", err);
            throw err;
        }
    }

    async getTopEndPoints(clientId, limit = 10, startTime = null, endTime = null) {
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
            const whereConditions = [];

            if (clientId) {
                whereConditions.push(`client_id = $${paramIndex++}`);
                params.push(clientId);
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
                GROUP BY service_name, endpoint, method
                ORDER BY total_hits DESC
                LIMIT $${paramIndex}
            `;

            params.push(safeLimit);

            const result = await this._query(query, params);
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
            const whereConditions = [];

            if (clientId) {
                whereConditions.push(`client_id = $${paramIndex++}`);
                params.push(clientId);
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

            const result = await this._query(query, params);
            return result.rows[0] || {};
        } catch (err) {
            this.logger.error("Error fetching overall stats:", err);
            throw err;
        }
    }

    _query(sql, params = [], client = null) {
        const target = client || this.postgres;

        if (!target || typeof target.query !== "function") {
            this.logger.error("DB query error: Postgres client not configured");
            throw new Error("Postgres client not configured on MetricsRepository");
        }

        return target.query({
            text: sql,
            values: params,
            statement_timeout: query_TIMEOUT_MS,
        });
    }
}
