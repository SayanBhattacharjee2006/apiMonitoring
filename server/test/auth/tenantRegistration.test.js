import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { app } from "../../src/server.js";
import { cleanAllDatabases } from "../setup/testDatabase.js";
import { randomSuffix, DEFAULT_TEST_PASSWORD } from "../helpers/testData.js";
import { APPLICATION_ROLES } from "../../src/shared/constants/roles.js";
import User from "../../src/shared/models/User.js";
import Client from "../../src/shared/models/Client.js";

const VALID_STRONG_PASSWORD = "ValidP@ssw0rd2026!";

describe("Multi-Tenant Self-Service Registration, Bootstrap & Revocation Verification", () => {
    beforeEach(async () => {
        await cleanAllDatabases();
    });

    afterEach(async () => {
        await cleanAllDatabases();
    });

    describe("2.1 Super Admin Bootstrap Problem Resolution", () => {
        it("allows onboarding Super Admin when no users exist (initial cluster setup)", async () => {
            const adminData = {
                username: `root_admin_${randomSuffix()}`,
                email: `root_${randomSuffix()}@platform.local`,
                password: VALID_STRONG_PASSWORD,
            };

            const res = await request(app)
                .post("/api/auth/onboard-super-admin")
                .send(adminData);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.role).toBe(APPLICATION_ROLES.SUPER_ADMIN);
            expect(res.headers["set-cookie"]).toBeDefined();
        });

        it("forbids unauthorized Super Admin onboarding when tenant registered first (returns 403)", async () => {
            // 1. A tenant registers first
            await request(app)
                .post("/api/auth/register-tenant")
                .send({
                    name: `Acme Inc ${randomSuffix()}`,
                    email: `contact_${randomSuffix()}@acme.com`,
                    username: `acme_lead_${randomSuffix()}`,
                    password: VALID_STRONG_PASSWORD,
                });

            // 2. An unauthorized caller attempts to bootstrap Super Admin without secret
            const unauthRes = await request(app)
                .post("/api/auth/onboard-super-admin")
                .send({
                    username: `intruder_admin_${randomSuffix()}`,
                    email: `intruder_${randomSuffix()}@hacker.io`,
                    password: VALID_STRONG_PASSWORD,
                });

            expect(unauthRes.status).toBe(403);
            expect(unauthRes.body.success).toBe(false);
            expect(unauthRes.body.message).toMatch(/valid bootstrap secret required/i);
        });

        it("allows authorized Super Admin onboarding with valid bootstrap secret after tenant has registered", async () => {
            // 1. Tenant registers first
            await request(app)
                .post("/api/auth/register-tenant")
                .send({
                    name: `Beta Corp ${randomSuffix()}`,
                    email: `ops_${randomSuffix()}@beta.io`,
                    username: `beta_admin_${randomSuffix()}`,
                    password: VALID_STRONG_PASSWORD,
                });

            // 2. Authorized setup using the configured test bootstrap secret
            const bootstrapSecret = process.env.SUPER_ADMIN_BOOTSTRAP_SECRET || "test-bootstrap-secret-key-1234";

            const authRes = await request(app)
                .post("/api/auth/onboard-super-admin")
                .set("x-bootstrap-secret", bootstrapSecret)
                .send({
                    username: `authorized_admin_${randomSuffix()}`,
                    email: `auth_root_${randomSuffix()}@platform.local`,
                    password: VALID_STRONG_PASSWORD,
                });

            expect(authRes.status).toBe(201);
            expect(authRes.body.success).toBe(true);
            expect(authRes.body.data.role).toBe(APPLICATION_ROLES.SUPER_ADMIN);
        });

        it("strictly rejects subsequent Super Admin creation once a Super Admin exists (returns 400)", async () => {
            // 1. Create first Super Admin
            await request(app)
                .post("/api/auth/onboard-super-admin")
                .send({
                    username: `first_admin_${randomSuffix()}`,
                    email: `first_${randomSuffix()}@platform.local`,
                    password: VALID_STRONG_PASSWORD,
                });

            // 2. Attempt duplicate creation
            const res = await request(app)
                .post("/api/auth/onboard-super-admin")
                .send({
                    username: `second_admin_${randomSuffix()}`,
                    email: `second_${randomSuffix()}@platform.local`,
                    password: VALID_STRONG_PASSWORD,
                    bootstrapSecret: "test-bootstrap-secret-key-1234",
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/Super admin already exists/i);
        });
    });

    describe("2.4 Inactive User and Tenant Token Revocation", () => {
        it("rejects protected operations when user has been deactivated (401)", async () => {
            // 1. Register tenant
            const regRes = await request(app)
                .post("/api/auth/register-tenant")
                .send({
                    name: `Deactivate Co ${randomSuffix()}`,
                    email: `info_${randomSuffix()}@deactivate.com`,
                    username: `deact_user_${randomSuffix()}`,
                    password: VALID_STRONG_PASSWORD,
                });

            expect(regRes.status).toBe(201);
            const authCookie = regRes.headers["set-cookie"];
            const userId = regRes.body.data.user.id || regRes.body.data.user._id;

            // 2. Deactivate the user directly in MongoDB
            await User.findByIdAndUpdate(userId, { isActive: false });

            // 3. User attempts to reuse previous valid session token
            const res = await request(app)
                .get("/api/auth/profile")
                .set("Cookie", authCookie);

            expect(res.status).toBe(401);
            expect(res.body.message).toMatch(/inactive or not found/i);
        });

        it("rejects protected operations when tenant organization is inactive/suspended (403)", async () => {
            // 1. Register tenant
            const regRes = await request(app)
                .post("/api/auth/register-tenant")
                .send({
                    name: `Suspended Org ${randomSuffix()}`,
                    email: `info_${randomSuffix()}@suspended.com`,
                    username: `susp_user_${randomSuffix()}`,
                    password: VALID_STRONG_PASSWORD,
                });

            expect(regRes.status).toBe(201);
            const authCookie = regRes.headers["set-cookie"];
            const clientId = regRes.body.data.client.id || regRes.body.data.client._id;

            // 2. Suspend tenant client in MongoDB
            await Client.findByIdAndUpdate(clientId, { isActive: false });

            // 3. Tenant admin attempts to access profile
            const res = await request(app)
                .get("/api/auth/profile")
                .set("Cookie", authCookie);

            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/organization is inactive or suspended/i);
        });
    });

    describe("2.5 Password Policy Alignment & Enforcement", () => {
        it("rejects registration with short password (< 8 chars)", async () => {
            const res = await request(app)
                .post("/api/auth/register-tenant")
                .send({
                    name: `Short Pass Org ${randomSuffix()}`,
                    email: `short_${randomSuffix()}@test.com`,
                    username: `short_user_${randomSuffix()}`,
                    password: "Short1!", // 7 characters
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/Validation Error/i);
            const errList = res.body.error || res.body.errors || [];
            expect(errList[0]).toMatch(/at least 8 characters/i);
        });

        it("rejects registration with password missing symbols or numbers", async () => {
            const res = await request(app)
                .post("/api/auth/register-tenant")
                .send({
                    name: `NoSymbol Org ${randomSuffix()}`,
                    email: `nosymbol_${randomSuffix()}@test.com`,
                    username: `nosym_user_${randomSuffix()}`,
                    password: "PasswordWithoutSymbol1", // No special char
                });

            expect(res.status).toBe(400);
            const errList = res.body.error || res.body.errors || [];
            expect(errList[0]).toMatch(/special character/i);
        });

        it("rejects common dictionary passwords even if length matches", async () => {
            const res = await request(app)
                .post("/api/auth/register-tenant")
                .send({
                    name: `Weak Pass Org ${randomSuffix()}`,
                    email: `weak_${randomSuffix()}@test.com`,
                    username: `weak_user_${randomSuffix()}`,
                    password: "password123",
                });

            expect(res.status).toBe(400);
            const errList = res.body.error || res.body.errors || [];
            expect(errList[0]).toMatch(/too weak/i);
        });

        it("accepts registration with a compliant strong password", async () => {
            const res = await request(app)
                .post("/api/auth/register-tenant")
                .send({
                    name: `Strong Org ${randomSuffix()}`,
                    email: `strong_${randomSuffix()}@test.com`,
                    username: `strong_user_${randomSuffix()}`,
                    password: VALID_STRONG_PASSWORD,
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });
    });

    describe("Multi-Tenant Isolation & Telemetry Workflow", () => {
        it("verifies two independent tenants operate with complete data isolation", async () => {
            // 1. Register Tenant Alpha
            const alphaRes = await request(app)
                .post("/api/auth/register-tenant")
                .send({
                    name: `Alpha Payments ${randomSuffix()}`,
                    email: `ops_${randomSuffix()}@alpha.io`,
                    username: `alpha_admin_${randomSuffix()}`,
                    password: VALID_STRONG_PASSWORD,
                });
            expect(alphaRes.status).toBe(201);
            const alphaCookie = alphaRes.headers["set-cookie"];
            const alphaClientId = alphaRes.body.data.client.id;

            // 2. Register Tenant Beta
            const betaRes = await request(app)
                .post("/api/auth/register-tenant")
                .send({
                    name: `Beta Logistics ${randomSuffix()}`,
                    email: `ops_${randomSuffix()}@beta.io`,
                    username: `beta_admin_${randomSuffix()}`,
                    password: VALID_STRONG_PASSWORD,
                });
            expect(betaRes.status).toBe(201);
            const betaCookie = betaRes.headers["set-cookie"];
            const betaClientId = betaRes.body.data.client.id;

            // 3. Tenant Alpha creates an API key
            const alphaKeyRes = await request(app)
                .post(`/api/admin/client/${alphaClientId}/api/keys`)
                .set("Cookie", alphaCookie)
                .send({ name: "Alpha Ingest Key" });
            expect(alphaKeyRes.status).toBe(201);
            const alphaApiKey = alphaKeyRes.body.data.keyValue;

            // 4. Cross-Tenant Attempt: Tenant Alpha tries to create key for Tenant Beta
            const illegalKeyRes = await request(app)
                .post(`/api/admin/client/${betaClientId}/api/keys`)
                .set("Cookie", alphaCookie)
                .send({ name: "Malicious Key" });
            expect(illegalKeyRes.status).toBe(403);

            // 5. Cross-Tenant Attempt: Tenant Alpha tries to list Tenant Beta keys
            const illegalListRes = await request(app)
                .get(`/api/admin/client/${betaClientId}/api/keys`)
                .set("Cookie", alphaCookie);
            expect(illegalListRes.status).toBe(403);

            // 6. Ingestion: Tenant Alpha ingests monitoring hit
            const hitRes = await request(app)
                .post("/api/hit")
                .set("x-api-key", alphaApiKey)
                .send({
                    serviceName: "alpha-checkout",
                    endpoint: "/v1/pay",
                    method: "POST",
                    statusCode: 200,
                    latencyMs: 38,
                });
            expect(hitRes.status).toBe(202);
        });
    });
});
