import { describe, it, expect } from "vitest";
import {
    isInvalidProductionSecret,
    validateProductionConfig,
    DISALLOWED_PRODUCTION_SECRETS,
} from "../../src/shared/config/index.js";

describe("Production Configuration & Secret Hardening Validation", () => {
    describe("isInvalidProductionSecret helper", () => {
        it("rejects null, undefined, empty, or whitespace-only values", () => {
            expect(isInvalidProductionSecret(null)).toBe(true);
            expect(isInvalidProductionSecret(undefined)).toBe(true);
            expect(isInvalidProductionSecret("")).toBe(true);
            expect(isInvalidProductionSecret("   ")).toBe(true);
        });

        it("rejects secrets shorter than required minimum length", () => {
            expect(isInvalidProductionSecret("short_secret", 32)).toBe(true);
            expect(isInvalidProductionSecret("123456789012345", 16)).toBe(true);
        });

        it("rejects all known historical and placeholder secrets", () => {
            for (const disallowed of DISALLOWED_PRODUCTION_SECRETS) {
                expect(isInvalidProductionSecret(disallowed)).toBe(true);
            }
        });

        it("rejects development, test, and placeholder marker strings even if long enough", () => {
            const devMarkerSecrets = [
                "test_long_secret_that_has_plenty_of_characters_for_length",
                "dev_jwt_secret_with_more_than_32_characters_total",
                "my_custom_api_secret_for_test_environment_1234",
                "staging_placeholder_secret_with_ample_length_value",
                "custom_adm_bootstrap_secret_secure_dev",
                "an_example_string_that_exceeds_the_minimum_length_requirement",
                "a_default_string_that_exceeds_the_minimum_length_requirement",
                "a_changeme_string_that_exceeds_the_minimum_length_requirement",
                "a_sample_string_that_exceeds_the_minimum_length_requirement",
            ];

            for (const sec of devMarkerSecrets) {
                expect(isInvalidProductionSecret(sec, 16)).toBe(true);
            }
        });

        it("rejects placeholder prefixes such as your_, replace_me, and example_", () => {
            const prefixedSecrets = [
                "your_production_cryptographically_secure_jwt_secret_min_32_characters",
                "your_production_super_admin_bootstrap_secret_min_16_chars",
                "your_custom_secret_key_that_is_at_least_32_characters_long",
                "replace_me_with_a_cryptographically_secure_jwt_secret_min_32_chars",
                "replace_me_with_a_secure_super_admin_bootstrap_secret_min_16_chars",
                "example_jwt_token_secret_that_is_quite_long_indeed_for_validation",
                "sample_bootstrap_secret_that_passes_length_threshold_easily",
            ];

            for (const sec of prefixedSecrets) {
                expect(isInvalidProductionSecret(sec, 16)).toBe(true);
            }
        });

        it("rejects exact template placeholder values supplied in .env.example", () => {
            const envExampleValues = [
                "your_production_cryptographically_secure_jwt_secret_min_32_characters",
                "your_production_super_admin_bootstrap_secret_min_16_chars",
                "replace_me_with_a_cryptographically_secure_jwt_secret_min_32_chars",
                "replace_me_with_a_secure_super_admin_bootstrap_secret_min_16_chars",
            ];

            for (const sec of envExampleValues) {
                expect(isInvalidProductionSecret(sec, 16)).toBe(true);
            }
        });

        it("accepts strong, production-grade high-entropy secrets", () => {
            const strongJwtSecret = "a8fbc723d9104ef9a12b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f";
            const strongBootstrapSecret = "adm_bootstrap_84c8a143b821908e2f89c4d92a01b";

            expect(isInvalidProductionSecret(strongJwtSecret, 32)).toBe(false);
            expect(isInvalidProductionSecret(strongBootstrapSecret, 16)).toBe(false);
        });
    });

    describe("validateProductionConfig role-based enforcement", () => {
        const validJwt = "a8fbc723d9104ef9a12b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f";
        const validBootstrap = "adm_bootstrap_84c8a143b821908e2f89c4d92a01b";

        it("allows consumer role to start in production without API bootstrap or JWT secrets", () => {
            expect(() => {
                validateProductionConfig({
                    nodeEnv: "production",
                    role: "consumer",
                    jwtSecret: null,
                    bootstrapSecret: null,
                });
            }).not.toThrow();
        });

        it("fails loudly in production when API process has missing or weak JWT secret", () => {
            expect(() => {
                validateProductionConfig({
                    nodeEnv: "production",
                    role: "api",
                    jwtSecret: "short",
                    bootstrapSecret: validBootstrap,
                });
            }).toThrow(/JWT_SECRET must be explicitly configured/i);

            expect(() => {
                validateProductionConfig({
                    nodeEnv: "production",
                    role: "api",
                    jwtSecret: "dev_test_only_jwt_secret_never_use_in_production_32chars",
                    bootstrapSecret: validBootstrap,
                });
            }).toThrow(/JWT_SECRET must be explicitly configured/i);
        });

        it("fails loudly in production when API process has missing or weak bootstrap secret", () => {
            expect(() => {
                validateProductionConfig({
                    nodeEnv: "production",
                    role: "api",
                    jwtSecret: validJwt,
                    bootstrapSecret: "adm_bootstrap_secret_secure_dev",
                });
            }).toThrow(/SUPER_ADMIN_BOOTSTRAP_SECRET must be explicitly configured/i);

            expect(() => {
                validateProductionConfig({
                    nodeEnv: "production",
                    role: "api",
                    jwtSecret: validJwt,
                    bootstrapSecret: "test-bootstrap-secret-key-1234",
                });
            }).toThrow(/SUPER_ADMIN_BOOTSTRAP_SECRET must be explicitly configured/i);
        });

        it("fails loudly in production when API process uses .env.example placeholder secrets", () => {
            expect(() => {
                validateProductionConfig({
                    nodeEnv: "production",
                    role: "api",
                    jwtSecret: "your_production_cryptographically_secure_jwt_secret_min_32_characters",
                    bootstrapSecret: validBootstrap,
                });
            }).toThrow(/JWT_SECRET must be explicitly configured/i);

            expect(() => {
                validateProductionConfig({
                    nodeEnv: "production",
                    role: "api",
                    jwtSecret: "replace_me_with_a_cryptographically_secure_jwt_secret_min_32_chars",
                    bootstrapSecret: validBootstrap,
                });
            }).toThrow(/JWT_SECRET must be explicitly configured/i);

            expect(() => {
                validateProductionConfig({
                    nodeEnv: "production",
                    role: "api",
                    jwtSecret: validJwt,
                    bootstrapSecret: "your_production_super_admin_bootstrap_secret_min_16_chars",
                });
            }).toThrow(/SUPER_ADMIN_BOOTSTRAP_SECRET must be explicitly configured/i);

            expect(() => {
                validateProductionConfig({
                    nodeEnv: "production",
                    role: "api",
                    jwtSecret: validJwt,
                    bootstrapSecret: "replace_me_with_a_secure_super_admin_bootstrap_secret_min_16_chars",
                });
            }).toThrow(/SUPER_ADMIN_BOOTSTRAP_SECRET must be explicitly configured/i);
        });

        it("passes cleanly in production when API process has strong production secrets", () => {
            expect(() => {
                validateProductionConfig({
                    nodeEnv: "production",
                    role: "api",
                    jwtSecret: validJwt,
                    bootstrapSecret: validBootstrap,
                });
            }).not.toThrow();
        });

        it("bypasses production validation when running in development or test modes", () => {
            expect(() => {
                validateProductionConfig({
                    nodeEnv: "test",
                    role: "api",
                    jwtSecret: "test_jwt_secret_key_1234567890_test_suite_key",
                    bootstrapSecret: "test-bootstrap-secret-key-1234",
                });
            }).not.toThrow();

            expect(() => {
                validateProductionConfig({
                    nodeEnv: "development",
                    role: "api",
                    jwtSecret: null,
                    bootstrapSecret: null,
                });
            }).not.toThrow();
        });
    });
});

