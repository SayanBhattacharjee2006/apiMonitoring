import User from "../../../shared/models/User.js";
import logger from "../../../shared/config/logger.js";
import BaseRepository from "./BaseRepository.js";

/**
 * MongoDB implementation of the UserRepository.
 * This class provides methods to interact with the User collection in MongoDB.
 */
class UserRepository extends BaseRepository {
    constructor(){
        super(User);
    }

    /**
     * Creates a new user in the database.
     * @param {Object} userData - The data of the user to be created.
     * @returns {Promise<Object>} - Returns the created user object.
     */
    async create(userData) {
        // try {

        // } catch( error){
        //     logger.error("Error creating the user:", error );
        //     throw error;
        // }
    }

    /**
     * Finds a user by their ID.
     * @param {string} userId - The ID of the user.
     * @returns {Promise<Object>} - Returns the user object if found.
     */

    async findById(userId) {
    }

    /**
     * Finds a user by their username.
     * @param {string} username - The username of the user to retrieve.
     * @returns {Promise<Object>} - Returns the user object if found, otherwise null.
     */
    async findByUsername(username) {
    }

    /**
     * Finds a user by their email.
     * @param {string} email - The email of the user.
     * @returns {Promise<Object>} - Returns the user object if found.
     */
    async findByEmail(email) {
    }

    /**
     * Finds all active users.
     * @returns {Promise<Array>} - Returns an array of active user objects.
     */
    async findActiveUsers() {
    }
} 

export default new UserRepository