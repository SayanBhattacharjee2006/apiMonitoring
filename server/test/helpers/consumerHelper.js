import consumer from "../../src/services/processorService/consumer.js";

/**
 * Starts the background consumer for event processing tests
 */
export async function startTestConsumer() {
    if (!consumer.isRunning) {
        await consumer.start();
    }
    return consumer;
}

/**
 * Stops the test consumer's consumption without closing shared database pools
 */
export async function stopTestConsumer() {
    if (consumer && consumer.isRunning) {
        await consumer._cleanup();
    }
}
