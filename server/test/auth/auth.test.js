import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { app } from "../../src/server.js";
import { cleanAllDatabases } from "../setup/testDatabase.js";
import {
    generateSuperAdminData,
    DEFAULT_TEST_PASSWORD,
    randomSuffix,
} from "../helpers/testData.js";
import { extractAuthData, onboardSuperAdmin } from "../helpers/auth.js";

describe("Phase 5: Authentication Flow (POST /api/auth/*)", () => {
    beforeEach(async () => {
        await cleanAllDatabases();
    });

    afterEach(async () => {
        await cleanAllDatabases();
    });

    describe("Super Admin Onboarding (POST /api/auth/onboard-super-admin)", () => {
        it("allows onboarding the first Super Admin and returns auth cookie", async () => {
            const adminData = generateSuperAdminData();

            const res = await request(app)
                .post("/api/auth/onboard-super-admin")
                .send(adminData);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.username).toBe(adminData.username);
            expect(res.body.data.email).toBe(adminData.email);
            expect(res.body.data.role).toBe("super-admin");
            expect(res.body.data.password).toBeUndefined(); // Password must not be exposed

            // Verify Set-Cookie header contains authToken
            const auth = extractAuthData(res);
            expect(auth.token).toBeTruthy();
            expect(auth.cookie).toMatch(/^authToken=.+/);
        });

        it("rejects duplicate onboarding when a Super Admin already exists", async () => {
            const firstAdmin = generateSuperAdminData();
            await request(app)
                .post("/api/auth/onboard-super-admin")
                .send(firstAdmin);

            const secondAdmin = generateSuperAdminData();
            const res = await request(app)
                .post("/api/auth/onboard-super-admin")
                .send(secondAdmin);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/already exists/i);
        });

        it("rejects onboarding when required fields are missing", async () => {
            const res = await request(app)
                .post("/api/auth/onboard-super-admin")
                .send({
                    username: "only_user",
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toEqual(
                expect.arrayContaining([
                    expect.stringMatching(/password is required/i),
                    expect.stringMatching(/email is required/i),
                ])
            );
        });

        it("rejects onboarding with a weak password", async () => {
            const weakAdmin = {
                username: `admin_${randomSuffix()}`,
                email: `admin_${randomSuffix()}@example.com`,
                password: "123", // Too short & weak
            };

            const res = await request(app)
                .post("/api/auth/onboard-super-admin")
                .send(weakAdmin);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe("User Login (POST /api/auth/login)", () => {
        it("allows valid Super Admin to log in and receive auth cookie", async () => {
            const adminData = generateSuperAdminData();
            await onboardSuperAdmin(app, adminData);

            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    username: adminData.username,
                    password: adminData.password,
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.username).toBe(adminData.username);
            expect(res.body.data.password).toBeUndefined();

            const auth = extractAuthData(res);
            expect(auth.token).toBeTruthy();
            expect(auth.cookie).toMatch(/^authToken=.+/);
        });

        it("rejects login with incorrect password", async () => {
            const adminData = generateSuperAdminData();
            await onboardSuperAdmin(app, adminData);

            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    username: adminData.username,
                    password: "WrongPassword123!",
                });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/invalid credentials/i);
        });

        it("rejects login for non-existent user", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    username: "ghost_user_999",
                    password: DEFAULT_TEST_PASSWORD,
                });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/invalid credentials/i);
        });

        it("rejects login when username or password is missing", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe("Profile Access (GET /api/auth/profile)", () => {
        it("allows profile retrieval using auth cookie", async () => {
            const admin = await onboardSuperAdmin(app);

            const res = await request(app)
                .get("/api/auth/profile")
                .set("Cookie", admin.cookie);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.username).toBe(admin.credentials.username);
            expect(res.body.data.email).toBe(admin.credentials.email);
            expect(res.body.data.role).toBe("super-admin");
        });

        it("allows profile retrieval using Authorization Bearer token header", async () => {
            const admin = await onboardSuperAdmin(app);

            const res = await request(app)
                .get("/api/auth/profile")
                .set("Authorization", admin.bearer);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.username).toBe(admin.credentials.username);
        });

        it("rejects profile access without any authentication token", async () => {
            const res = await request(app).get("/api/auth/profile");

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/token is required/i);
        });

        it("rejects profile access with an invalid/malformed token", async () => {
            const res = await request(app)
                .get("/api/auth/profile")
                .set("Authorization", "Bearer invalid.token.payload");

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/invalid token/i);
        });
    });

    describe("User Logout (POST /api/auth/logout)", () => {
        it("clears the auth cookie on logout", async () => {
            const admin = await onboardSuperAdmin(app);

            const res = await request(app)
                .post("/api/auth/logout")
                .set("Cookie", admin.cookie);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // Verify Set-Cookie header clears authToken
            const setCookie = res.headers["set-cookie"];
            expect(setCookie).toBeDefined();
            const cookieStr = Array.isArray(setCookie) ? setCookie.join(";") : setCookie;
            expect(cookieStr).toMatch(/authToken=;/);
        });
    });
});
