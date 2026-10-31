import logger from "../../../shared/config/logger.js";

export class ProcessorService {
    constructor({ apiHitRepository, metricsRepository }) {
        if (!apiHitRepository)
            throw new Error("ProcessorService requires ApiHitRepository");
        if (!metricsRepository)
            throw new Error("ProcessorService requires MetricsRepository");
        this.apiHitRepository = apiHitRepository;
        this.metricsRepository = metricsRepository;
    }

    getTimeBucket(timestamp, interval = "hour") {
        const date = new Date(timestamp);

        switch (interval) {
            case "hour":
                date.setUTCMinutes(0, 0, 0);
                break;
            case "day":
                date.setUTCHours(0, 0, 0, 0);
                break;
            case "minute":
                date.setUTCSeconds(0, 0);
                break;
            default:
                date.setUTCMinutes(0, 0, 0);
        }

        return date;
    }

    /**
     * Processes an API hit event:
     * 1. Validates the event ID and required payload fields.
     * 2. Persists the raw event to MongoDB (or detects duplicate).
     * 3. Aggregates metrics in PostgreSQL inside an atomic idempotency transaction.
     * 4. Rethrows all persistence/aggregation errors to consumer for retry/DLQ handling.
     *
     * @param {Object} eventData
     * @returns {Promise<{ status: "PROCESSED" | "DUPLICATE", eventId: string }>}
     */
    async processEvent(eventData) {
        if (!eventData) {
            throw new Error("Event data is required");
        }

        if (
            !eventData.eventId ||
            typeof eventData.eventId !== "string" ||
            eventData.eventId.trim() === "" ||
            eventData.eventId === "unknown"
        ) {
            throw new Error(
                `Invalid event ID: "${eventData.eventId}". Event ID must be a non-empty string and not "unknown".`
            );
        }

        if (!eventData.clientId) {
            throw new Error("Missing required field: clientId");
        }

        if (!eventData.serviceName || !eventData.endpoint || !eventData.method) {
            throw new Error("Missing required fields: serviceName, endpoint, and method are required");
        }

        logger.info("Processing event data:", {
            eventId: eventData.eventId,
            clientId: eventData.clientId,
            serviceName: eventData.serviceName,
            endpoint: eventData.endpoint,
            method: eventData.method,
        });

        // Step 1: Idempotently persist the raw event to MongoDB.
        // Even if MongoDB reports a duplicate document, do NOT halt: continue to PostgreSQL
        // aggregation because a previous attempt may have failed during the PostgreSQL transaction.
        const mongoResult = await this.apiHitRepository.save(eventData);
        if (mongoResult?.isDuplicate) {
            logger.info("Raw event already exists in MongoDB, continuing to PostgreSQL aggregation", {
                eventId: eventData.eventId,
            });
        } else {
            logger.info("Raw event saved to MongoDB", {
                eventId: eventData.eventId,
            });
        }

        // Step 2: Record event in processed_events ledger and update aggregate metrics in PostgreSQL.
        // Any failure in PostgreSQL is NOT swallowed and will be thrown back to the caller/consumer.
        const pgResult = await this._updateMetricsWithFallback(eventData);

        const status = pgResult?.isDuplicate ? "DUPLICATE" : "PROCESSED";
        logger.info(`Event ${status.toLowerCase()} successfully`, {
            eventId: eventData.eventId,
            status,
        });

        return {
            status,
            eventId: eventData.eventId,
        };
    }

    async _updateMetricsWithFallback(eventData) {
        const timeBucket = this.getTimeBucket(eventData.timestamp, "hour");
        const metricsData = {
            clientId: eventData.clientId.toString(),
            serviceName: eventData.serviceName,
            endpoint: eventData.endpoint,
            method: eventData.method,
            totalHits: 1,
            errorHits: Number(eventData.statusCode) >= 400 ? 1 : 0,
            avgLatency: Number(eventData.latencyMs) || 0,
            minLatency: Number(eventData.latencyMs) || 0,
            maxLatency: Number(eventData.latencyMs) || 0,
            timeBucket,
        };

        return await this.metricsRepository.recordEventAndAggregateMetrics({
            eventId: eventData.eventId,
            clientId: eventData.clientId.toString(),
            metricsData,
        });
    }

    async cleanupOldEvents(daysToKeep = 30) {
        try {
            let cutOffDate = new Date();
            cutOffDate.setDate(cutOffDate.getDate() - daysToKeep);

            const deletedCount = await this.apiHitRepository.deleteOldHits(cutOffDate);
            return deletedCount;
        } catch (error) {
            logger.error("Error during cleanup:", error);
            throw error;
        }
    }
}
export default ProcessorService;
