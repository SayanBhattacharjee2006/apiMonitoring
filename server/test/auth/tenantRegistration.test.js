import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { app } from "../../src/server.js";
import { cleanAllDatabases } from "../setup/testDatabase.js";
import { randomSuffix, DEFAULT_TEST_PASSWORD } from "../helpers/testData.js";
import { APPLICATION_ROLES } from "../../src/shared/constants/roles.js";

    describe("Independent Public Tenant Registration (POST /api/auth/register-tenant)", () => {
        beforeEach(async () => {
            await cleanAllDatabases();
        });

        afterEach(async () => {
            await cleanAllDatabases();
        });

                describe("Public Tenant Self-Service Registration", () => {
                    it("allows a new organization and admin to register independently without Super Admin intervention", async () => {
                        const orgName = `Acme Analytics ${randomSuffix()}`;
                        const username = `acme_lead_${randomSuffix()}`;
                        const orgEmail = `contact_${randomSuffix()}@acme.io`;
                        const adminEmail = `lead_${randomSuffix()}@acme.io`;

                        const res = await request(app)
                .post("/api/auth/register-tenant")
                            .send({
                                name: orgName,
                                email: orgEmail,
                                website: "https://acme.io",
                                description: "High volume payment gateway telemetry",
                                username,
                                adminEmail,
                                password: DEFAULT_TEST_PASSWORD,
                            });

                        expect(res.status).toBe(201);
                        expect(res.body.success).toBe(true);
                        expect(res.body.data).toBeDefined();

                        const { user, client } = res.body.data;
                        expect(user.username).toBe(username);
                        expect(user.email).toBe(adminEmail);
                        expect(user.role).toBe(APPLICATION_ROLES.CLIENT_ADMIN);
                        expect(user.clientId).toBeDefined();
                        expect(user.password).toBeUndefined(); // Sensitive data omitted

                        expect(client.name).toBe(orgName);
                        expect(client.email).toBe(orgEmail);
                        expect(client.slug).toBeDefined();

                        // Verifies HTTP-only session cookie is set
                        const cookies = res.headers["set-cookie"];
                        expect(cookies).toBeDefined();
                        expect(cookies[0]).toMatch(/authToken=/);
                    });

                        it("allows newly registered tenant admin to immediately retrieve profile and log in", async () => {
                            const username = `tenant_owner_${randomSuffix()}`;
                            const email = `owner_${randomSuffix()}@tenantcorp.com`;

                            // 1. Self-register
                            const registerRes = await request(app)
                                .post("/api/auth/register-tenant")
                                .send({
                                    name: `Tenant Corp ${randomSuffix()}`,
                                    email,
                                    username,
                                    password: DEFAULT_TEST_PASSWORD,
                                });

                            expect(registerRes.status).toBe(201);
                            const authCookie = registerRes.headers["set-cookie"];

                            // 2. Profile retrieval using session cookie
                            const profileRes = await request(app)
                                .get("/api/auth/profile")
                                .set("Cookie", authCookie);

                            expect(profileRes.status).toBe(200);
                            expect(profileRes.body.data.username).toBe(username);
                            expect(profileRes.body.data.role).toBe(APPLICATION_ROLES.CLIENT_ADMIN);

                            // 3. Independent Login with username and password
                            const loginRes = await request(app)
                                .post("/api/auth/login")
                                .send({
                                    username,
                                    password: DEFAULT_TEST_PASSWORD,
                                });

                            expect(loginRes.status).toBe(200);
                            expect(loginRes.body.data.role).toBe(APPLICATION_ROLES.CLIENT_ADMIN);
                        });

                        it("strictly enforces client-admin role and prevents privilege escalation", async () => {
                            const username = `hacker_${randomSuffix()}`;

                            // Attempt to self-assign super-admin
                            const res = await request(app)
                .post("/api/auth/register-tenant")
                                .send({
                                    name: `Malicious Tenant ${randomSuffix()}`,
                                    email: `attacker_${randomSuffix()}@hacker.io`,
                                    username,
                                    password: DEFAULT_TEST_PASSWORD,
                                    role: APPLICATION_ROLES.SUPER_ADMIN, // should be ignored / forced to client-admin
                                });

                            expect(res.status).toBe(201);
                            expect(res.body.data.user.role).toBe(APPLICATION_ROLES.CLIENT_ADMIN);
                            expect(res.body.data.user.role).not.toBe(APPLICATION_ROLES.SUPER_ADMIN);
                        });

                            it("rejects duplicate username with 409 Conflict", async () => {
                                const duplicateUsername = `unique_user_${randomSuffix()}`;

                                // First registration
                                const res1 = await request(app)
                                    .post("/api/auth/register-tenant")
                                    .send({
                                        name: `Tenant One ${randomSuffix()}`,
                                        email: `one_${randomSuffix()}@domain.com`,
                                        username: duplicateUsername,
                                        password: DEFAULT_TEST_PASSWORD,
                                    });
                                expect(res1.status).toBe(201);

                                // Second registration with same username
                                const res2 = await request(app)
                                    .post("/api/auth/register-tenant")
                                    .send({
                                        name: `Tenant Two ${randomSuffix()}`,
                                        email: `two_${randomSuffix()}@domain.com`,
                                        username: duplicateUsername,
                                        password: DEFAULT_TEST_PASSWORD,
                                    });

                                expect(res2.status).toBe(409);
                                expect(res2.body.success).toBe(false);
                                expect(res2.body.message).toMatch(/Username already exists/i);
                            });

                            it("rejects registration when required fields are missing with 400 Bad Request", async () => {
                                const res = await request(app)
                .post("/api/auth/register-tenant")
                                    .send({
                                        name: "Acme",
                                        // missing email, username, password
                                    });

                                expect(res.status).toBe(400);
                                expect(res.body.success).toBe(false);
                                expect(res.body.message).toMatch(/Validation Error/i);
                            });

                                it("enables the new tenant to create API keys and immediately ingest monitoring hits", async () => {
                                    // 1. Self-register
                                    const registerRes = await request(app)
                                        .post("/api/auth/register-tenant")
                                        .send({
                                            name: `Production Monitored App ${randomSuffix()}`,
                                            email: `ops_${randomSuffix()}@monitoredapp.io`,
                                            username: `lead_sre_${randomSuffix()}`,
                                            password: DEFAULT_TEST_PASSWORD,
                                        });

                                    expect(registerRes.status).toBe(201);
                                    const authCookie = registerRes.headers["set-cookie"];
                                    const clientId = registerRes.body.data.client.id;

                                    // 2. Generate API key as newly minted tenant admin
                                    const apiKeyRes = await request(app)
                                        .post(`/api/admin/client/${clientId}/api/keys`)
                                        .set("Cookie", authCookie)
                                        .send({
                                            name: "Production Ingest Key",
                                            permissions: ["ingest", "read"],
                                        });

                                    expect(apiKeyRes.status).toBe(201);
                                    const apiKey = apiKeyRes.body.data.keyValue;
                                    expect(apiKey).toMatch(/^apim_/);

                                    // 3. Immediately ingest a telemetry hit with the new key
                                    const hitRes = await request(app)
                                        .post("/api/hit")
                                        .set("x-api-key", apiKey)
                                        .send({
                                            serviceName: "checkout-service",
                                            endpoint: "/api/v1/checkout",
                                            method: "POST",
                                            statusCode: 200,
                                            latencyMs: 42,
                                        });

                                    expect(hitRes.status).toBe(202);
                                    expect(hitRes.body.success).toBe(true);
                                });
                            });

                            describe("Super Admin Provisions Architecture Continuity", () => {
                                it("verifies that internal POST /api/auth/register still requires Super Admin", async () => {
                                    const res = await request(app)
                                        .post("/api/auth/register")
                                        .send({
                                            username: `user_${randomSuffix()}`,
                                            email: `user_${randomSuffix()}@corp.local`,
                                            password: DEFAULT_TEST_PASSWORD,
                                            role: "client-viewer",
                                            clientId: "654321654321654321654321",
                                        });

                                    expect(res.status).toBe(401);
                                    expect(res.body.message).toMatch(/token is required/i);
                                });
                            });
                        });
