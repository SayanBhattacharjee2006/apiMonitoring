/**
 * Polls an asynchronous condition function until it resolves to a truthy value or times out.
 *
 * @param {Function} conditionFn - Async function returning a truthy value or boolean
 * @param {Object} options
 * @param {number} [options.timeout=10000] - Maximum duration in ms to wait
 * @param {number} [options.interval=200] - Polling interval in ms
 * @param {string} [options.description="condition"] - Description of condition for error reporting
 * @returns {Promise<any>} - Resolves with the truthy result of conditionFn
 */
export async function waitForCondition(
    conditionFn,
    { timeout = 10000, interval = 200, description = "condition" } = {},
) {
    const startTime = Date.now();
    let lastError = null;

    while (Date.now() - startTime < timeout) {
        try {
            const result = await conditionFn();
            if (result) {
                return result;
            }
        } catch (error) {
            lastError = error;
        }

        await new Promise((resolve) => setTimeout(resolve, interval));
    }

    const elapsed = Date.now() - startTime;
    const detail = lastError ? ` Last error: ${lastError.message}` : "";
    throw new Error(
        `[POLLING TIMEOUT] Timed out waiting for ${description} after ${elapsed}ms.${detail}`,
    );
}

/**
 * Convenience sleep helper if needed for backoff intervals
 */
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
