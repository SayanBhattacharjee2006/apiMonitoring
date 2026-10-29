import { isValidRole } from "../../../shared/constants/roles.js";

/**
 * Validation schemas for the Auth module.
 */

export const onboardSuperAdminSchema = {
    username: {
        required: true,
    },
    password: {
        required: true,
        minLength: 6,
    },
    email: {
        required: true,
    },
};

/**
 * Validation schema for user registration.
 */

export const registrationSchema = {
    username: {
        required: true,
    },
    password: {
        required: true,
        minLength: 6,
    },
    email: {
        required: true,
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
        minLength: 6,
    },
    adminEmail: {
        required: false,
        custom: (value) => {
            if (!value) return null;
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Invalid admin email format';
        }
    }
};
