import dotenv from "dotenv";
dotenv.config();

const node_env = process.env.NODE_ENV || "development";
const isProduction = node_env === "production";
const serviceRole = process.env.SERVICE_ROLE || "api";
const isConsumer = serviceRole === "consumer";

// Explicit set of disallowed placeholder, dev, and test secrets in production
export const DISALLOWED_PRODUCTION_SECRETS = new Set([
    "your_jwt_secret",
    "default_jwt_secret",
    "default_bootstrap_secret",
    "secret",
    "jwt_secret",
    "bootstrap_secret",
    "changeme",
    "password",
    "admin",
]);

/**
 * Validates whether a secret value is unsafe or unacceptable for production use.
 * Rejects missing values, values below minLength, known test/dev strings,
 * placeholder prefixes (your_, replace_me, example_), and dev/test markers.
 *
 * @param {string} val - The secret value to validate.
 * @param {number} minLength - Minimum required character length.
 * @returns {boolean} - True if invalid/rejected, false if secure and valid.
 */
export function isInvalidProductionSecret(val, minLength = 32) {
    if (!val || typeof val !== "string") return true;
    const trimmed = val.trim();
    if (trimmed.length < minLength) return true;
    const lower = trimmed.toLowerCase();
    if (DISALLOWED_PRODUCTION_SECRETS.has(lower)) return true;

    // Reject obvious placeholder prefixes
    if (
        lower.startsWith("your_") ||
        lower.startsWith("replace_me") ||
        lower.startsWith("example_") ||
        lower.startsWith("sample_") ||
        lower.startsWith("placeholder") ||
        lower.startsWith("test_") ||
        lower.startsWith("dev_")
    ) {
        return true;
    }

    // Reject development, test, example, and placeholder markers anywhere in the secret
    if (
        lower.includes("test") ||
        lower.includes("dev") ||
        lower.includes("placeholder") ||
        lower.includes("example") ||
        lower.includes("default") ||
        lower.includes("changeme") ||
        lower.includes("replace_me") ||
        lower.includes("sample")
    ) {
        return true;
    }

    return false;
}

/**
 * Validates secrets based on environment and process role.
 */
export function validateProductionConfig({
    nodeEnv = node_env,
    role = serviceRole,
    jwtSecret = process.env.JWT_SECRET,
    bootstrapSecret = process.env.SUPER_ADMIN_BOOTSTRAP_SECRET,
} = {}) {
    if (nodeEnv !== "production") return;

    // Consumers do not serve authentication endpoints or issue/verify JWTs
    if (role === "consumer") return;

    // API process strictly requires valid, strong production secrets
    if (isInvalidProductionSecret(jwtSecret, 32)) {
        throw new Error(
            "[FATAL CONFIG ERROR] JWT_SECRET must be explicitly configured with at least 32 characters in production. Insecure defaults, test tokens, and development secrets are prohibited."
        );
    }
    if (isInvalidProductionSecret(bootstrapSecret, 16)) {
        throw new Error(
            "[FATAL CONFIG ERROR] SUPER_ADMIN_BOOTSTRAP_SECRET must be explicitly configured with at least 16 characters in production. Insecure defaults, test tokens, and development secrets are prohibited."
        );
    }
}

// Execute production configuration validation at boot time
validateProductionConfig();

const config = {
    // server
    node_env,
    serviceRole,
    port: Number.parseInt(process.env.PORT || "5000", 10),

    // Super Admin bootstrap security (only for API process)
    bootstrapSecret: isConsumer
        ? null
        : (process.env.SUPER_ADMIN_BOOTSTRAP_SECRET ||
            (isProduction ? null : "dev_test_only_bootstrap_secret_never_use_in_prod")),

    // MongoDB
    mongo: {
        uri:
            process.env.MONGO_URI || "mongodb://localhost:27017/api_monitoring",
        dbName: process.env.MONGO_DB_NAME || "api_monitoring",
    },

    // Postgres
    postgres: {
        host: process.env.PG_HOST || "localhost",
        port: Number.parseInt(process.env.PG_PORT || "5432", 10),
        database: process.env.PG_DATABASE || "api_monitoring",
        user: process.env.PG_USER || "postgres",
        password: process.env.PG_PASSWORD || "postgres",
    },

    // rabbitMQ
    rabbitMQ: {
        url: process.env.RABBITMQ_URL || "amqp://127.0.0.1:5672",
        queue: process.env.RABBITMQ_QUEUE || "api_monitoring_queue",
        publisherConfirms:
            process.env.RABBITMQ_PUBLISHER_CONFIRMS === "true" || false,
        retryAttempts: parseInt(process.env.RABBITMQ_RETRY_ATTEMPTS || "3", 10),
        retryDelay: parseInt(process.env.RABBITMQ_RETRY_DELAY || "1000", 10),
    },

    jwt: {
        secret: isConsumer
            ? null
            : (process.env.JWT_SECRET ||
                (isProduction ? null : "dev_test_only_jwt_secret_never_use_in_production_32chars")),
        expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    },

    rateLimiter: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes
        maxRequests: parseInt(
            process.env.RATE_LIMIT_MAX_REQUESTS || "1000",
            10,
        ),
    },

    authRateLimiter: {
        windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes
        maxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || "100", 10),
    },

    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        expires: 24 * 60 * 60 * 1000, // 1 day
        path: "/",
    },
};

export default config;
