import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { app } from "../../src/server.js";
import { cleanAllDatabases } from "../setup/testDatabase.js";
import { onboardSuperAdmin, loginUser } from "../helpers/auth.js";
import { createTestClient, createTestClientUser } from "../helpers/client.js";
import { createTestApiKey, listTestApiKeys } from "../helpers/apiKey.js";
import { generateClientData, generateClientUserData, generateApiKeyData } from "../helpers/testData.js";

describe("Phase 8: API Key Management (POST/GET /api/admin/client/:clientId/api/keys)", () => {
    let superAdmin;
    let clientA;
    let clientB;
    let clientAAdmin;
    let clientAViewer;

    beforeEach(async () => {
        await cleanAllDatabases();
        superAdmin = await onboardSuperAdmin(app);
        clientA = await createTestClient(app, superAdmin, generateClientData());
        clientB = await createTestClient(app, superAdmin, generateClientData());

        // Create Client A Admin & Viewer
        const adminAData = generateClientUserData("client-admin");
        await createTestClientUser(app, superAdmin, clientA._id, adminAData);
        clientAAdmin = await loginUser(app, adminAData.username, adminAData.password);

        const viewerAData = generateClientUserData("client-viewer");
        await createTestClientUser(app, superAdmin, clientA._id, viewerAData);
        clientAViewer = await loginUser(app, viewerAData.username, viewerAData.password);
    });

    afterEach(async () => {
        await cleanAllDatabases();
    });

    it("allows Super Admin and Client Admin to generate an API key with keyValue", async () => {
        const keyData = generateApiKeyData();
        const apiKey = await createTestApiKey(app, clientAAdmin, clientA._id, keyData);

        expect(apiKey).toBeDefined();
        expect(apiKey.keyId).toBeDefined();
        expect(apiKey.keyValue).toMatch(/^apim_[a-f0-9]{40}$/);
        expect(apiKey.clientId.toString()).toBe(clientA._id.toString());
        expect(apiKey.environment).toBe("testing");
        expect(apiKey.permissions.canIngest).toBe(true);
        expect(apiKey.isActive).toBe(true);
    });

    it("prevents Client Viewer from generating API keys with 403", async () => {
        const keyData = generateApiKeyData();
        const res = await request(app)
            .post(`/api/admin/client/${clientA._id}/api/keys`)
            .set("Cookie", clientAViewer.cookie)
            .send(keyData);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/access denied/i);
    });

    it("prevents Client A Admin from generating API keys for Client B (Cross-Tenant Isolation)", async () => {
        const keyData = generateApiKeyData();
        const res = await request(app)
            .post(`/api/admin/client/${clientB._id}/api/keys`)
            .set("Cookie", clientAAdmin.cookie)
            .send(keyData);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/access denied/i);
    });

    it("allows listing API keys and ensures raw keyValue is stripped for security", async () => {
        // Create 2 keys for Client A
        await createTestApiKey(app, clientAAdmin, clientA._id, generateApiKeyData());
        await createTestApiKey(app, clientAAdmin, clientA._id, generateApiKeyData());

        const res = await listTestApiKeys(app, clientAAdmin, clientA._id);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(2);

        // Security check: raw keyValue must NOT be exposed in listing
        for (const key of res.body.data) {
            expect(key.keyId).toBeDefined();
            expect(key.keyValue).toBeUndefined();
        }
    });

    it("prevents Client A from viewing Client B API keys", async () => {
        const res = await listTestApiKeys(app, clientAAdmin, clientB._id);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/access denied/i);
    });

    it("returns 404 when attempting to generate API key for non-existent client", async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        const res = await request(app)
            .post(`/api/admin/client/${fakeId}/api/keys`)
            .set("Cookie", superAdmin.cookie)
            .send(generateApiKeyData());

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/client not found/i);
    });
});
