import User from "../../../shared/models/User.js";
import logger from "../../../shared/config/logger.js";
import BaseRepository from "./BaseRepository.js";

/**
 * MongoDB implementation of the UserRepository.
 * This class provides methods to interact with the User collection in MongoDB.
 */
class UserRepository extends BaseRepository {
    constructor() {
        super(User);
    }

    /**
     * Creates a new user in the database.
     * @param {Object} userData - The data of the user to be created.
     * @returns {Promise<Object>} - Returns the created user object.
     */
    async create(userData) {
        try {
            let data = { ...userData };
            if (data.role == "super_admin" && !data.permissions) {
                data.permissions = {
                    canCreateApiKeys: true,
                    canManageUsers: true,
                    canViewAnalytics: true,
                    canExportData: true,
                };
            }

            const user = new this.model(data);
            await user.save();

            logger.info("User created successfully", {
                username: user.username,
            });

            return user;
        } catch (error) {
            logger.error("Error creating the user:", error);
            throw error;
        }
    }

    /**
     * Finds a user by their ID.
     * @param {string} userId - The ID of the user.
     * @returns {Promise<Object>} - Returns the user object if found.
     */

    async findById(userId) {
        try {
            const user = await this.model.findById(userId);
            return user;
        } catch (error) {
            logger.error("Error finding the user:", error);
            throw error;
        }
    }

    /**
     * Finds a user by their username.
     * @param {string} username - The username of the user to retrieve.
     * @returns {Promise<Object>} - Returns the user object if found, otherwise null.
     */
    async findByUsername(username) {
        try {
            const user = await this.model.findOne({ username });
            return user;
        } catch (error) {
            logger.error("Error finding the user:", error);
            throw error;
        }
    }

    /**
     * Finds a user by their email.
     * @param {string} email - The email of the user.
     * @returns {Promise<Object>} - Returns the user object if found.
     */
    async findByEmail(email) {
        try {
            const user = await this.model.findOne({ email });
            return user;
        } catch (error) {
            logger.error("Error finding the user:", error);
            throw error;
        }
    }

    /**
     * Finds all active users.
     * @returns {Promise<Array>} - Returns an array of active user objects.
     */
    async findActiveUsers() {
        try {
            const user = await this.model
                .findOne({ isActive: true })
                .select("-password");
            return user;
        } catch (error) {
            logger.error("Error finding the user:", error);
            throw error;
        }
    }
}

export default new UserRepository();
