import dotenv from "dotenv";
dotenv.config();

const node_env = process.env.NODE_ENV || "development";
const isProduction = node_env === "production";

// Production secret validation: fail safely and loudly if secrets are missing
if (isProduction) {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "your_jwt_secret") {
        throw new Error(
            "[FATAL CONFIG ERROR] JWT_SECRET must be explicitly configured in production. Insecure fallbacks are prohibited."
        );
    }
    if (!process.env.SUPER_ADMIN_BOOTSTRAP_SECRET || process.env.SUPER_ADMIN_BOOTSTRAP_SECRET === "adm_bootstrap_secret_default") {
        throw new Error(
            "[FATAL CONFIG ERROR] SUPER_ADMIN_BOOTSTRAP_SECRET must be explicitly configured in production. Insecure fallbacks are prohibited."
        );
    }
}

const config = {
    // server
    node_env,
    port: Number.parseInt(process.env.PORT || "5000", 10),

    // Super Admin bootstrap security
    bootstrapSecret: process.env.SUPER_ADMIN_BOOTSTRAP_SECRET || (isProduction ? null : "dev_test_only_bootstrap_secret_never_use_in_prod"),

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
        secret: process.env.JWT_SECRET || (isProduction ? null : "dev_test_only_jwt_secret_never_use_in_production_32chars"),
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
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        expires: 24 * 60 * 60 * 1000, // 1 day
        path: "/",
    },
};

export default config;
