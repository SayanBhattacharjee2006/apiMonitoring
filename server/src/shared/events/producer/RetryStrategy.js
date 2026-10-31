/**
 * List of error message patterns and codes that are considered retryable.
 * This includes common network-related errors, RabbitMQ transient channel errors,
 * and transient PostgreSQL errors (timeouts, deadlocks, connection resets).
 * @constant {string[]}
 */
const RETRYABLE_PATTERNS = [
    'channel closed',
    'connection closed',
    'connection terminated',
    'connection refused',
    'connection reset',
    'econnreset',
    'econnrefused',
    'etimedout',
    'buffer full',
    'heartbeat timeout',
    'not available',
    'server connection closed',
    'timeout',
    'deadlock',
    'serialization failure',
    'database unavailable',
    'pool is closed',
    'temporary failure',
];

const NON_RETRYABLE_PATTERNS = [
    'validation',
    'duplicate key',
    'event_integrity_mismatch',
    'event integrity error',
    'invalid api key',
    'schema validation',
];

const RETRYABLE_CODES = [
    'ENOTFOUND',
    '40001', // serialization_failure
    '40P01', // deadlock_detected
    '57P01', // admin_shutdown
    '57P02', // crash_shutdown
    '57P03', // cannot_connect_now
    '08000', // connection_exception
    '08003', // connection_does_not_exist
    '08006', // connection_failure
];

/**
 * Determines if an error is retryable based on its message, explicit retryable flag, or error code.
 * @param {*} err - The error object to check.
 * @returns {boolean} - True if the error is retryable, false otherwise.
 */
export function isRetryable(err) {
    if (!err) return false;

    if (err.retryable === true) return true;
    if (err.retryable === false) return false;

    const message = (err.message || "").toLowerCase();
    const code = (err.code || "").toUpperCase();

    // Explicit non-retryable patterns
    if (NON_RETRYABLE_PATTERNS.some((p) => message.includes(p.toLowerCase()))) {
        return false;
    }

    if (RETRYABLE_CODES.includes(code)) {
        return true;
    }

    return RETRYABLE_PATTERNS.some(
        (p) => message.includes(p.toLowerCase())
    );
}

/**
 * Implements a retry strategy with exponential backoff and jitter for handling transient errors.
 * @class RetryStrategy
 * @constructor
 * @param {Object} [opts] - Optional configuration for the retry strategy.
 * @param {number} [opts.maxRetries=3] - Maximum number of retry attempts.
 * @param {number} [opts.baseDelayMs=200] - Base delay in milliseconds for the exponential backoff.
 * @param {number} [opts.maxDelayMs=5000] - Maximum delay in milliseconds for the exponential backoff.
 * @param {number} [opts.jitterFactor=0.3] - Jitter factor to randomize the delay.
 */
export class RetryStrategy {
    constructor(opts = {}) {
        this.maxRetries = opts.maxRetries ?? 3;
        this.baseDelayMs = opts.baseDelayMs ?? 200;
        this.maxDelayMs = opts.maxDelayMs ?? 5000;
        this.jitterFactor = opts.jitterFactor ?? 0.3;
    }

    /**
     * Determines if another retry attempt should be made based on the current attempt count.
     * @param {number} attempt - The current attempt count.
     * @returns {boolean} - True if another retry attempt should be made, false otherwise.
     */
    shouldRetry(attempt) {
        return attempt < this.maxRetries;
    }

    /**
     * Calculates the delay for the next retry attempt using exponential backoff with jitter.
     * @param {number} attempt - The current attempt count.
     * @returns {number} - The delay in milliseconds for the next retry attempt.
     */
    delay(attempt) {
        const exponential = this.baseDelayMs * Math.pow(2, attempt);
        const capped = Math.min(this.maxDelayMs, exponential);

        const jitterRange = capped * this.jitterFactor;
        const jitter = (Math.random() - 0.5) * jitterRange;

        return Math.max(0, Math.round(capped + jitter));
    }

    /**
     * Waits for the calculated delay before the next retry attempt.
     * @param {number} attempt - The current attempt count.
     * @returns {Promise<void>} - Resolves after the delay for the next retry attempt.
     */
    wait(attempt) {
        const delay = this.delay(attempt);
        return new Promise((resolve) => setTimeout(resolve, delay));
    }
}
