import mongoose from "mongoose";
import config from "../../src/shared/config/index.js";
import postgres from "../../src/shared/config/postgres.js";
import mongodb from "../../src/shared/config/mongodb.js";
import User from "../../src/shared/models/User.js";
import Client from "../../src/shared/models/Client.js";
import ApiKey from "../../src/shared/models/Apikey.js";
import ApiHits from "../../src/shared/models/ApiHits.js";

/**
 * Ensure database connections for testing
 */
export async function connectDatabases() {
    // Connect to test MongoDB
    if (!mongodb.getConnection() || mongoose.connection.readyState === 0) {
        await mongodb.connect();
    }
    await User.syncIndexes();

    // Test Postgres connection to test database
    await postgres.testConnection();
}

/**
 * Health check to verify databases are accessible before running tests
 */
export async function checkDatabasesHealth() {
    try {
        await connectDatabases();
        return { ok: true };
    } catch (error) {
        return {
            ok: false,
            error: error.message,
            stack: error.stack,
        };
    }
}

/**
 * Clean all test collections in MongoDB
 */
export async function cleanMongo() {
    if (mongoose.connection.readyState !== 1) {
        await mongodb.connect();
    }
    await Promise.all([
        User.deleteMany({}),
        Client.deleteMany({}),
        ApiKey.deleteMany({}),
        ApiHits.deleteMany({}),
    ]);
}

/**
 * Clean all rows from PostgreSQL test tables
 */
export async function cleanPostgres() {
    try {
        await postgres.query("TRUNCATE TABLE endpoint_metrics, processed_events RESTART IDENTITY CASCADE");
    } catch (err) {
        // Table might be empty or query might vary
        try {
            await postgres.query("DELETE FROM endpoint_metrics");
        } catch (e) {
            // ignore
        }
        try {
            await postgres.query("DELETE FROM processed_events");
        } catch (e) {
            // ignore
        }
    }
}

/**
 * Clean all test data from both databases
 */
export async function cleanAllDatabases() {
    await Promise.all([cleanMongo(), cleanPostgres()]);
}

/**
 * Close database connections
 */
export async function closeDatabases() {
    try {
        await mongodb.disconnect();
    } catch (e) {
        // ignore
    }
    try {
        await postgres.close();
    } catch (e) {
        // ignore
    }
}
