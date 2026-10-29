import config from "../config/index.js";
import logger from "../config/logger.js";
import ResponseFormatter from "../utils/responseFormatter.js";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Client from "../models/Client.js";

/**
 * Middleware to authenticate requests using JWT.
 * Validates token signature, token expiration, and database active status
 * for both user accounts and tenant organizations.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {Promise<void>}
 */

const authenticate = async (req, res, next) => {
    try {
        let token = null;
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }
        else if (req.cookies && req.cookies.authToken) {
            token = req.cookies.authToken;
        }

        if (!token) {
            return res
                .status(401)
                .json(
                    ResponseFormatter.error("Authentication token is required", 401)
                );
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        const { userId, role, email, username, clientId } = decoded;

        // Verify active status from database to prevent token reuse after deactivation
        const userDoc = await User.findById(userId).select("isActive role clientId").lean();
        if (!userDoc || userDoc.isActive === false) {
            return res
                .status(401)
                .json(
                    ResponseFormatter.error("User account is inactive or not found", 401)
                );
        }

        // If user belongs to a client tenant, verify the tenant is active
        const effectiveClientId = userDoc.clientId
            ? userDoc.clientId.toString()
            : (clientId ? clientId.toString() : null);

        if (effectiveClientId && userDoc.role !== "super-admin") {
            const clientDoc = await Client.findById(effectiveClientId).select("isActive").lean();
            if (!clientDoc || clientDoc.isActive === false) {
                return res
                    .status(403)
                    .json(
                        ResponseFormatter.error("Tenant organization is inactive or suspended", 403)
                    );
            }
        }

        req.user = {
            userId: userId ? userId.toString() : userId,
            role: userDoc.role || role,
            email,
            username,
            clientId: effectiveClientId
        };

        next();

    } catch (error) {
        logger.error(
            "Failed to authenticate request:",
            {
                error: error.message,
                path: req.path
            }
        );

        if (error.name === "TokenExpiredError") {
            return res
                .status(401)
                .json(
                    ResponseFormatter.error("Token expired", 401)
                );
        }

        return res
            .status(401)
            .json(
                ResponseFormatter.error("Invalid token", 401)
            );
    }
};

export default authenticate;
