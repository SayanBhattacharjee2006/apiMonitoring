import dotenv from "dotenv";
dotenv.config();

const config = {
    // server
    node_env: process.env.NODE_ENV || "development",
    port: parseInt(process.env.PORT || "5000", 10),

    // MongoDB
    mongo: {
        uri:
            process.env.MONGO_URI || "mongodb://localhost:27017/api_monitoring",
        dbName: process.env.MONGO_DB_NAME || "api_monitoring",
    },

    // Postgres
    postgres: {
        host: process.env.PG_HOST || "localhost",
        port: parseInt(process.env.PG_PORT || "5432", 10),
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
        secret: process.env.JWT_SECRET || "your_jwt_secret",
        expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    },

    rateLimiter: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 1 minute
        maxRequests: parseInt(
            process.env.RATE_LIMIT_MAX_REQUESTS || "1000",
            10,
        ), // limit each IP to 100 requests per windowMs
    },

    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        expires: 24 * 60 * 60 * 1000, // 1 day
    },
};

export default config;
