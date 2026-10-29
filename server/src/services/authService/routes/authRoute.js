import express from "express";
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

// 1. Initial Cluster Setup (Bootstrap State Guard)
router.post(
    "/onboard-super-admin",
    requestLogger,
    validate(onboardSuperAdminSchema),
    (req, res, next) => authController.onboardSuperAdmin(req, res, next)
);

// 2. Public Self-Service Independent Tenant Registration
router.post(
    "/register-tenant",
    requestLogger,
    validate(registerTenantSchema),
    (req, res, next) => authController.registerTenant(req, res, next)
);

// 3. Super Admin-only Internal User Provisioning for Existing Clients
// here , in our architechture the super admin can only register the clients and client admins so here we are not authenticating and authorizing the clients here the authentication and authorization is for the super admin 
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
