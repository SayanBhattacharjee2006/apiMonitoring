import config from "../config/index.js";
import logger from "../config/logger.js";
import ResponseFormatter from "../utils/responseFormatter.js";
import jwt from "jsonwebtoken";

/**
 * Middleware to authenticate requests using JWT.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {Promise<void>}
 */

const authenticate = async (req, res, next) => {
    try {
        let token = null;

        if(req.cookies && req.cookies.authToken){
            token = req.cookies.token;
        }

        if(!token){
            return res
                    .status(401)
                    .json(
                        ResponseFormatter.error("Authentication token is required", 401)
                    )
        }

        const decoded = jwt.verify(token, config.JWT_SECRET);

        const {userId, role, email, username, clientId} = decoded;

        req.user = {
            userId,
            role,
            email,
            username,
            clientId
        }

        next();

    } catch(error){
        logger.error(
            "Failed to authenticate request:",
            {
                error : error.message,
                path : req.path
            }
        )

        if(error.name == "TokenExpiredError"){
            return res
                    .status(401)
                    .json(
                        ResponseFormatter.error("Token expired", 401)
                    )
        }

        return res
                .status(401)
                .json(
                    ResponseFormatter.error("Invalid token", 401)
                )
    }
}

export default authenticate