import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testEnvResult = dotenv.config({ path: path.resolve(__dirname, ".env.test"), override: true });
const testEnvVars = testEnvResult.parsed || {};
process.env.NODE_ENV = "test";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        env: {
            ...testEnvVars,
            NODE_ENV: "test",
        },
        setupFiles: ["./test/setup/testEnv.js"],
        globalSetup: ["./test/setup/globalSetup.js"],
        testTimeout: 25000,
        hookTimeout: 25000,
        fileParallelism: false,
    },
});
