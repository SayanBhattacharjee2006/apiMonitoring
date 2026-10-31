import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { beforeAll } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env.test"), override: true });
process.env.NODE_ENV = "test";

import { connectDatabases, checkDatabasesHealth } from "./testDatabase.js";
import { checkRabbitMQHealth } from "./testRabbitMQ.js";

// File-level setup hook
beforeAll(async () => {
    // Pure unit and configuration security tests do not require live database or queue infrastructure
    const testPath = expect.getState()?.testPath || "";
    if (testPath.includes("configSecurity")) {
        return;
    }

    // 1. Verify MongoDB & Postgres
    const dbHealth = await checkDatabasesHealth();
    if (!dbHealth.ok) {
        throw new Error(
            `\n[INFRASTRUCTURE ERROR] Database connection failed!\n` +
            `Ensure MongoDB (port 27017) and PostgreSQL (port 5433) are running.\n` +
            `Details: ${dbHealth.error}\n`
        );
    }

    // 2. Verify RabbitMQ
    const rmqHealth = await checkRabbitMQHealth();
    if (!rmqHealth.ok) {
        throw new Error(
            `\n[INFRASTRUCTURE ERROR] RabbitMQ connection failed!\n` +
            `Ensure RabbitMQ (port 5672) is running.\n` +
            `Details: ${rmqHealth.error}\n`
        );
    }
});
