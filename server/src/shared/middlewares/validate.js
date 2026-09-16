

/**
 * Middleware to validate request bodies against a schema.
 * @param {Object} schema - The validation schema.
 * @returns {Function} - Returns a middleware function.
 * The validation schema is an object where each key is a field name and the value is an object that defines the validation rules for that field.
 * For example:
 * {
 *   username: { required: true },
 *   email: { required: true },
 *   password: { required: true, minLength: 6 }
 * }
 */

const validate = (schema) => (req,res,next) => {
    if(!schema){
        return next();
    }

    const errors = [];
    const body = req.body || {};

    Object.entries(schema).forEach(([field, rules]) => {
        const value = body[field];

        if(rules.required && (value == null || value === "" || value === undefined)){
            errors.push(`${field} is required`);
        }

        if(rules.minLength && typeof value == 'string' && value.length < rules.minLength){
            errors.push(`${field} must be at least ${rules.minLength} characters long`);
        }

        if(rules.custom && typeof value == 'function'){
            const customError = rules.custom(value);
            if(customError){
                errors.push(customError);
            }
        }
    })


    if(errors.length){
        return res
            .status(400)
            .json(ResponseFormatter.error("Validation Error", 400, errors));
    }

    next();
}

export default validate;