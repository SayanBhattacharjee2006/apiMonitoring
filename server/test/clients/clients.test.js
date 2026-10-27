import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { app } from "../../src/server.js";
import { cleanAllDatabases } from "../setup/testDatabase.js";
import { onboardSuperAdmin } from "../helpers/auth.js";
import { createTestClient, createTestClientUser } from "../helpers/client.js";
import { generateClientData, randomSuffix } from "../helpers/testData.js";

describe("Phase 7: Client Management (POST /api/admin/client/onboard)", () => {
    let superAdmin;

    beforeEach(async () => {
        await cleanAllDatabases();
        superAdmin = await onboardSuperAdmin(app);
    });

    afterEach(async () => {
        await cleanAllDatabases();
    });

    it("allows Super Admin to onboard a client with auto-generated slug and defaults", async () => {
        const clientData = {
            name: "Alpha Corp Systems",
            email: `alpha_${randomSuffix()}@example.com`,
            description: "Enterprise SaaS monitoring",
            website: "https://alpha.example.com",
        };

        const client = await createTestClient(app, superAdmin, clientData);

        expect(client).toBeDefined();
        expect(client._id).toBeDefined();
        expect(client.name).toBe("Alpha Corp Systems");
        expect(client.slug).toBe("alpha-corp-systems");
        expect(client.email).toBe(clientData.email);
        expect(client.isActive).toBe(true);
        expect(client.createdBy.toString()).toBe(superAdmin.user._id.toString());
        expect(client.settings).toBeDefined();
        expect(client.settings.dataRetentionDays).toBe(30);
        expect(client.settings.alertsEnabled).toBe(true);
        expect(client.settings.timezone).toBe("UTC");
    });

    it("rejects client onboarding with duplicate name/slug with 409", async () => {
        const clientData = {
            name: "Beta Innovations",
            email: `beta1_${randomSuffix()}@example.com`,
        };

        // First onboarding succeeds
        await createTestClient(app, superAdmin, clientData);

        // Second onboarding with same name (produces duplicate slug)
        const res = await request(app)
            .post("/api/admin/client/onboard")
            .set("Cookie", superAdmin.cookie)
            .send({
                name: "Beta Innovations",
                email: `beta2_${randomSuffix()}@example.com`,
            });

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/client already exists/i);
    });

    it("rejects client onboarding with missing required fields", async () => {
        const res = await request(app)
            .post("/api/admin/client/onboard")
            .set("Cookie", superAdmin.cookie)
            .send({
                description: "Missing name and email",
            });

        // Mongoose validation or validation middleware rejects invalid body
        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.body.success).toBe(false);
    });

    it("rejects unauthenticated requests with 401", async () => {
        const res = await request(app)
            .post("/api/admin/client/onboard")
            .send(generateClientData());

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/token is required/i);
    });

    it("rejects non-super-admin users with 403 Access denied", async () => {
        // Create Client A and a Client A Admin
        const clientA = await createTestClient(app, superAdmin, generateClientData());
        const { credentials } = await createTestClientUser(app, superAdmin, clientA._id, {
            username: `admin_client_${randomSuffix()}`,
            email: `admin_c_${randomSuffix()}@example.com`,
            password: "TestPassword123!",
            role: "client-admin",
        });

        // Log in as Client Admin
        const loginRes = await request(app)
            .post("/api/auth/login")
            .send(credentials);
        const clientAdminCookie = loginRes.headers["set-cookie"][0].match(/authToken=([^;]+)/)[0];

        // Attempt to create client as Client Admin
        const res = await request(app)
            .post("/api/admin/client/onboard")
            .set("Cookie", clientAdminCookie)
            .send(generateClientData());

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/access denied/i);
    });
});
