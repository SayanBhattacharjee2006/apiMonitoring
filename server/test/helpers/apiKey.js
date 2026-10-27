import request from "supertest";
import { generateApiKeyData } from "./testData.js";

/**
 * Creates an API key through the real API endpoint: POST /api/admin/client/:clientId/api/keys
 *
 * @param {Express.Application} app
 * @param {{ cookie?: string, bearer?: string }} auth - Super Admin or Client Admin authentication
 * @param {string} clientId
 * @param {Object} [keyData]
 * @returns {Promise<Object>} - The created API key object (including keyValue)
 */
export async function createTestApiKey(
    app,
    auth,
    clientId,
    keyData = generateApiKeyData()
) {
    let req = request(app)
        .post(`/api/admin/client/${clientId}/api/keys`)
        .send(keyData);

    if (auth.cookie) {
        req = req.set("Cookie", auth.cookie);
    } else if (auth.bearer) {
        req = req.set("Authorization", auth.bearer);
    }

    const res = await req;
    if (res.status !== 201) {
        throw new Error(
            `Failed to create API key (${res.status}): ${JSON.stringify(res.body)}`
        );
    }

    return res.body.data;
}

/**
 * Lists API keys for a client: GET /api/admin/client/:clientId/api/keys
 */
export async function listTestApiKeys(app, auth, clientId) {
    let req = request(app).get(`/api/admin/client/${clientId}/api/keys`);

    if (auth.cookie) {
        req = req.set("Cookie", auth.cookie);
    } else if (auth.bearer) {
        req = req.set("Authorization", auth.bearer);
    }

    const res = await req;
    return res;
}
