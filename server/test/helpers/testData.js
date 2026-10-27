import crypto from "crypto";

export function randomSuffix() {
    return crypto.randomBytes(4).toString("hex");
}

export const DEFAULT_TEST_PASSWORD = "TestP@ssw0rd!123";

/**
 * Generate unique Super Admin test credentials
 */
export function generateSuperAdminData(suffix = randomSuffix()) {
    return {
        username: `test_admin_${suffix}`,
        email: `test_admin_${suffix}@example.com`,
        password: DEFAULT_TEST_PASSWORD,
    };
}

/**
 * Generate unique Client test data
 */
export function generateClientData(suffix = randomSuffix()) {
    return {
        name: `Test Client ${suffix}`,
        email: `client_${suffix}@example.com`,
        description: `Automated test client ${suffix}`,
        website: `https://test-client-${suffix}.example.com`,
    };
}

/**
 * Generate unique Client User test data
 */
export function generateClientUserData(role = "client-admin", suffix = randomSuffix()) {
    return {
        username: `test_user_${suffix}`,
        email: `user_${suffix}@example.com`,
        password: DEFAULT_TEST_PASSWORD,
        role,
    };
}

/**
 * Generate unique API Key test data
 */
export function generateApiKeyData(suffix = randomSuffix()) {
    return {
        name: `test-api-key-${suffix}`,
        description: `Test API Key ${suffix}`,
        environment: "testing",
    };
}

/**
 * Generate valid API Hit payload
 */
export function generateApiHitPayload(suffix = randomSuffix()) {
    return {
        serviceName: `test-service-${suffix}`,
        endpoint: `/api/v1/resource-${suffix}`,
        method: "GET",
        statusCode: 200,
        latencyMs: 45.5,
    };
}
