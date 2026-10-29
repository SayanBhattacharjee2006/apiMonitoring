import { isValidRole } from "../../../shared/constants/roles.js";
import SecurityUtils from "../../../shared/utils/SecurityUtils.js";

/**
 * Validates password strength according to SecurityUtils policy
 * (length >= 8, uppercase, lowercase, numbers, symbols, weak passwords check)
 */
const validatePasswordCustom = (value) => {
    if (!value) return "Password is required";
    const result = SecurityUtils.validatePassword(value);
    if (!result.success) {
        return result.errors.join(". ");
    }
    return null;
};

/**
 * Validation schemas for the Auth module.
 */

export const onboardSuperAdminSchema = {
    username: {
        required: true,
        minLength: 3,
        custom: (value) => {
            if (!value) return null;
            return /^[a-zA-Z0-9_.-]+$/.test(value)
                ? null
                : "Username can only contain letters, numbers, underscores, dots, or hyphens (cannot be an email address)";
        }
    },
    password: {
        required: true,
        custom: validatePasswordCustom,
    },
    email: {
        required: true,
        custom: (value) => {
            if (!value) return null;
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Invalid email format';
        }
    },
    bootstrapSecret: {
        required: false,
    }
};

/**
 * Validation schema for user registration (internal super-admin user creation).
 */
export const registrationSchema = {
    username: {
        required: true,
        minLength: 3,
    },
    password: {
        required: true,
        custom: validatePasswordCustom,
    },
    email: {
        required: true,
        custom: (value) => {
            if (!value) return null;
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Invalid email format';
        }
    },
    role: {
        required: true,
        custom: (value) => {
            if (!value) return null;
            return isValidRole(value) ? null : 'Invalid role';
        }
    },
    clientId: {
        required: true,
    }
};

/**
 * Validation schema for user login.
 * Kept simple without password-strength rules so existing users can always log in.
 */
export const loginSchema = {
    username: { required: true },
    password: { required: true }
};

/**
 * Validation schema for public independent tenant registration.
 */
export const registerTenantSchema = {
    name: {
        required: true,
        minLength: 2,
    },
    email: {
        required: true,
        custom: (value) => {
            if (!value) return null;
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Invalid organization email format';
        }
    },
    username: {
        required: true,
        minLength: 3,
        custom: (value) => {
            if (!value) return null;
            return /^[a-zA-Z0-9_.-]+$/.test(value) ? null : 'Invalid username format';
        }
    },
    password: {
        required: true,
        custom: validatePasswordCustom,
    },
    adminEmail: {
        required: false,
        custom: (value) => {
            if (!value) return null;
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Invalid admin email format';
        }
    }
};
