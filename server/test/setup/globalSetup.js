import { closeDatabases } from "./testDatabase.js";
import { closeTestRabbitMQ } from "./testRabbitMQ.js";
import { stopTestConsumer } from "../helpers/consumerHelper.js";

export async function setup() {
    // global suite startup
}

export async function teardown() {
    await stopTestConsumer();
    await closeTestRabbitMQ();
    await closeDatabases();
}
