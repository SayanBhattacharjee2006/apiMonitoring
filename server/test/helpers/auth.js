import request from "supertest";
import { generateSuperAdminData } from "./testData.js";

/**
 * Extracts authToken from the response Set-Cookie header.
 *
 * @param {Object} response - Supertest response object
 * @returns {{ token: string, cookie: string, bearer: string }}
 */
export function extractAuthData(response) {
    const setCookie = response.headers["set-cookie"];
    let token = null;

    if (Array.isArray(setCookie)) {
        for (const cookieStr of setCookie) {
            const match = cookieStr.match(/authToken=([^;]+)/);
            if (match) {
                token = match[1];
                break;
            }
        }
    } else if (typeof setCookie === "string") {
        const match = setCookie.match(/authToken=([^;]+)/);
        if (match) {
            token = match[1];
        }
    }

    // Also check if token was provided in response data (if any)
    if (!token && response.body?.data?.token) {
        token = response.body.data.token;
    }

    return {
        token,
        cookie: token ? `authToken=${token}` : "",
        bearer: token ? `Bearer ${token}` : "",
    };
}

/**
 * Onboards a Super Admin through the real API endpoint: POST /api/auth/onboard-super-admin
 *
 * @param {Express.Application} app
 * @param {Object} [superAdminData]
 * @returns {Promise<{ user: Object, token: string, cookie: string, bearer: string }>}
 */
export async function onboardSuperAdmin(app, superAdminData = generateSuperAdminData()) {
    const res = await request(app)
        .post("/api/auth/onboard-super-admin")
        .send(superAdminData);

    if (res.status !== 201) {
        throw new Error(
            `Failed to onboard super admin (${res.status}): ${JSON.stringify(res.body)}`
        );
    }

    const auth = extractAuthData(res);
    return {
        user: res.body.data,
        credentials: superAdminData,
        ...auth,
    };
}

/**
 * Logs in through the real API endpoint: POST /api/auth/login
 *
 * @param {Express.Application} app
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ user: Object, token: string, cookie: string, bearer: string }>}
 */
export async function loginUser(app, username, password) {
    const res = await request(app)
        .post("/api/auth/login")
        .send({ username, password });

    if (res.status !== 200) {
        throw new Error(
            `Login failed for user ${username} (${res.status}): ${JSON.stringify(res.body)}`
        );
    }

    const auth = extractAuthData(res);
    return {
        user: res.body.data,
        ...auth,
    };
}

/**
 * Convenience helper to log in as Super Admin
 */
export async function loginAsSuperAdmin(app, credentials) {
    return loginUser(app, credentials.username, credentials.password);
}

/**
 * Convenience helper to log in as Client Admin
 */
export async function loginAsClientAdmin(app, credentials) {
    return loginUser(app, credentials.username, credentials.password);
}

/**
 * Convenience helper to log in as Client Viewer
 */
export async function loginAsClientViewer(app, credentials) {
    return loginUser(app, credentials.username, credentials.password);
}
