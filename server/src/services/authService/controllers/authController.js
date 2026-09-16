/**
 * @description AuthController handles user authentication and authorization related operations such as onboarding super admin, user registration, login, fetching user profile, and logout.
 * It interacts with the AuthService to perform these operations and formats the responses using ResponseFormatter.
 */

export class AuthController {
    constructor(authService){
        if(!authService) throw new Error("Auth service is required");
        this.authService = authService;
    }

        /**
     * Onboards a new super admin user.
     * @param {Request} req - The request object containing user details.
     * @param {Response} res - The response object used to send the response.
     * @param {Function} next - The next middleware function in the request-response cycle.
     */

    async onboardSuperAdmin(req, res, next) {}


    /**
     * Registers a new user.
     * @param {Request} req - The request object containing user details.
     * @param {Response} res - The response object used to send the response.
     * @param {Function} next - The next middleware function in the request-response cycle.
     */

    async register(req, res, next) {}

     /**
     * Logs in a user.
     * @param {Request} req - The request object containing user credentials.
     * @param {Response} res - The response object used to send the response.
     * @param {Function} next - The next middleware function in the request-response cycle.
     */

    async login(req, res, next) {}

     /**
     * Fetches the profile of the logged-in user.
     * @param {Request} req - The request object containing user details.
     * @param {Response} res - The response object used to send the response.
     * @param {Function} next - The next middleware function in the request-response cycle.
     */

    async login(req, res, next) {}

      /**
     * Logs out the currently logged-in user.
     * @param {Request} req - The request object.
     * @param {Response} res - The response object used to send the response.
     * @param {Function} next - The next middleware function in the request-response cycle.
     */

    async logout(req, res, next) {}
}