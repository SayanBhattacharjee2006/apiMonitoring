import mongoose from 'mongoose';
import config from "./index.js";
import logger from "./logger.js";

/**
 * MongoDB database manager/connector
 * @module mongodb
 * @requires module:config
 * @requires module:logger
 */

class MongoConnection {
    constructor() {
        this.connection = null;
    }

    /**
     * Connect to MongoDB
     * @returns {Promise<mongoose.Connection>}
     */
    async connect() {
        try {
            if (this.connection) {
                logger.info("Already connected to MongoDB");
                return this.connection;
            }

            await mongoose.connect(config.mongo.uri, {
                dbName: config.mongo.dbName,
                serverSelectionTimeoutMS:
                    process.env.NODE_ENV === "test" ? 2000 : 30000,
            });

            this.connection = mongoose.connection;

            logger.info("Connected to MongoDB at", config.mongo.uri);

            this.connection.on("error", (error) => {
                logger.error("MongoDB connection error:", error);
            });

            this.connection.on("disconnected", () => {
                logger.info("Disconnected from MongoDB");
            });

            return this.connection;
        } catch (error) {
            logger.error("Failed to connect to MongoDB:", error);
            throw error;
        }
    }

    getConnection() {
        return this.connection;
    }

    async disconnect() {
        try {
            if (this.connection) {
                await mongoose.disconnect();
                this.connection = null;
                logger.info("Disconnected from MongoDB");
            }
        } catch (error) {
            logger.error("Error disconnecting from MongoDB:", error);
            throw error;
        }
    }

    isConnected() {
        return mongoose.connection.readyState === 1;
    }
}

const mongodb = new MongoConnection();
export default mongodb;
