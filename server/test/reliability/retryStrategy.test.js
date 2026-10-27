import { describe, it, expect } from "vitest";
import {
    RetryStrategy,
    isRetryable,
} from "../../src/shared/events/producer/RetryStrategy.js";

describe("Phase 14: Reliability - RetryStrategy & isRetryable", () => {
    describe("isRetryable error classification", () => {
        it("identifies connection and transient network errors as retryable", () => {
            expect(isRetryable(new Error("Connection closed unexpectedly"))).toBe(true);
            expect(isRetryable(new Error("Channel closed"))).toBe(true);
            expect(isRetryable(new Error("read ECONNRESET"))).toBe(true);
            expect(isRetryable(new Error("connect ECONNREFUSED 127.0.0.1"))).toBe(true);
            expect(isRetryable(new Error("Operation ETIMEDOUT"))).toBe(true);
            expect(isRetryable(new Error("Internal buffer full"))).toBe(true);
            expect(isRetryable(new Error("Broker not available"))).toBe(true);

            const dnsError = new Error("DNS resolution failed");
            dnsError.code = "ENOTFOUND";
            expect(isRetryable(dnsError)).toBe(true);
        });

        it("identifies non-transient and business errors as non-retryable", () => {
            expect(isRetryable(new Error("Validation Error: serviceName is required"))).toBe(false);
            expect(isRetryable(new Error("Invalid API key"))).toBe(false);
            expect(isRetryable(new Error("Duplicate key error"))).toBe(false);
            expect(isRetryable(null)).toBe(false);
            expect(isRetryable(undefined)).toBe(false);
        });
    });

    describe("RetryStrategy backoff and limits", () => {
        it("allows retries up to maxRetries and denies thereafter", () => {
            const strategy = new RetryStrategy({ maxRetries: 3 });

            expect(strategy.shouldRetry(0)).toBe(true);
            expect(strategy.shouldRetry(1)).toBe(true);
            expect(strategy.shouldRetry(2)).toBe(true);
            expect(strategy.shouldRetry(3)).toBe(false); // Exhausted
            expect(strategy.shouldRetry(4)).toBe(false);
        });

        it("calculates exponential delays bounded by maxDelayMs", () => {
            const strategy = new RetryStrategy({
                maxRetries: 5,
                baseDelayMs: 100,
                maxDelayMs: 1000,
                jitterFactor: 0, // Disable jitter to test pure deterministic exponential curve
            });

            // 100 * 2^0 = 100
            expect(strategy.delay(0)).toBe(100);
            // 100 * 2^1 = 200
            expect(strategy.delay(1)).toBe(200);
            // 100 * 2^2 = 400
            expect(strategy.delay(2)).toBe(400);
            // 100 * 2^3 = 800
            expect(strategy.delay(3)).toBe(800);
            // 100 * 2^4 = 1600 -> capped at 1000
            expect(strategy.delay(4)).toBe(1000);
        });

        it("applies jitter within expected variance without going negative", () => {
            const strategy = new RetryStrategy({
                baseDelayMs: 200,
                maxDelayMs: 5000,
                jitterFactor: 0.3,
            });

            for (let attempt = 0; attempt < 5; attempt++) {
                const delay = strategy.delay(attempt);
                expect(delay).toBeGreaterThanOrEqual(0);
                expect(delay).toBeLessThanOrEqual(5000 * 1.3);
            }
        });
    });
});
