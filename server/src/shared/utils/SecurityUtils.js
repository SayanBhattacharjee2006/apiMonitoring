
/**
 * SecurityUtils - Utility class for security related functions such as password validation.
 * This class can be extended in the future to include additional security features like token generation, encryption, etc.
 */

class SecurityUtils {
    static PASSWORD_REQUIREMENTS = {
        minLength: Number.parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
        requireUppercase: (process.env.PASSWORD_REQUIRE_UPPERCASE || 'true') === 'true',
        requireLowercase: (process.env.PASSWORD_REQUIRE_LOWERCASE || 'true') === 'true',
        requireNumbers: (process.env.PASSWORD_REQUIRE_NUMBERS || 'true') === 'true',
        requireSymbols: (process.env.PASSWORD_REQUIRE_SYMBOLS || 'true') === 'true',
    };


    /**
     * validates a password against the defined security requirements
     * @param {string} password - the password to validate
     * @returns {Object} - Validation res. with success flag and errors
     */

    static validatePassword(password) {
        const errors = [];
        const requirements = this.PASSWORD_REQUIREMENTS;

        if(!password){
            return {
                success : false,
                errors : ['Password is required']
            }
        }

        if(password.length < requirements.minLength) {
            errors.push(`Password must be at least ${requirements.minLength} characters long.`);
        }

        if(requirements.requireUppercase && !/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter.');
        }

        if(requirements.requireLowercase && !/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter.');
        }

        if(requirements.requireNumbers && !/\d/.test(password)) {
            errors.push('Password must contain at least one number.');
        }

        if(requirements.requireSymbols && !/[^a-zA-Z0-9]/.test(password)) {
            errors.push('Password must contain at least one special character.');
        }

        const weakPasswords = [
            "password",
            "123456",
            "qwerty",
            "admin123",
            "password123",
            "admin",
            "123456789",
            "12345",            
        ];

        if(weakPasswords.includes(password.toLowerCase())) {
            errors.push('Password is too weak. Please choose a more secure password.');
        }

        return {
            success: errors.length === 0,
            errors
        }

    }
}


export default SecurityUtils;