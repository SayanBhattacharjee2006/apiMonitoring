import logger from "../../../shared/config/logger.js";
import AppError from "../../../shared/utils/AppError.js";
import {
    APPLICATION_ROLES,
    isValidClientRole,
} from "../../../shared/constants/roles.js";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
/**
 * ClientService class to handle business logic related to clients
 * This class is responsible for creating clients, managing client users, and handling API keys for clients. It interacts with the client repository, API key repository, and user repository to perform these operations.
 */

export default class ClientService {
    /**
     * Constructor for ClientService
     * @param {Object} dependencies - An object containing the required dependencies
     * @param {Object} dependencies.clientRepository - The client repository instance
     * @param {Object} dependencies.apiKeyRepository - The API key repository instance
     * @param {Object} dependencies.userRepository - The user repository instance
     * @throws Will throw an error if any of the required dependencies are missing
     */

    constructor(dependencies) {
        if (!dependencies) {
            throw new Error("Dependencies are required");
        }

        if (!dependencies.clientRepository)
            throw new Error("Client repository is required");
        if (!dependencies.apiKeyRepository)
            throw new Error("API key repository is required");
        if (!dependencies.userRepository)
            throw new Error("User repository is required");

        this.clientRepository = dependencies.clientRepository;
        this.apiKeyRepository = dependencies.apiKeyRepository;
        this.userRepository = dependencies.userRepository;
    }

    /**
     * Format client object for response by removing sensitive information
     * @param {Object} user - The client user object
     * @returns {Object} - The formatted client user object
     */
    formatClientForResponse(user) {
        user = user.toObject ? user.toObject() : { ...user };
        delete user.password;
        return user;
    }

    /**
     * Generate unique slug from name
     * @param {String} name - The name to generate the slug from
     * @returns {String} - The generated slug
     */

    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .trim();
    }

    /**
     * Generate a new API key
     * @returns {String} - The generated API key
     */
    generateApiKey() {
        const prefix = "apim";
        const suffix = crypto.randomBytes(20).toString("hex");
        return `${prefix}_${suffix}`;
    }

    /**
     * Check if a user has access to a specific client
     * @param {Object} user - The user object
     * @param {String} clientId - The client ID
     * @returns {Boolean} - True if the user has access, false otherwise
     */

    canUserAccessClient(user, clientId) {
        if (user.role == APPLICATION_ROLES.SUPER_ADMIN) {
            return true;
        }

        return (
            user.clientId && user.clientId.toString() === clientId.toString()
        );
    }

    /**
     * Create a new client
     * @param {Object} clientData - The client data
     * @param {Object} adminUser - The admin user creating the client
     * @returns {Object} - The created client
     */

    async createClient(clientData, adminUser) {
        try {
            const { name, description, website, email } = clientData;
            const slug = this.generateSlug(name);
            const existingClient = await this.clientRepository.findBySlug(slug);

            if (existingClient) {
                throw new AppError("Client already exists", 409);
            }

            const client = await this.clientRepository.create({
                name,
                email,
                slug,
                website,
                description,
                createdBy: adminUser.userId,
            });

            logger.info("Client successfully created in the database", {
                clientId: client._id,
                slug: client.slug,
            });
            return client;
        } catch (error) {
            logger.error("Error creating client in database", error);
            throw error;
        }
    }

    /**
     * Create a new client user for a specific client
     * @param {String} clientId - The client ID
     * @param {Object} userData - The user data
     * @param {Object} adminUser - The admin user creating the client user
     * @returns {Object} - The created client user
     */

    async createClientUser(clientId, userData, adminUser) {
        try {
            if (!canUserAccessClient(adminUser, clientId)) {
                throw new AppError("Access denied", 403);
            }

            const {
                email,
                username,
                password,
                role = APPLICATION_ROLES.CLIENT_VIEWER,
            } = userData;

            if (!isValidClientRole(role)) {
                throw new AppError("Invalid client role", 400);
            }

            client = await this.clientRepository.findById(clientId);

            if (!client) {
                throw new AppError("Client not found", 404);
            }

            let permissions = {
                canCreateApiKeys: false,
                canManageUsers: false,
                canViewAnalytics: true,
                canExportData: false,
            };

            if (role === APPLICATION_ROLES.CLIENT_ADMIN) {
                permissions.canCreateApiKeys = true;
                permissions.canManageUsers = true;
                permissions.canViewAnalytics = true;
                permissions.canExportData = true;
            }

            const clientUser = await this.userRepository.create({
                username,
                email,
                password,
                role,
                clientId,
                permissions,
            });

            logger.info("Client user successfully created in the database", {
                clientId,
                clientUserId: clientUser._id,
                role,
            });

            return this.formatClientForResponse(clientUser);
        } catch (error) {
            logger.error("Error creating client user in database", error);
            throw error;
        }
    }

    /**
     * Create a new API key for a specific client
     * @param {String} clientId - The client ID
     * @param {Object} keyData - The API key data
     * @param {Object} user - The user creating the API key
     * @returns {Object} - The created API key
     */

    async createApiKey(clientId, keyData, user) {
        try {
            const client = await this.clientRepository.findById(clientId);

            if (!client) {
                throw new AppError("Client not found", 404);
            }

            if (!canUserAccessClient(user, clientId)) {
                throw new AppError("Access denied", 403);
            }

            if (
                !(
                    role === APPLICATION_ROLES.CLIENT_ADMIN ||
                    role === APPLICATION_ROLES.SUPER_ADMIN
                )
            ) {
                throw new AppError("Access denied", 403);
            }

            const { name, description, environment = "production" } = keyData;

            const keyId = uuidv4();
            const keyValue = this.generateApiKey(keyId);

            const apikey = await this.apiKeyRepository.create({
                keyId,
                keyValue,
                clientId,
                name,
                description,
                environment,
                createdBy: user.userId,
            });

            logger.info("Api Key successfully created in the database", {
                keyId,
            });

            return apikey;
        } catch (error) {
            logger.error("Error creating api key in database", error);
            throw error;
        }
    }

    /**
     * Get all API keys for a specific client
     * @param {String} clientId - The client ID
     * @param {Object} user - The user requesting the API keys
     * @returns {Array} - The list of API keys
     */

    async clientApiKeys(clientId, user) {
        try {
            if (!canUserAccessClient(user, clientId)) {
                throw new AppError("Access denied", 403);
            }

            const apikeys =
                await this.apiKeyRepository.findByClientId(clientId);

            const formattedResponse = apikeys.map((apikey) => {
                const formattedKey = apikey.toObject
                    ? apikey.toObject()
                    : apikey;
                delete formattedKey.keyValue;
                return formattedKey;
            });

            return formattedResponse;
        } catch (error) {
            logger.error("Error getting api keys in database", error);
            throw error;
        }
    }
}
