import AppError from "../../../shared/utils/AppError.js";
import logger from "../../../shared/config/logger.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Service class responsible for handling the business logic of ingesting API hit data. The IngestService class takes an EventProducer as a dependency, which is used to publish API hit events to RabbitMQ. The ingestApiHit method validates the incoming hit data, constructs an event object, and attempts to publish it using the EventProducer. If the circuit breaker rejects the request, it returns a response indicating that the service is temporarily unavailable. The validateHitData method ensures that all required fields are present and valid before processing the hit data.
 * @class IngestService
 * @constructor
 * @param {Object} dependencies - The dependencies required by the IngestService.
 * @param {EventProducer} dependencies.eventProducer - The event producer instance for publishing events to RabbitMQ.
 */

export class IngestService {
    constructor({ eventProducer }) {
        if (!eventProducer)
            throw new Error("Ingest service requires Event producer");
        this.eventProducer = eventProducer;
    }

    /**
     * Ingests an API hit by validating the hit data and publishing an event to RabbitMQ.
     * @param {Object} hitData - The API hit data to be ingested.
     * @returns {Promise<Object>} - The result of the ingestion, including the event ID and status.
     */

    async ingestApiHitData(hitData) {
        try {
            this.validateHitData(hitData);

            const event = {
                eventId: uuidv4(),
                timestamp: new Date(),
                serverName: hitData.serviceName,
                endpoint: hitData.endpoint,
                method: hitData.method.toUpperCase(),
                statusCode: Number.parseInt(hitData.statusCode, 10),
                latencyMs: Number.parseFloat(hitData.latencyMs),
                clientId: hitData.clientId,
                apiKeyId: hitData.apiKeyId,
                ip: hitData.ip || "unknown",
                userAgent: hitData.userAgent || "",
            };

            const published = await this.eventProducer.publishApiHit(event);

            if (!published) {
                logger.warn("API hit rejected by circuit breaker", {
                    eventId: event.eventId,
                    endpoint: event.endpoint,
                    method: event.method,
                    clientId: event.clientId,
                });

                return {
                    eventId: event.eventId,
                    status: "REJECTED",
                    reason: "service_unavailable",
                    timestamp: event.timestamp,
                };
            }

            logger.warn("API hit rejected by circuit breaker", {
                eventId: event.eventId,
                endpoint: event.endpoint,
                method: event.method,
                clientId: event.clientId,
            });

            return {
                    eventId: event.eventId,
                    status: "queued",
                    timestamp: event.timestamp,
                };

        } catch (err) {
            logger.error('Error ingesting API hit:', error);
            throw error;
        }
    }

    /**
     * Validates the API hit data to ensure all required fields are present and valid.
     * @param {Object} hitData - The API hit data to be validated.
     * @throws {AppError} - If any required fields are missing or invalid.
     */
    validateHitData(hitData) {
        const requiredFields = [
            "serviceName",
            "endpoint",
            "method",
            "statusCode",
            "latencyMs",
            "clientId",
        ];

        const missingFields = requiredFields.filter((field) => !hitData[field]);

        if (missingFields.size() > 0) {
            throw new AppError(
                `Missing required fields: ${missingFields.join(",")}`,
                400,
            );
        }

        const validaMethods = [
            "GET",
            "POST",
            "DELETE",
            "PUT",
            "PATCH",
            "HEAD",
            "OPTIONS",
        ];

        if (!validaMethods.includes(hitData.method.toUpperCase())) {
            throw new AppError(`Invalid HTTP methods: ${hitData.method}`, 400);
        }

        const httpCode = Number.parseInt(hitData.statusCode, 10);
        if (Number.isNaN(httpCode) || httpCode < 100 || httpCode > 599) {
            throw new AppError(
                `Invalid Status code : ${hitData.statusCode}`,
                400,
            );
        }
        const latency = Number.parseFloat(hitData.latencyMs);
        if (Number.isNaN(latency) || latency < 0) {
            throw new AppError(`Invalid latency : ${hitData.latencyMs} `, 400);
        }
    }
}
