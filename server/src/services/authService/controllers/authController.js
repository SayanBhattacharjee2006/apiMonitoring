import { APPLICATION_ROLES } from "../../../shared/constants/roles.js";
import config from "../../../shared/config/index.js";
import ResponseFormatter from "../../../shared/utils/responseFormatter.js";

/**
 * @description AuthController handles user authentication and authorization related operations such as onboarding super admin, user registration, login, fetching user profile, and logout.
 * It interacts with the AuthService to perform these operations and formats the responses using ResponseFormatter.
 */

export class AuthController {
    constructor(authService) {
        if (!authService) throw new Error("Auth service is required");
        this.authService = authService;
    }

    /**
     * Onboards a new super admin user.
     * @param {Request} req - The request object containing user details.
     * @param {Response} res - The response object used to send the response.
     * @param {Function} next - The next middleware function in the request-response cycle.
     */

    async onboardSuperAdmin(req, res, next) {
        try {
            const { username, password, email } = req.body;
            const superAdminData = {
                username,
                password,
                email,
                role: APPLICATION_ROLES.SUPER_ADMIN,
            };

            const { token, user } =
                await this.authService.onboardSuperAdmin(superAdminData);

            res.cookies.set("authToken", token, {
                httpOnly: config.cookie.httpOnly,
                secure: config.cookie.secure,
                expires: config.cookie.expires,
            });

            return res
                .status(201)
                .json(
                    ResponseFormatter.success(
                        user,
                        "Super admin created successfully",
                        201,
                    ),
                );
        } catch (error) {
            next(error);
        }
    }

    /**
     * Registers a new user.
     * @param {Request} req - The request object containing user details.
     * @param {Response} res - The response object used to send the response.
     * @param {Function} next - The next middleware function in the request-response cycle.
     */

    async register(req, res, next) {
        try {
            const { username, password, email, role } = req.body;
            const userData = {
                username,
                password,
                email,
                role: role || APPLICATION_ROLES.CLIENT_VIEWER,
            };

            const { token, user } = await this.authService.register(userData);

            res.cookies.set("authToken", token, {
                httpOnly: config.cookie.httpOnly,
                secure: config.cookie.secure,
                expires: config.cookie.expires,
            });

            return res
                .status(201)
                .json(
                    ResponseFormatter.success(
                        user,
                        "User created successfully",
                        201,
                    ),
                );
        } catch (error) {
            next(error);
        }
    }

    /**
     * Logs in a user.
     * @param {Request} req - The request object containing user credentials.
     * @param {Response} res - The response object used to send the response.
     * @param {Function} next - The next middleware function in the request-response cycle.
     */

    async login(req, res, next) {
        try {
            const { username, password } = req.body;
            const { token, user } = await this.authService.login(
                username,
                password,
            );
            res.cookies.set("authToken", token, {
                httpOnly: config.cookie.httpOnly,
                secure: config.cookie.secure,
                expires: config.cookie.expires,
            });

            return res
                .status(200)
                .json(
                    ResponseFormatter.success(
                        user,
                        "User logged in successfully",
                        200,
                    ),
                );
        } catch (error) {
            next(error);
        }
    }

    /**
     * Fetches the profile of the logged-in user.
     * @param {Request} req - The request object containing user details.
     * @param {Response} res - The response object used to send the response.
     * @param {Function} next - The next middleware function in the request-response cycle.
     */

    async getProfile(req, res, next) {
        try {
            const userId = req.user.userId;
            const result = await this.authService.getProfile(userId);

            return res
                .status(200)
                .json(
                    ResponseFormatter.success(
                        result,
                        "User profile fetched successfully",
                        200,
                    ),
                );
        } catch (error) {
            next(error);
        }
    }

    /**
     * Logs out the currently logged-in user.
     * @param {Request} req - The request object.
     * @param {Response} res - The response object used to send the response.
     * @param {Function} next - The next middleware function in the request-response cycle.
     */

    async logout(req, res, next) {
        try {
            res.clearCookie("authToken");
            return res
                .status(200)
                .json(
                    ResponseFormatter.success(
                        null,
                        "User logged out successfully",
                        200,
                    ),
                );
        } catch (error) {
            next(error);
        }
    }
}
