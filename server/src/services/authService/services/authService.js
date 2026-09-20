import logger from "../../../shared/config/logger.js";
import { AppError } from "../../../shared/utils/AppError.js";
import jwt from "jsonwebtoken";
import config from "../../../shared/config/index.js";
import bcrypt from "bcryptjs";
import { APPLICATION_ROLES } from "../../../shared/constants/roles.js";

/**
 * AuthService handles user authentication and authorization related operations such as onboarding super admin, user registration, login, and fetching user profile.
 * It interacts with the UserRepository to perform these operations and generates JWT tokens for authenticated users.
 */

export class AuthService {
    constructor(userRepository) {
        if (!userRepository) throw new Error("User repository is required");
        this.userRepository = userRepository;
    }

    /**
     * Generates a JWT token for the given user.
     * @param {Object} user - The user object for which the token is generated.
     * @returns {string} - The generated JWT token.
     */
    generateToken(user) {
        const { _id, email, username, clientId, role } = user;
        const payload = {
            userId: _id,
            username,
            email,
            clientId,
            role,
        };

        return jwt.sign(payload, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn,
        });
    }

    /**
     * Formats the user object for response by removing sensitive information.
     * @param {Object} user - The user object to be formatted.
     * @returns {Object} - The formatted user object.
     */
    formatUserForResponse(user) {
        const userObj = user.toObject ? user.toObject() : { ...user };
        delete userObj.password;
        return userObj;
    }

    /**
     * Compares the user-entered password with the hashed password.
     * @param {string} userEnteredPassword - The password entered by the user.
     * @param {string} hashedPassword - The hashed password stored in the database.
     * @returns {Promise<boolean>} - Returns true if the passwords match, otherwise false.
     */

    async comparePassword(userEnteredPassword, hashedPassword) {
        return bcrypt.compare(userEnteredPassword, hashedPassword);
    }

    /**
     * Onboards a new super admin user.
     * @param {Object} superAdminData - The data of the super admin to be onboarded.
     * @returns {Promise<Object>} - Returns an object containing the user and token.
     */
    async onboardSuperAdmin(superAdminData) {
        try {
            const allUsers = await this.userRepository.findActiveUsers();
            if (allUsers && allUsers.length > 0) {
                throw new AppError("Super admin already exists", 400);
            }

            const user = await this.userRepository.create(superAdminData);
            const token = this.generateToken(user);

            logger.info("Super admin onboarded successfully", {
                username: user.username,
            });

            return {
                user: this.formatUserForResponse(user),
                token,
            };
        } catch (error) {
            logger.error("Error onboarding super admin:", error);
            throw error;
        }
    }

    /**
     * Registers a new user.
     * @param {Object} userData - The data of the user to be registered.
     * @returns {Promise<Object>} - Returns an object containing the user and token.
     */

    async register(userData) {
        try {
            const existingUsername = await this.userRepository.findByUsername(
                userData.username,
            );
            if (existingUsername) {
                throw new AppError("Username already exists", 409);
            }

            const existingEmail = await this.userRepository.findByEmail(
                userData.email,
            );
            if (existingEmail) {
                throw new AppError("Email already exists", 409);
            }

            const user = await this.userRepository.create(userData);
            const token = this.generateToken(user);

            logger.info("User registered successfully", {
                username: user.username,
            });

            return {
                user: this.formatUserForResponse(user),
                token,
            };
        } catch (error) {
            logger.error("Error registering the user:", error);
            throw error;
        }
    }

    /**
     * Logs in a user.
     * @param {string} username - The username of the user.
     * @param {string} password - The password of the user.
     * @returns {Promise<Object>} - Returns an object containing the user and token.
     */

    async login(username, password) {
        try {
            const user = await this.userRepository.findByUsername(username);
            if (!user) {
                throw new AppError("Invalid credentials", 401);
            }

            if (!user.isActive) {
                throw new AppError("Account is deactivated", 403);
            }

            const isPasswordValid = await this.comparePassword(
                password,
                user.password,
            );

            if (!isPasswordValid) {
                throw new AppError("Invalid credentials", 401);
            }

            const token = this.generateToken(user);

            logger.info("User logged in successfully", {
                username: user.username,
            });

            return {
                user: this.formatUserForResponse(user),
                token,
            };
        } catch (error) {
            logger.error("Error logging in the user:", error);
            throw error;
        }
    }

    /**
     * Fetches the profile of a user by their ID.
     * @param {string} userId - The ID of the user.
     * @returns {Promise<Object>} - Returns the user's profile data.
     */
    async getProfile(userId) {
        try {
            const user = await this.userRepository.findById(userId);
            if(!user){
                throw new AppError(
                    "User not found",
                    404
                )
            }

            return this.formatUserForResponse(user);
        } catch(error){
            logger.error("Error fetching user profile:", error);
            throw error;
        }
    }


    /**
     * Checks if the user has the super admin role.
     * @param {string} userId - The ID of the user.
     * @returns {Promise<void>}
     */
    async checkSuperAdminPermission(userId) {
        try {
            const user = await this.userRepository.findById(userId);

            if(!user){
                throw new AppError(
                    "User not found",
                    404
                )
            }

            return user.role === APPLICATION_ROLES.SUPER_ADMIN;

        } catch (error) {
            // pass do things here
        }
    }
}
