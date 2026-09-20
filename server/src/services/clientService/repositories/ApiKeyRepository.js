import BaseApiKeyRepository from "./BaseApiKeyRepository.js";
import ApiKey from "../../../shared/models/Apikey.js";
import logger from "../../../shared/config/logger.js";

/**
 * MongoApiKeyRepository class to handle database operations related to API keys
 * This class extends the BaseApiKeyRepository and provides implementations for creating API keys, finding API keys by value, and finding/counting API keys by client ID. It uses Mongoose for database interactions and includes error handling and logging for each operation.
 */

class MongoApiKeyRepository extends BaseApiKeyRepository {
    constructor() {
        super(ApiKey);
    }

    /**
     * Create a new API key
     * @param {Object} apiKeyData - API key data
     * @returns {Promise<Object>}
     */
    async create(apiKeyData) {
        try {
            const apiKey = new this.model(apiKeyData);
            await apiKey.save();
            logger.info("Api Key created in database", {
                keyId: apiKey.keyId,
            });

            return apiKey;
        } catch (error) {
            logger.error("Error creating api key in database", error);
            throw new error();
        }
    }

    /**
     * Find API key by key value
     * @param {string} keyValue - API key value
     * @param {boolean} includeInactive - Include inactive keys
     * @returns {Promise<Object|null>}
     */
    async findByKeyValue(keyValue, includeInactive = false) {
        try {
            const filter = { keyValue };
            if (!includeInactive) {
                filter.isActive = true;
            }

            const apiKey = await this.model
                .findOne(filter)
                .populate("clientId");
            return apiKey;
        } catch (error) {
            logger.error("Error finding apikey by value", error);
            throw new error();
        }
    }

    /**
     * Find API keys by client ID
     * @param {string} clientId - Client ID
     * @param {Object} filters - Additional filters
     * @returns {Promise<Array>}
     */
    async findByClientId(clientId, filters) {
        try {
            const query = {
                clientId,
                ...filters,
            };

            const apikeys = await this.model
                .find(query)
                .populate("createdBy", "username email")
                .sort({ createdBy: -1 });

            return apikeys;
        } catch (error) {
            logger.error(
                "Error finding apikeys by clientId in database",
                error,
            );
            throw new error();
        }
    }

    /**
     * Count API keys by client ID
     * @param {string} clientId - Client ID
     * @param {Object} filters - Additional filters
     * @returns {Promise<number>}
     */
    async countByClientId(clientId, filters) {
        try {
            const query = {
                clientId,
                ...filters
            }

            const count = await this.model.countDocument(query);
            return count;
        } catch(error){
            logger.error("Error counting the apikeys in database");
            throw new error();
        }
    }
}

export default new MongoApiKeyRepository();
