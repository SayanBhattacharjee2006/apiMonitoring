import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { app } from "../../src/server.js";
import { cleanAllDatabases } from "../setup/testDatabase.js";
import { onboardSuperAdmin, loginUser } from "../helpers/auth.js";
import { createTestClient, createTestClientUser } from "../helpers/client.js";
import { generateClientData, generateClientUserData, randomSuffix } from "../helpers/testData.js";

describe("Phase 7/8: Client User Management (POST /api/admin/client/:clientId/users)", () => {
    let superAdmin;
    let clientA;
    let clientB;

    beforeEach(async () => {
        await cleanAllDatabases();
        superAdmin = await onboardSuperAdmin(app);
        clientA = await createTestClient(app, superAdmin, generateClientData());
        clientB = await createTestClient(app, superAdmin, generateClientData());
    });

    afterEach(async () => {
        await cleanAllDatabases();
    });

    it("allows Super Admin to create a client-admin with elevated permissions", async () => {
        const userData = generateClientUserData("client-admin");
        const { user } = await createTestClientUser(app, superAdmin, clientA._id, userData);

        expect(user).toBeDefined();
        expect(user.username).toBe(userData.username);
        expect(user.role).toBe("client-admin");
        expect(user.clientId.toString()).toBe(clientA._id.toString());
        expect(user.password).toBeUndefined();

        // Verify client-admin permissions
        expect(user.permissions.canCreateApiKeys).toBe(true);
        expect(user.permissions.canManageUsers).toBe(true);
        expect(user.permissions.canViewAnalytics).toBe(true);
        expect(user.permissions.canExportData).toBe(true);
    });

    it("allows Super Admin to create a client-viewer with read-only permissions", async () => {
        const userData = generateClientUserData("client-viewer");
        const { user } = await createTestClientUser(app, superAdmin, clientA._id, userData);

        expect(user).toBeDefined();
        expect(user.role).toBe("client-viewer");
        expect(user.permissions.canCreateApiKeys).toBe(false);
        expect(user.permissions.canManageUsers).toBe(false);
        expect(user.permissions.canViewAnalytics).toBe(true);
        expect(user.permissions.canExportData).toBe(false);
    });

    it("allows Client Admin to create a user inside their own client", async () => {
        // Create Client A Admin
        const adminAData = generateClientUserData("client-admin");
        await createTestClientUser(app, superAdmin, clientA._id, adminAData);

        // Login as Client A Admin
        const adminA = await loginUser(app, adminAData.username, adminAData.password);

        // Client A Admin creates a Viewer for Client A
        const viewerData = generateClientUserData("client-viewer");
        const { user } = await createTestClientUser(app, adminA, clientA._id, viewerData);

        expect(user.role).toBe("client-viewer");
        expect(user.clientId.toString()).toBe(clientA._id.toString());
    });

    it("prevents Client A Admin from creating a user for Client B (Cross-Tenant Isolation)", async () => {
        // Create Client A Admin
        const adminAData = generateClientUserData("client-admin");
        await createTestClientUser(app, superAdmin, clientA._id, adminAData);
        const adminA = await loginUser(app, adminAData.username, adminAData.password);

        // Client A Admin attempts to create user for Client B
        const intruderUser = generateClientUserData("client-viewer");
        const res = await request(app)
            .post(`/api/admin/client/${clientB._id}/users`)
            .set("Cookie", adminA.cookie)
            .send(intruderUser);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/access denied/i);
    });

    it("rejects user creation with an invalid role", async () => {
        const invalidData = generateClientUserData("invalid-role");
        const res = await request(app)
            .post(`/api/admin/client/${clientA._id}/users`)
            .set("Cookie", superAdmin.cookie)
            .send(invalidData);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/invalid client role/i);
    });

    it("rejects user creation for non-existent client with 404", async () => {
        const fakeClientId = new mongoose.Types.ObjectId().toString();
        const userData = generateClientUserData("client-viewer");

        const res = await request(app)
            .post(`/api/admin/client/${fakeClientId}/users`)
            .set("Cookie", superAdmin.cookie)
            .send(userData);

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/client not found/i);
    });
});
