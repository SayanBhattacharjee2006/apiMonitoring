import { describe, it, expect, vi } from "vitest";
import {
    CircuitBreaker,
    circuitState,
} from "../../src/shared/events/producer/CircuitBreaker.js";

describe("Phase 14: Reliability - CircuitBreaker Pattern", () => {
    it("starts in CLOSED state and allows requests", () => {
        const breaker = new CircuitBreaker({
            failureThreshold: 3,
            cooldownMs: 5000,
            logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
        });

        expect(breaker.state).toBe(circuitState.CLOSED);
        expect(breaker.allowRequest()).toBe(true);
    });

    it("trips to OPEN state when failures reach failureThreshold", () => {
        const breaker = new CircuitBreaker({
            failureThreshold: 2,
            cooldownMs: 5000,
            logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
        });

        // 1st failure: still CLOSED
        breaker.onfailure();
        expect(breaker.state).toBe(circuitState.CLOSED);
        expect(breaker.allowRequest()).toBe(true);

        // 2nd failure: trips to OPEN
        breaker.onfailure();
        expect(breaker.state).toBe(circuitState.OPEN);
        expect(breaker.allowRequest()).toBe(false);
    });

    it("transitions from OPEN to HALF_OPEN after cooldown period", () => {
        const breaker = new CircuitBreaker({
            failureThreshold: 1,
            cooldownMs: 500, // Short cooldown for testing
            halfOpenMaxAttempts: 2,
            logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
        });

        breaker.onfailure();
        expect(breaker.state).toBe(circuitState.OPEN);

        // Fast-forward or simulate time
        breaker._lastFailureTime = Date.now() - 600;

        // Next state query triggers transition to HALF_OPEN
        expect(breaker.state).toBe(circuitState.HALF_OPEN);
        // Allows half-open probe attempt
        expect(breaker.allowRequest()).toBe(true);
    });

    it("recovers to CLOSED when half-open probe requests succeed", () => {
        const breaker = new CircuitBreaker({
            failureThreshold: 1,
            cooldownMs: 100,
            halfOpenMaxAttempts: 2,
            logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
        });

        // Trip breaker
        breaker.onfailure();
        expect(breaker.state).toBe(circuitState.OPEN);

        // Cooldown expires
        breaker._lastFailureTime = Date.now() - 200;
        expect(breaker.state).toBe(circuitState.HALF_OPEN);

        // First successful probe
        breaker.allowRequest();
        breaker.onSuccess();

        // Second successful probe
        breaker.allowRequest();
        breaker.onSuccess();

        // Breaker should now be fully reset to CLOSED
        expect(breaker.state).toBe(circuitState.CLOSED);
        expect(breaker.allowRequest()).toBe(true);
    });

    it("re-trips to OPEN immediately if a probe fails during HALF_OPEN", () => {
        const breaker = new CircuitBreaker({
            failureThreshold: 1,
            cooldownMs: 100,
            halfOpenMaxAttempts: 3,
            logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
        });

        breaker.onfailure();
        breaker._lastFailureTime = Date.now() - 200;
        expect(breaker.state).toBe(circuitState.HALF_OPEN);

        // Probe fails
        breaker.onfailure();

        expect(breaker.state).toBe(circuitState.OPEN);
        expect(breaker.allowRequest()).toBe(false);
    });

    it("produces a valid snapshot of current telemetry", () => {
        const breaker = new CircuitBreaker({
            failureThreshold: 5,
            cooldownMs: 10000,
            logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
        });

        breaker.onfailure();
        const snap = breaker.snapshot();

        expect(snap).toBeDefined();
        expect(snap.state).toBe(circuitState.CLOSED);
        expect(snap.failures).toBe(1);
        expect(snap.failureThreshold).toBe(5);
        expect(snap.cooldownMs).toBe(10000);
    });
});
