import express from "express";
import rateLimit from "express-rate-limit";
import config from "../../../shared/config/index.js";
import dependencies from "../Dependencies/dependencies.js";
import validate from "../../../shared/middlewares/validate.js";
import {
    onboardSuperAdminSchema,
    registrationSchema,
    loginSchema,
    registerTenantSchema,
} from "../validations/authSchema.js";
import requestLogger from "../../../shared/middlewares/requestLogger.js";
import authenticate from "../../../shared/middlewares/authenticate.js";
import authorize from "../../../shared/middlewares/authorization.js";
import { APPLICATION_ROLES } from "../../../shared/constants/roles.js";

const router = express.Router();
const { controllers } = dependencies;
const authController = controllers.authController;

// Dedicated rate limiter for public authentication endpoints (login, register, bootstrap)
const authRateLimiter = rateLimit({
    windowMs: config.authRateLimiter?.windowMs || 15 * 60 * 1000,
    limit: process.env.NODE_ENV === "test" ? 10000 : (config.authRateLimiter?.maxRequests || 100),
    message: {
        success: false,
        message: "Too many authentication attempts, please try again later",
        statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// 1. Initial Cluster Setup (Bootstrap State Guard)
router.post(
    "/onboard-super-admin",
    requestLogger,
    authRateLimiter,
    validate(onboardSuperAdminSchema),
    (req, res, next) => authController.onboardSuperAdmin(req, res, next)
);

// 2. Public Self-Service Independent Tenant Registration
router.post(
    "/register-tenant",
    requestLogger,
    authRateLimiter,
    validate(registerTenantSchema),
    (req, res, next) => authController.registerTenant(req, res, next)
);

// 3. Super Admin-only Internal User Provisioning for Existing Clients
router.post(
    "/register",
    requestLogger,
    authenticate,
    authorize(APPLICATION_ROLES.SUPER_ADMIN),
    validate(registrationSchema),
    (req, res, next) => authController.register(req, res, next)
);

// 4. User Login
router.post(
    "/login",
    requestLogger,
    authRateLimiter,
    validate(loginSchema),
    (req, res, next) => authController.login(req, res, next)
);

// 5. Authenticated Profile Retrieval
router.get(
    "/profile",
    requestLogger,
    authenticate,
    (req, res, next) => authController.getProfile(req, res, next)
);

// 6. User Logout
router.post(
    "/logout",
    requestLogger,
    (req, res, next) => authController.logout(req, res, next)
);

export default router;
