import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { app } from "../../src/server.js";
import { cleanAllDatabases } from "../setup/testDatabase.js";
import { randomSuffix, DEFAULT_TEST_PASSWORD } from "../helpers/testData.js";

describe("Audit: Independent Public Tenant Registration Verification", () => {
    beforeEach(async () => {
        await cleanAllDatabases();
    });

    afterEach(async () => {
        await cleanAllDatabases();
    });

    describe("Current Backend Routing Audit for Public Registration", () => {
        it("documents that public POST /api/auth/register currently requires Super Admin authentication (returns 401)", async () => {
            const publicRegistrationPayload = {
                organizationName: `Org_${randomSuffix()}`,
                username: `tenant_admin_${randomSuffix()}`,
                email: `tenant_${randomSuffix()}@example.com`,
                password: DEFAULT_TEST_PASSWORD,
            };

            // Attempt public registration without an auth token
            const res = await request(app)
                .post("/api/auth/register")
                .send(publicRegistrationPayload);

            // In the current implementation, /api/auth/register enforces authenticate middleware:
            // "Authentication token is required" (401)
            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/token is required/i);
        });

        it("documents that public POST /api/admin/client/onboard currently requires authentication (returns 401)", async () => {
            const clientPayload = {
                name: `Acme Corp ${randomSuffix()}`,
                email: `admin_${randomSuffix()}@acme.com`,
            };

            // Attempt public client onboarding without an auth token
            const res = await request(app)
                .post("/api/admin/client/onboard")
                .send(clientPayload);

            // In the current implementation, clientRoutes enforces router.use(authenticate):
            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/token is required/i);
        });

        it("documents that public registration cannot bypass Super Admin requirement by calling client user creation directly", async () => {
            const dummyClientId = "654321654321654321654321";
            const userPayload = {
                username: `user_${randomSuffix()}`,
                email: `user_${randomSuffix()}@example.com`,
                password: DEFAULT_TEST_PASSWORD,
                role: "client-admin",
            };

            const res = await request(app)
                .post(`/api/admin/client/${dummyClientId}/users`)
                .send(userPayload);

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/token is required/i);
        });

        it("verifies that only authenticated Super Admin can create clients and users in the current contract", async () => {
            // 1. Bootstrap Super Admin
            const adminData = {
                username: `super_admin_${randomSuffix()}`,
                email: `admin_${randomSuffix()}@platform.local`,
                password: DEFAULT_TEST_PASSWORD,
            };
            const onboardRes = await request(app)
                .post("/api/auth/onboard-super-admin")
                .send(adminData);
            expect(onboardRes.status).toBe(201);
            const adminCookie = onboardRes.headers["set-cookie"];

            // 2. Super Admin onboards Client
            const clientRes = await request(app)
                .post("/api/admin/client/onboard")
                .set("Cookie", adminCookie)
                .send({
                    name: `Tenant Alpha ${randomSuffix()}`,
                    email: `alpha_${randomSuffix()}@tenant.com`,
                });
            expect(clientRes.status).toBe(201);
            const clientId = clientRes.body.data._id;

            // 3. Super Admin creates Client Admin
            const tenantAdminUsername = `tadmin_${randomSuffix()}`;
            const userRes = await request(app)
                .post(`/api/admin/client/${clientId}/users`)
                .set("Cookie", adminCookie)
                .send({
                    username: tenantAdminUsername,
                    email: `tadmin_${randomSuffix()}@tenant.com`,
                    password: DEFAULT_TEST_PASSWORD,
                    role: "client-admin",
                });
            expect(userRes.status).toBe(201);

            // 4. Client Admin can log in
            const loginRes = await request(app)
                .post("/api/auth/login")
                .send({
                    username: tenantAdminUsername,
                    password: DEFAULT_TEST_PASSWORD,
                });
            expect(loginRes.status).toBe(200);
            expect(loginRes.body.data.role).toBe("client-admin");
            expect(loginRes.body.data.clientId).toBe(clientId);
        });
    });
});

