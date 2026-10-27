import request from "supertest";
import { generateApiHitPayload } from "./testData.js";

/**
 * Sends an API hit through the real endpoint: POST /api/hit
 *
 * @param {Express.Application} app
 * @param {string} apiKey - The x-api-key header value
 * @param {Object} [payload] - The hit payload
 * @returns {Promise<request.Response>}
 */
export async function sendApiHit(app, apiKey, payload = generateApiHitPayload()) {
    let req = request(app).post("/api/hit").send(payload);

    if (apiKey) {
        req = req.set("x-api-key", apiKey);
    }

    return req;
}
