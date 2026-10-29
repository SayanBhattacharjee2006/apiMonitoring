import logger from "../../../shared/config/logger.js";
import AppError from "../../../shared/utils/AppError.js";
import jwt from "jsonwebtoken";
import config from "../../../shared/config/index.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Client from "../../../shared/models/Client.js";
import { APPLICATION_ROLES } from "../../../shared/constants/roles.js";

/**
 * AuthService handles user authentication and authorization related operations such as onboarding super admin, user registration, login, and fetching user profile.
 * It interacts with the UserRepository to perform these operations and generates JWT tokens for authenticated users.
 */

export class AuthService {
        constructor(userRepository, clientRepository) {
            if (!userRepository) throw new Error("User repository is required");
            this.userRepository = userRepository;
            this.clientRepository = clientRepository;
        }

        /**
         * Generate unique slug from company name
         * @param {string} name - The organization name
         * @returns {string} - The sanitized slug
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
     * Registers a new independent tenant organization and its initial client-admin.
     * @param {Object} tenantData - The organization and admin details.
     * @returns {Promise<Object>} - Returns the created client, user, and session token.
     */
    async registerTenant(tenantData) {
            let createdClient = null;
            try {
                const {
                    name,
                    email,
                    website = "",
                    description = "",
                    username,
                    adminEmail,
                    password,
                } = tenantData;

                const targetAdminEmail = adminEmail || email;

                // 1. Verify username uniqueness
                const existingUsername = await this.userRepository.findByUsername(username);
                if (existingUsername) {
                    throw new AppError("Username already exists", 409);
                }

                // 2. Verify admin email uniqueness
                const existingEmail = await this.userRepository.findByEmail(targetAdminEmail);
                if (existingEmail) {
                    throw new AppError("Admin email already exists", 409);
                }

                // 3. Generate and verify organization slug
                let slug = this.generateSlug(name);
                if (!slug) {
                    slug = `tenant-${Date.now()}`;
                }

                let existingClient = null;
                if (this.clientRepository && typeof this.clientRepository.findBySlug === "function") {
                    existingClient = await this.clientRepository.findBySlug(slug);
                } else {
                    existingClient = await Client.findOne({ slug });
                }

                if (existingClient) {
                    slug = `${slug}-${Date.now().toString(36)}`;
                }

                // 4. Pre-generate IDs to link Client and User
                const clientId = new mongoose.Types.ObjectId();
                const userId = new mongoose.Types.ObjectId();

                // 5. Create Client organization
                const clientData = {
                    _id: clientId,
                    name,
                    slug,
                    email,
                    website,
                    description,
                    createdBy: userId,
                    isActive: true,
                };

                if (this.clientRepository && typeof this.clientRepository.create === "function") {
                    createdClient = await this.clientRepository.create(clientData);
                } else {
                    createdClient = await Client.create(clientData);
                }

                // 6. Create Initial Administrator (strictly client-admin)
                const permissions = {
                    canCreateApiKeys: true,
                    canManageUsers: true,
                    canViewAnalytics: true,
                    canExportData: true,
                };

                const userData = {
                    _id: userId,
                    username,
                    email: targetAdminEmail,
                    password,
                    role: APPLICATION_ROLES.CLIENT_ADMIN,
                    clientId: createdClient._id,
                    permissions,
                    isActive: true,
                };

                const user = await this.userRepository.create(userData);
                const token = this.generateToken(user);

                logger.info("Independent tenant and initial admin registered successfully", {
                    clientId: createdClient._id,
                    userId: user._id,
                    username: user.username,
                });

                return {
                    user: this.formatUserForResponse(user),
                    client: {
                        id: createdClient._id,
                        name: createdClient.name,
                        slug: createdClient.slug,
                        email: createdClient.email,
                    },
                    token,
                };
            } catch (error) {
                // Compensating rollback: delete created client if user creation failed
                if (createdClient && createdClient._id) {
                    try {
                        await Client.findByIdAndDelete(createdClient._id);
                    } catch (cleanupErr) {
                        logger.error("Failed to cleanup client during rollback:", cleanupErr);
                    }
                }
                logger.error("Error registering tenant:", error);
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
                if (!user) {
                    throw new AppError(
                        "User not found",
                        404
                    )
                }

                return this.formatUserForResponse(user);
            } catch (error) {
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

                if (!user) {
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
