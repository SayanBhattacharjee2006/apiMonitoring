import BaseClientRepository from "./BaseClientRepository.js";
import logger from "../../../shared/config/logger.js";
import Client from "../../../shared/models/Client.js";

/**
 * MongoClientRepository class to handle database operations related to clients
 * This class extends the BaseClientRepository and provides implementations for creating clients, finding clients by ID or slug, and finding/counting clients based on filters. It uses Mongoose for database interactions and includes error handling and logging for each operation.
 */
class MongoClientRepository extends BaseClientRepository {
    constructor() {
        super(Client);
    }

    /**
     * Creates a new client
     * @param {Object} clientData
     * @returns {Promise<Object>}
     */
    async create(clientData) {
        try {
            const client = new this.model(clientData);
            await client.save();

            logger.info("client successfully created in the database", {
                clientId: client._id,
                slug: client.slug,
            });

            return client;
        } catch (error) {
            logger.error("Error creating the client in database", error);
            throw new error();
        }
    }

    /**
     * Find a client by ID
     * @param {string} clientId - The ID of the client
     * @returns {Promise<Object|null>} - The client object or null if not found
     */
    async findById(clientId) {
        try {
            const client = await this.model.findById(clientId);
            logger.info("Client details from MongoDB", {
                clientId: client._id,
                slug: client.slug,
            });
            return client;
        } catch (error) {
            logger.error(
                "Error finding the client by clientId from Database",
                error,
            );
            throw new error();
        }
    }

    /**
     * Find a client by slug
     * @param {string} slug - The slug of the client
     * @returns {Promise<Object|null>} - The client object or null if not found
     */
    async findBySlug(slug) {
        try {
            const client = await this.model.findOne({ slug });

            return client;
        } catch (error) {
            logger.error(
                "Error finding the client by slug from Database",
                error,
            );
            throw new error();
        }
    }

    /**
     * Find clients with filters and pagination
     * @param {Object} filters - Query filters
     * @param {Object} options - Query options (limit, skip, sort)
     * @returns {Promise<Object>}
     */
    async find(filters = {}, options = {}) {
        try {
            const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options;
            const clients = await this.model
                .find(filters)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .select("-__v");
            return clients;
        } catch (error) {
            logger.error("Error finding clients : ", error)
            throw new error();
        }
    }

    /**
     * Count clients matching filters
     * @param {Object} filters - Query filters
     * @returns {Promise<number>}
     */
    async count(filters = {}) {
        try {
            const countClients = await this.model.countDocuments(filters)
            return countClients;
        } catch (error) {
            logger.error("Error counting the clients:  ", error)
            throw new error();
        }
    }
}
