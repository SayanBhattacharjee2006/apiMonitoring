import request from "supertest";
import { generateClientData, generateClientUserData } from "./testData.js";
import { extractAuthData } from "./auth.js";

/**
 * Creates a new client through the real API endpoint: POST /api/admin/client/onboard
 *
 * @param {Express.Application} app
 * @param {{ cookie?: string, bearer?: string }} auth - Super Admin authentication
 * @param {Object} [clientData]
 * @returns {Promise<Object>} - The created client object
 */
export async function createTestClient(app, auth, clientData = generateClientData()) {
    let req = request(app)
        .post("/api/admin/client/onboard")
        .send(clientData);

    if (auth.cookie) {
        req = req.set("Cookie", auth.cookie);
    } else if (auth.bearer) {
        req = req.set("Authorization", auth.bearer);
    }

    const res = await req;
    if (res.status !== 201) {
        throw new Error(
            `Failed to create client (${res.status}): ${JSON.stringify(res.body)}`
        );
    }

    return res.body.data;
}

/**
 * Creates a client user through the real API endpoint: POST /api/admin/client/:clientId/users
 *
 * @param {Express.Application} app
 * @param {{ cookie?: string, bearer?: string }} auth - Creator authentication (Super Admin or Client Admin)
 * @param {string} clientId
 * @param {Object} [userData]
 * @returns {Promise<{ user: Object, credentials: Object }>}
 */
export async function createTestClientUser(
    app,
    auth,
    clientId,
    userData = generateClientUserData()
) {
    let req = request(app)
        .post(`/api/admin/client/${clientId}/users`)
        .send(userData);

    if (auth.cookie) {
        req = req.set("Cookie", auth.cookie);
    } else if (auth.bearer) {
        req = req.set("Authorization", auth.bearer);
    }

    const res = await req;
    if (res.status !== 201) {
        throw new Error(
            `Failed to create client user (${res.status}): ${JSON.stringify(res.body)}`
        );
    }

    return {
        user: res.body.data,
        credentials: userData,
    };
}
