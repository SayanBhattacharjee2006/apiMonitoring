import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { app } from "../../src/server.js";
import { cleanAllDatabases } from "../setup/testDatabase.js";
import { onboardSuperAdmin, loginUser } from "../helpers/auth.js";
import { createTestClient, createTestClientUser } from "../helpers/client.js";
import { generateClientData, generateClientUserData, generateApiKeyData } from "../helpers/testData.js";

describe("Phase 6 & 15: Role-Based Access Control (RBAC) & Authorization Matrix", () => {
    let superAdmin;
    let clientA;
    let clientB;
    let clientAAdmin;
    let clientAViewer;
    let clientBAdmin;

    beforeEach(async () => {
        await cleanAllDatabases();

        // 1. Super Admin
        superAdmin = await onboardSuperAdmin(app);

        // 2. Client A and its roles
        clientA = await createTestClient(app, superAdmin, generateClientData());

        const adminAData = generateClientUserData("client-admin");
        await createTestClientUser(app, superAdmin, clientA._id, adminAData);
        clientAAdmin = await loginUser(app, adminAData.username, adminAData.password);

        const viewerAData = generateClientUserData("client-viewer");
        await createTestClientUser(app, superAdmin, clientA._id, viewerAData);
        clientAViewer = await loginUser(app, viewerAData.username, viewerAData.password);

        // 3. Client B and its Admin
        clientB = await createTestClient(app, superAdmin, generateClientData());

        const adminBData = generateClientUserData("client-admin");
        await createTestClientUser(app, superAdmin, clientB._id, adminBData);
        clientBAdmin = await loginUser(app, adminBData.username, adminBData.password);
    });

    afterEach(async () => {
        await cleanAllDatabases();
    });

    describe("Client Creation (POST /api/admin/client/onboard)", () => {
        it("allows Super Admin to onboard new clients", async () => {
            const res = await request(app)
                .post("/api/admin/client/onboard")
                .set("Cookie", superAdmin.cookie)
                .send(generateClientData());

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });

        it("forbids Client Admin from onboarding new clients", async () => {
            const res = await request(app)
                .post("/api/admin/client/onboard")
                .set("Cookie", clientAAdmin.cookie)
                .send(generateClientData());

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/access denied/i);
        });

        it("forbids Client Viewer from onboarding new clients", async () => {
            const res = await request(app)
                .post("/api/admin/client/onboard")
                .set("Cookie", clientAViewer.cookie)
                .send(generateClientData());

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/access denied/i);
        });
    });

    describe("User Registration Route (POST /api/auth/register)", () => {
        it("allows Super Admin to register a user via auth register route", async () => {
            const newUserData = generateClientUserData("client-viewer");
            const res = await request(app)
                .post("/api/auth/register")
                .set("Cookie", superAdmin.cookie)
                .send({
                    ...newUserData,
                    clientId: clientA._id,
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });

        it("forbids Client Admin from using super-admin auth register endpoint", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .set("Cookie", clientAAdmin.cookie)
                .send({
                    ...generateClientUserData("client-viewer"),
                    clientId: clientA._id,
                });

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/insufficient permissions/i);
        });

        it("forbids Client Viewer from using super-admin auth register endpoint", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .set("Cookie", clientAViewer.cookie)
                .send({
                    ...generateClientUserData("client-viewer"),
                    clientId: clientA._id,
                });

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/insufficient permissions/i);
        });
    });

    describe("API Key Creation (POST /api/admin/client/:clientId/api/keys)", () => {
        it("allows Super Admin to create API keys for any client", async () => {
            const res = await request(app)
                .post(`/api/admin/client/${clientA._id}/api/keys`)
                .set("Cookie", superAdmin.cookie)
                .send(generateApiKeyData());

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });

        it("allows Client Admin to create API keys for their own client", async () => {
            const res = await request(app)
                .post(`/api/admin/client/${clientA._id}/api/keys`)
                .set("Cookie", clientAAdmin.cookie)
                .send(generateApiKeyData());

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });

        it("forbids Client Admin from creating API keys for another client", async () => {
            const res = await request(app)
                .post(`/api/admin/client/${clientB._id}/api/keys`)
                .set("Cookie", clientAAdmin.cookie)
                .send(generateApiKeyData());

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/access denied/i);
        });

        it("forbids Client Viewer from creating API keys for their own client", async () => {
            const res = await request(app)
                .post(`/api/admin/client/${clientA._id}/api/keys`)
                .set("Cookie", clientAViewer.cookie)
                .send(generateApiKeyData());

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/access denied/i);
        });
    });

    describe("Analytics Access (GET /api/analytics/stats)", () => {
        it("allows Super Admin, Client Admin, and Client Viewer to view permitted analytics", async () => {
            const resAdmin = await request(app)
                .get("/api/analytics/stats")
                .set("Cookie", superAdmin.cookie);
            expect(resAdmin.status).toBe(200);

            const resClientAdmin = await request(app)
                .get("/api/analytics/stats")
                .set("Cookie", clientAAdmin.cookie);
            expect(resClientAdmin.status).toBe(200);

            const resClientViewer = await request(app)
                .get("/api/analytics/stats")
                .set("Cookie", clientAViewer.cookie);
            expect(resClientViewer.status).toBe(200);
        });
    });
});
