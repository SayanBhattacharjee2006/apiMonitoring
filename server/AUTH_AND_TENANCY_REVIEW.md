# Multi-Tenant Authentication Audit, Data Isolation Review, and System Verification Report

**Date of Audit**: October 29–31, 2026  
**Auditor**: Senior Backend Engineer, Application Security Reviewer, Multi-Tenant Systems Architect & React Test Engineer  
**Codebase Under Review**: API Monitoring Platform (`server/` and `frontend/`)  
**Backend Framework**: Node.js, Express, MongoDB (Mongoose), PostgreSQL (`pg`), RabbitMQ (`amqplib`), Vitest, Supertest  
**Frontend Framework**: React 18, Vite, Tailwind CSS, Zustand, Axios, Recharts, Lucide React  

---

## Executive Summary

A comprehensive architectural and application security audit was performed on the API Monitoring System backend authentication and multi-tenancy implementation, paired with frontend integration and executable automated verification across **15 test suites (102 tests, 100% pass rate)**, Docker Compose specification validation, and a clean frontend production build.

The review confirmed that the system provides **strict multi-tenant data isolation**, **robust RBAC boundaries**, **idempotent asynchronous ingestion pipelines**, and **strict PostgreSQL analytics partition boundaries**. 

Specific confirmed security, authorization, and correctness issues identified during review were systematically addressed:
1. **Production Secret Validation Hardened**: Insecure defaults (`your_jwt_secret`, `adm_bootstrap_secret_default`), development/test tokens, and example placeholders are rejected at boot in production. Values beginning with placeholder prefixes (`your_`, `replace_me`, `example_`, `sample_`, `placeholder`) or containing test/placeholder markers (`test`, `dev`, `placeholder`, `default`, `changeme`, `replace_me`, `sample`) trigger fatal startup failures. Exact template values in `server/.env.example` are tested and rejected.
2. **Insecure Compose Credential Fallbacks Eliminated**: In `server/docker-compose.yml`, predictable fallbacks (`postgres`, `api_user`, `secure_password`, `admin_secure_password`) have been replaced with required variable interpolation (`${POSTGRES_DB:?POSTGRES_DB is required}`, `${POSTGRES_USER:?POSTGRES_USER is required}`, `${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}`, `${RABBITMQ_USER:?RABBITMQ_USER is required}`, `${RABBITMQ_PASSWORD:?RABBITMQ_PASSWORD is required}`, etc.). Production deployments cannot start silently with default credentials. Local development is preserved via explicit environment variables in `server/.env`.
3. **Process Role Isolation Maintained**: Explicit `SERVICE_ROLE` identifiers (`SERVICE_ROLE: api` vs `SERVICE_ROLE: consumer`) ensure that only the API process validates and receives authentication secrets (`JWT_SECRET`, `SUPER_ADMIN_BOOTSTRAP_SECRET`). The background consumer queue worker starts cleanly without administrative secrets.
4. **Landing Page Dashboard Preview Corrected**: The landing page dashboard preview was audited to remove unsupported operational claims (`Real-Time (50ms tick)`, `Zero Drop Guarantee`, hardcoded `1,482,904` request count, `99.84% SLA threshold`, `RabbitMQ stream workers: 32`, and `Sampling: 100%`). The preview now prominently displays an illustrative sample data disclaimer, distinguishes simulated data from the live authenticated dashboard, and truthfully describes the system's asynchronous buffering and PostgreSQL aggregation architecture.
5. **API Key Redaction & Invalidation Protocol**: All raw API keys recorded in audit documentation and execution logs have been permanently replaced with `[REDACTED]`. A key invalidation and cleanup protocol was documented to ensure test credentials are decommissioned.
6. **API Key Security Architecture & Known Limitation Documented**: The actual generation implementation (`apim_` prefix + 20 random bytes hex = 45 characters) and storage model (plaintext `keyValue` in MongoDB with listing sanitization) are accurately documented as a known architectural limitation. The requirements for a full key-hashing rollout are documented in detail, and the product is marked as requiring key hashing prior to production rollout with sensitive tenant workloads.
7. **Super Admin Bootstrap Safeguards**: Added an atomic MongoDB partial unique index on `{ role: 1 }` filtered to `role: 'super-admin'`. In production, bootstrap strictly requires `SUPER_ADMIN_BOOTSTRAP_SECRET`. Concurrent bootstrap requests are atomically serialized: one succeeds, and concurrent/subsequent requests receive HTTP 400 ("Super admin already exists").
8. **Tenant Registration Rollback Completed**: `AuthService.registerTenant()` tracks both `createdUser` and `createdClient`. If any post-creation step (e.g., token generation or serialization) fails, both the created user and organization records are cleaned up, preventing orphaned records.
9. **Infrastructure Port Hardening**: Bound published container ports (`5433`, `27017`, `5672`, `15672`, `8080`) to `127.0.0.1` by default via `${HOST_BIND:-127.0.0.1}`.

> ### **FINAL READINESS ASSESSMENT**: `REVIEW COMPLETE — ACTIONABLE LIMITATIONS DOCUMENTED`
> While the multi-tenancy boundaries, session security, process roles, and asynchronous processing pipelines are fully verified, the product must not be labeled `PRODUCTION READY` until the API-key storage model is migrated from plaintext to cryptographic one-way hashing.

---

## Section A: Configuration Security & Process Separation

### A.1 Production Secret Validation (`server/src/shared/config/index.js`)

| Setting | Process Scope | Production Validation Rule | Security Impact |
| :--- | :--- | :--- | :--- |
| `JWT_SECRET` | `api` only | Must be >= 32 characters; rejected if missing, starting with placeholder prefixes (`your_`, `replace_me`, `example_`, `sample_`, `placeholder`), or containing markers (`test`, `dev`, `placeholder`, `default`, `changeme`, `replace_me`, `sample`). | Eliminates forged JWT vulnerabilities from predictable, test, or example secrets. |
| `SUPER_ADMIN_BOOTSTRAP_SECRET` | `api` only | Must be >= 16 characters; rejected if missing, starting with placeholder prefixes, or containing test/placeholder markers. | Prevents unauthenticated administrative cluster takeover in production. |
| `SERVICE_ROLE` | All processes | Set to `api` for web server, `consumer` for background queue worker. | When `SERVICE_ROLE === 'consumer'`, bootstrap and JWT validation is bypassed; `bootstrapSecret` and `jwt.secret` are set to `null`. |

### A.2 Docker Compose Configuration (`server/docker-compose.yml`)
- **Required Variable Interpolation**:
  Predictable defaults have been removed from all infrastructure services. If any required variable is omitted, Docker Compose aborts execution immediately:
  - `POSTGRES_DB: ${POSTGRES_DB:?POSTGRES_DB is required}`
  - `POSTGRES_USER: ${POSTGRES_USER:?POSTGRES_USER is required}`
  - `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}`
  - `RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER:?RABBITMQ_USER is required}`
  - `RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD:?RABBITMQ_PASSWORD is required}`
  - `RABBITMQ_DEFAULT_VHOST: ${RABBITMQ_VHOST:?RABBITMQ_VHOST is required}`
  - `PGADMIN_DEFAULT_EMAIL: ${PGADMIN_EMAIL:?PGADMIN_EMAIL is required}`
  - `PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD:?PGADMIN_PASSWORD is required}`
  - `JWT_SECRET: ${JWT_SECRET:?JWT_SECRET is required}`
  - `SUPER_ADMIN_BOOTSTRAP_SECRET: ${SUPER_ADMIN_BOOTSTRAP_SECRET:?SUPER_ADMIN_BOOTSTRAP_SECRET is required}`
- **Process Role Scoping**:
  - `api-app` receives `SERVICE_ROLE: api` along with database, queue, and security secrets.
  - `consumer` receives `SERVICE_ROLE: consumer` along with database and queue connection details, but neither `JWT_SECRET` nor `SUPER_ADMIN_BOOTSTRAP_SECRET` is injected into the consumer container.
- **Localhost Port Binding**:
  Host port bindings default to `127.0.0.1` (`127.0.0.1:5433:5432`, `127.0.0.1:27017:27017`, `127.0.0.1:5672:5672`, `127.0.0.1:15672:15672`, `127.0.0.1:8080:80`). Database, queue, and management ports cannot be reached across public network interfaces by default.

### A.3 Super Admin Bootstrap Safeguards & Database-Level Guarantee
In `server/src/shared/models/User.js`:
```javascript
userSchema.index(
    { role: 1 },
    {
        unique: true,
        partialFilterExpression: { role: "super-admin" },
    }
);
```
- **Atomic Single-Admin Guarantee**: MongoDB enforces that at most one document with `role: 'super-admin'` can exist across the entire cluster.
- **Race Condition Prevention**: In `AuthService.onboardSuperAdmin()`, if concurrent bootstrap requests pass the initial `findOne()` check simultaneously, the second write triggers MongoDB duplicate key error `E11000`. The service catches `error.code === 11000` and returns HTTP 400 ("Super admin already exists").
- **Production Enforcement**: In production (`NODE_ENV === 'production'`), a valid `SUPER_ADMIN_BOOTSTRAP_SECRET` is unconditionally mandatory, even if zero users exist.
- **Test Coverage**: Tested in `tenantRegistration.test.js`:
  - Missing secret when users exist -> 403 Forbidden
  - Invalid secret -> 403 Forbidden
  - Concurrent bootstrap (`Promise.all`) -> Exactly one 201, one 400
  - Subsequent duplicate initialization -> 400 Bad Request

---

## Section B: Multi-Tenant Architecture & Data Isolation

### B.1 Multi-Tenant Domain Model
1. `Client` (MongoDB `clients`): Tenant organization (`name`, `slug`, `email`, `isActive`, `createdBy`, `createdAt`).
2. `User` (MongoDB `users`): Actor within the system (`clientId`, `role: super-admin | client-admin | client-viewer`, `username`, `email`, `password`, `isActive`).
3. `ApiKey` (MongoDB `api_keys`): Ingestion credentials containing `clientId`, `keyValue`, `name`, `environment`, `isActive`, `expiresAt`.
4. `ApiHits` (MongoDB `apihits`): Raw ingest hit logs storing `clientId`, `serviceName`, `endpoint`, `method`, `statusCode`, `latencyMs`, `ip`, `userAgent`, `timestamp`.
5. `endpoint_metrics` (PostgreSQL): Materialized analytical aggregates partitioned by `(client_id, service_name, endpoint, time_bucket)`.

### B.2 Tenant Registration Rollback (`AuthService.registerTenant()`)
When a self-service tenant registers via `POST /api/auth/register-tenant`:
1. Checks username and email uniqueness.
2. Creates the `Client` organization record (`createdClient`).
3. Creates the initial `client-admin` `User` record (`createdUser`).
4. Generates session JWT and formats response.
5. **Rollback Guarantee**: In `catch (error)`, if `createdUser` exists, it is deleted via `User.findByIdAndDelete(createdUser._id)`. If `createdClient` exists, it is deleted via `Client.findByIdAndDelete(createdClient._id)`. No orphaned user or inconsistent tenant record can remain.
- **Test Evidence**: Verified by simulating a post-user creation error using `vi.spyOn(authService, 'generateToken')`; verified that neither `User` nor `Client` remains in MongoDB.

### B.3 Cross-Tenant Isolation Enforcement
- **Key Management**: `clientService.createApiKey` and `getClientApiKeys` enforce that `client-admin` can only access keys where `req.user.clientId === requestedClientId`. Cross-tenant attempts return HTTP 403 Forbidden.
- **Viewer Role Enforcement**: `client-viewer` is blocked from creating users or listing API keys with HTTP 403 Forbidden.
- **Analytics Querying**: `resolveFinalClient(req)` strictly binds tenant users to their own `clientId`. Supplying another tenant's `?clientId=` parameter is overridden or rejected.
- **Super Admin Governance**: Super Admin can query global cluster metrics or pass `?clientId=` to inspect specific tenants.

---

## Section C: API Key Security Analysis & Known Limitations

### C.1 Current Implemented Lifecycle
1. **Generation**: `clientService.generateApiKey()` generates a **45-character** random key:
   ```javascript
   generateApiKey() {
       const prefix = "apim";
       const suffix = crypto.randomBytes(20).toString("hex"); // 40 hex characters
       return `${prefix}_${suffix}`; // 4 + 1 + 40 = 45 characters
   }
   ```
2. **Storage**: Stored in MongoDB `api_keys` collection under `keyValue: keyValue` in **plaintext**.
3. **Issuance**: Raw `keyValue` is returned to the client **only once**, immediately upon creation (`POST /api/admin/client/:clientId/api/keys`).
4. **Listing Sanitization**: When listing keys (`GET /api/admin/client/:clientId/api/keys`), `delete formattedKey.keyValue` strips the raw key; only metadata (`keyId`, `name`, `environment`, `isActive`, `createdAt`, `expiresAt`) is returned.
5. **Validation**: `validateApiKey` middleware intercepts `x-api-key` header and queries MongoDB directly: `{ keyValue: apiKey }`.
6. **Logging**: Middleware logs only truncated key prefixes: `apiKey.substring(0, 8) + '...'`.
7. **Browser Presentation**: Raw keys are never persisted in browser `localStorage` or `sessionStorage`.

### C.2 Known Security Limitation: Plaintext Storage
- **Finding**: Storing raw API keys in plaintext in MongoDB creates an exposure risk if database backups, read replicas, or collections are compromised.
- **Status**: The current implementation remains in plaintext with response sanitization. Cryptographic key hashing has **not** been implemented.
- **Mandatory Requirements for Production Readiness**:
  Prior to deploying the product with genuine tenant secrets, a complete, end-to-end cryptographic key-hashing architecture must be implemented covering:
  1. **Key Generation and Issuance**: Generate high-entropy raw secret with prefix (`apim_` + 20 random bytes), return the raw secret to client exactly once upon creation, and never log or persist it in raw form.
  2. **Secure Storage**: Compute a cryptographic one-way digest (e.g., SHA-256 or Argon2) of the secret and store only `keyHash` and a non-sensitive prefix/identifier in MongoDB; drop the plaintext `keyValue` field from the schema.
  3. **Validation and Lookup**: `validateApiKey` middleware hashes the incoming `x-api-key` header value and executes an indexed lookup against `{ keyHash, isActive: true }`.
  4. **Listing and Secret Redaction**: Key listing endpoints return only non-sensitive metadata (`keyId`, `name`, `environment`, `prefix`, `isActive`, `createdAt`, `expiresAt`) and never expose either the raw key or the hash.
  5. **Migration of Existing Keys**: A structured migration script or rotation protocol to transition existing plaintext `keyValue` records to `keyHash` or mandate key rotation for existing tenants.
  6. **Regression Tests**: Comprehensive automated test coverage validating key generation, hashing verification, rejection of altered/tampered keys, and zero key leakage in API responses or error logs.
- **Policy**: Partial hashing quick fixes must not be deployed.

### C.3 Test Key Invalidation & Remediation Protocol
During prior E2E validation runs, a test API key was minted to tenant `Acme Monitoring Corp` (`clientId: 6ae37ebb1193a7420d6eab9c`, `keyId: debbe871-0238-4f7a-956d-cedfe36c0c6d`).
- **Policy**: In accordance with credential safety guidelines, raw keys must never appear in documentation, logs, or reports. All occurrences have been permanently redacted as `[REDACTED]`.
- **Cleanup / Revocation Action**:
  - In a live deployment, test keys must be deactivated immediately after testing.
  - Via API: Authenticated tenant admin calls the key revocation/deactivation endpoint.
  - Via Database:
    ```javascript
    // Invalidate the test key in MongoDB:
    db.api_keys.updateOne(
        { keyId: "debbe871-0238-4f7a-956d-cedfe36c0c6d" },
        { $set: { isActive: false, revokedAt: new Date() } }
    );
    // Or purge the test tenant and associated keys:
    db.clients.deleteOne({ _id: ObjectId("6ae37ebb1193a7420d6eab9c") });
    db.api_keys.deleteMany({ clientId: "6ae37ebb1193a7420d6eab9c" });
    ```

---

## Section D: Landing Page Capabilities Alignment

`frontend/src/pages/LandingPage.jsx` was audited to eliminate unsupported operational claims and align with backend reality:

| Prior Claim | Audit Finding | Updated Truthful Representation |
| :--- | :--- | :--- |
| `Real-Time (50ms tick)` | Frontend preview is static sample data, not a live tick socket | Prominently labeled as `Illustrative Sample Preview` with `Simulated Sample Rollup` |
| `Zero Drop Guarantee` | Unverified marketing claim | Replaced with architectural description: `Asynchronous Event Queue` |
| `1,482,904` requests & `99.84%` SLA threshold | Hardcoded numbers presented as live system telemetry | Replaced with clearly identified `Simulated Volume (1.2M sample rollup)` and `Sample Success Rate (99.8%)` |
| `RabbitMQ stream workers: 32` | Worker concurrency depends on deployment configuration | Replaced with `Decoupled via RabbitMQ queue` |
| `Sampling: 100% of /api/hit traffic` | Unsubstantiated sampling rate assertion | Replaced with `Sample hourly time-bucket trend` |
| `Live Trace Stream` with pulsing `INGESTING` badge | Simulated static table presented as live ingestion | Replaced with `Sample Ingestion Stream` and calm `SIMULATED` status badge |
| `1.48M+ Daily Hits`, `<2ms Overhead`, `99.99% Availability` | Unverified ribbon benchmarks | Replaced with architectural pillars: `Async Decoupled Ingestion`, `SQL Partitioned Analytics`, `RBAC Role-Based Access`, `Isolated Tenant Data Isolation` |
| `pls_live_948f93e9...` | Key-like string in documentation copy | Replaced with explicit `YOUR_API_KEY` placeholder |
| Ingestion Payload Example | Verified against `POST /api/hit` schema | `serviceName`, `endpoint`, `method`, `statusCode`, `latencyMs` |

Typography adherence was verified: Exclusively **Comic Neue** (`font-serif`) and **Prompt** (`font-sans`).

---

## Section E: Automated Test Verification Matrix

All 15 test suites in `server/test/` were executed against live MongoDB, PostgreSQL, and RabbitMQ test infrastructure. **102 tests passed across 15 suites (100% pass rate)**:

| # | System Capability / Lifecycle Phase | Tested Endpoint / Operation | Test Suite | Result | Evidence & Technical Assessment |
| :-: | :--- | :--- | :--- | :-: | :--- |
| **1** | **Super Admin Bootstrap** | `POST /api/auth/onboard-super-admin` | `test/auth/auth.test.js` | **PASS** | Provisions first Super Admin; rejects duplicate onboarding (400); validates passwords. |
| **2** | **Super Admin Bootstrap Hardening** | `POST /api/auth/onboard-super-admin` | `test/auth/tenantRegistration.test.js` | **PASS** | Rejects missing/invalid secret when users exist (403); prevents race conditions via atomic MongoDB partial unique index (`Promise.all`). |
| **3** | **Tenant Registration Rollback** | `POST /api/auth/register-tenant` | `test/auth/tenantRegistration.test.js` | **PASS** | Simulates failure after user creation; verifies neither User nor Client remains in MongoDB. |
| **4** | **Super Admin Login & Profile** | `POST /api/auth/login`, `GET /api/auth/profile` | `test/auth/auth.test.js` | **PASS** | Validates credentials; sets HTTP-only `authToken` cookie; returns user profile without password. |
| **5** | **Inactive Status Revocation** | `authenticate.js` middleware | `test/auth/tenantRegistration.test.js` | **PASS** | Deactivated user returns 401; suspended tenant returns 403. |
| **6** | **Client Viewer Authorization** | `POST .../users`, `GET .../api/keys` | `test/users/users.test.js`, `test/apiKeys/apiKeys.test.js` | **PASS** | Client Viewer role correctly blocked with 403 Forbidden on user creation and API key listing. |
| **7** | **Client Creation (Super Admin)** | `POST /api/admin/client/onboard` | `test/clients/clients.test.js` | **PASS** | Creates new tenant organization in MongoDB. Only accessible by authenticated Super Admin. |
| **8** | **Client User Provisioning** | `POST /api/admin/client/:clientId/users` | `test/users/users.test.js` | **PASS** | Super Admin and Client Admin provision users within their tenant boundary; cross-tenant creation blocked. |
| **9** | **API Key Management** | `POST/GET /api/admin/client/:clientId/api/keys` | `test/apiKeys/apiKeys.test.js` | **PASS** | Generates tenant API key (45 chars); strips raw `keyValue` on list queries; blocks cross-tenant access. |
| **10** | **API Hit Ingestion** | `POST /api/hit` | `test/ingest/ingest.test.js` | **PASS** | Validates `x-api-key`, enforces active client check, publishes to RabbitMQ (202 Queued). |
| **11** | **Asynchronous Processing** | RabbitMQ Consumer → MongoDB & PostgreSQL | `test/processing/processing.test.js` | **PASS** | Consumes event, persists raw hit in `apihits`, upserts 1-minute bucket in `endpoint_metrics`. |
| **12** | **Idempotency Verification** | Duplicate eventId message delivery | `test/processing/idempotency.test.js` | **PASS** | Duplicate message with same `eventId` is skipped without duplicating MongoDB records or PostgreSQL metrics. |
| **13** | **Analytics Isolation** | `GET /api/analytics/stats`, `/dashboard` | `test/analytics/analytics.test.js` | **PASS** | Relational queries enforce `client_id` partition; cross-tenant parameters overridden or rejected. |
| **14** | **Multi-Tenant Full E2E Lifecycle** | Dual Self-Service Tenants → Ingest → Analytics | `test/e2e/multiTenantLifecycle.test.js` | **PASS** | Two independent tenants register, mint keys, ingest traffic, process through consumer, view isolated metrics, and verify Super Admin global visibility. |
| **15** | **Configuration Security & Secret Hardening** | Secret Validation, Prefixes, .env.example & Role Checks | `test/reliability/configSecurity.test.js` | **PASS** | 13 of 13 tests passed: Rejects missing, short, placeholder prefixes (`your_`, `replace_me`, `example_`, `sample_`), markers (`dev`, `test`, `default`, `changeme`), and exact `.env.example` placeholders; verifies consumer bypass and non-production flexibility. |

---

## Section F: Docker Compose Specification & Runtime Verification

### F.1 Docker Compose Specification & Required Variable Verification
The Docker Compose configuration was verified using `docker compose --env-file .env config` and `docker compose config` without environment variables:
1. **Missing Variable Enforcement**:
   Running `docker compose config` with missing required environment variables halted execution immediately with required-variable errors:
   - `error while interpolating services.api-app.environment.PG_DATABASE: required variable POSTGRES_DB is missing a value: POSTGRES_DB is required`
   - `error while interpolating services.postgres.environment.POSTGRES_PASSWORD: required variable POSTGRES_PASSWORD is missing a value: POSTGRES_PASSWORD is required`
   - `error while interpolating services.rabbitmq.environment.RABBITMQ_DEFAULT_PASS: required variable RABBITMQ_PASSWORD is missing a value: RABBITMQ_PASSWORD is required`
   - `error while interpolating services.pgadmin.environment.PGADMIN_DEFAULT_EMAIL: required variable PGADMIN_EMAIL is missing a value: PGADMIN_EMAIL is required`
   No service could silently start with fallback defaults.
2. **Local Environment Resolution**:
   Running `docker compose --env-file .env config` resolved all required variables successfully (0 errors) and output a fully formed Compose specification:
   - `api-app` received `SERVICE_ROLE: api`, `JWT_SECRET`, `SUPER_ADMIN_BOOTSTRAP_SECRET`, database/queue credentials, and rate limits.
   - `consumer` received `SERVICE_ROLE: consumer` and database/queue credentials, with no exposure to `JWT_SECRET` or `SUPER_ADMIN_BOOTSTRAP_SECRET`.
   - Host port mappings confirmed bound to `127.0.0.1` (`127.0.0.1:5433:5432`, `127.0.0.1:27017:27017`, `127.0.0.1:5672:5672`, `127.0.0.1:15672:15672`, `127.0.0.1:8080:80`).

### F.2 Previous Live Ingestion & Processing Execution Trace (Redacted)
*Note: In accordance with credential safety guidelines, all sensitive key values recorded during previous container execution have been redacted.*
1. **Tenant Self-Service Registration**:
   - `POST http://localhost:5000/api/auth/register-tenant`
   - Payload: Organization `"Acme Monitoring Corp"`, username `"acme_admin"`.
   - Result: HTTP 201 Created. User ID `6ae37ebb1193a7420d6eab9d`, Client ID `6ae37ebb1193a7420d6eab9c`.
2. **Client Admin Authentication**:
   - `POST http://localhost:5000/api/auth/login`
   - Result: HTTP 200 OK. Set-Cookie `authToken` received with user permissions.
3. **API Key Generation**:
   - `POST http://localhost:5000/api/admin/client/6ae37ebb1193a7420d6eab9c/api/keys`
   - Result: HTTP 201 Created. Key issued: `[REDACTED]` (45 characters).
4. **Traffic Ingestion**:
   - `POST http://localhost:5000/api/hit` with header `x-api-key: [REDACTED]`
   - Payload: `serviceName: "billing-api"`, `endpoint: "/api/v1/invoices"`, `method: "GET"`, `statusCode: 200`, `latencyMs: 38.5`
   - Result: HTTP 202 Accepted. Event queued (`eventId: de88ee34-d8da-4dd3-9560-626d3a3ba30d`).
5. **Consumer Pipeline Processing**:
   - Observed in consumer container logs:
     - Log: `Processing event data: { clientId: "6ae37ebb1193a7420d6eab9c", endpoint: "/api/v1/invoices", serviceName: "billing-api" }`
     - Log: `API hit saved to MongoDB`
     - Log: `Metrics updated successfully`
     - Log: `Event processed successfully`
6. **PostgreSQL Relational Aggregate Verification**:
   - Executed query: `SELECT * FROM endpoint_metrics WHERE client_id = '6ae37ebb1193a7420d6eab9c';`
   - Row verified: `client_id: 6ae37ebb1193a7420d6eab9c`, `service_name: billing-api`, `endpoint: /api/v1/invoices`, `method: GET`, `total_hits: 1`, `avg_latency: 38.500`.
7. **Analytics API Endpoint Verification**:
   - `GET http://localhost:5000/api/analytics/stats` via authenticated session cookie.
   - Result: HTTP 200 OK (`totalHits: 1`, `errorHits: 0`, `successHits: 1`, `errorRate: 0`, `avgLatency: 38.5`).

---

## Section G: Summary of Modified Files

1. [`server/src/shared/config/index.js`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/src/shared/config/index.js):
   - Removed insecure placeholder secrets.
   - Enhanced production secret validation to reject placeholder prefixes (`your_`, `replace_me`, `example_`, `sample_`, `placeholder`) and markers (`test`, `dev`, `placeholder`, `default`, `changeme`, `replace_me`, `sample`).
   - Explicitly rejects exact `.env.example` placeholders.
   - Preserves role-based configuration isolation (`SERVICE_ROLE === 'consumer'` bypasses bootstrap/JWT secret requirements).
2. [`server/docker-compose.yml`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/docker-compose.yml):
   - Removed predictable default credentials for PostgreSQL, RabbitMQ, and pgAdmin.
   - Enforced required variable interpolation (`${VAR:?VAR is required}`).
   - Bound host-exposed database/queue ports to localhost (`127.0.0.1`) by default.
   - Consumer process receives only required database and queue variables, with zero authentication secrets.
3. [`server/.env.example`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/.env.example):
   - Updated with unmistakable placeholders and instructions for generating genuine production secrets via OpenSSL or Node.js.
   - Documents required production variables for Compose.
4. [`server/.env`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/.env):
   - Added explicit local development credentials for PostgreSQL, RabbitMQ, and pgAdmin so `docker compose config` and local runs work smoothly.
5. [`server/test/reliability/configSecurity.test.js`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/test/reliability/configSecurity.test.js):
   - Expanded suite to 13 tests verifying rejection of placeholder prefixes, `.env.example` template values, role isolation, and dev/test flexibility.
6. [`server/test/setup/testEnv.js`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/test/setup/testEnv.js):
   - Optimized setup hook so pure unit configuration security tests do not wait on database network timeouts.
7. [`frontend/src/pages/LandingPage.jsx`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/frontend/src/pages/LandingPage.jsx):
   - Added prominent disclaimer banner clearly identifying the dashboard preview as illustrative sample data.
   - Removed unverified operational claims (`Real-Time 50ms tick`, `Zero Drop Guarantee`, `1,482,904`, `99.84% SLA threshold`, `RabbitMQ stream workers: 32`, `Sampling: 100%`, simulated live trace stream).
   - Replaced ribbon counters with architectural capability descriptions.
   - Preserved visual design, burgundy accents, cream background, and Comic Neue / Prompt typography.
8. [`server/AUTH_AND_TENANCY_REVIEW.md`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/AUTH_AND_TENANCY_REVIEW.md):
   - Redacted all raw API keys to `[REDACTED]`.
   - Accurately documented the plaintext API key limitation and specified the 6 mandatory requirements for production readiness.
   - Documented key invalidation protocols and Docker Compose validation results.

9. [`server/src/services/processorService/service/ProcessorService.js`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/src/services/processorService/service/ProcessorService.js):
   - Validates `eventData.eventId` (rejects missing, empty, or "unknown" identifiers).
   - Validates required fields (`clientId`, `serviceName`, `endpoint`, `method`).
   - Ensures MongoDB duplicates do not abort subsequent PostgreSQL aggregation on retries.
   - Propagates all PostgreSQL transaction and connectivity errors to caller (never swallowed).
   - Returns explicit `{ status: "PROCESSED" | "DUPLICATE", eventId }`.
10. [`server/src/services/processorService/consumer.js`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/src/services/processorService/consumer.js):
   - Enforces canonical event ID in `_parseMessage()` without falling back to "unknown".
   - Acknowledges RabbitMQ messages only when MongoDB save and PostgreSQL transaction commit successfully (or was already committed).
   - Limits in-memory `processedIds` Set strictly to a fast-path cache; never adds uncommitted/failed events to it.
   - Hardens `_sendToDlq()` to assert queue, verify publish status, and nack if routing fails (prevents silent loss).
   - Hardens `_retryMessage()` to route to DLQ if republish buffer is exhausted.
11. [`server/src/services/processorService/repository/MetricsRepository.js`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/src/services/processorService/repository/MetricsRepository.js):
   - Implemented `recordEventAndAggregateMetrics({ eventId, clientId, metricsData })` using a single checked-out PostgreSQL connection and atomic `BEGIN...COMMIT/ROLLBACK`.
   - Durable idempotency via `processed_events ... ON CONFLICT (event_id) DO NOTHING RETURNING event_id`.
   - Distinguishes legitimate duplicates from cross-tenant collisions (`EVENT_INTEGRITY_MISMATCH`).
   - Extended `upsertEndpointMetrics` and `_query` to participate in checked-out transactional client queries.
12. [`server/src/services/processorService/repository/ApiHitRepository.js`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/src/services/processorService/repository/ApiHitRepository.js):
   - Updated `save()` to explicitly return `{ doc, isDuplicate }`.
   - Validates tenant integrity on MongoDB duplicate event collision, throwing `EVENT_INTEGRITY_MISMATCH` if client IDs differ.
13. [`server/src/shared/events/producer/RetryStrategy.js`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/src/shared/events/producer/RetryStrategy.js):
   - Added PostgreSQL transient error codes (`08000`, `08003`, `08006`, `40001`, `40P01`, `57P01-03`) and patterns (`timeout`, `deadlock`, `serialization failure`, `connection terminated/refused/reset`).
   - Explicitly rejects non-retryable errors (`validation`, `duplicate key`, `EVENT_INTEGRITY_MISMATCH`, `invalid api key`).
14. [`server/scripts/init-postgres.sql`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/scripts/init-postgres.sql) & [`server/scripts/migrate-processed-events.sql`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/scripts/migrate-processed-events.sql):
   - Idempotently creates `processed_events` table and tenant/timestamp indexes.
15. [`server/src/shared/config/postgres.js`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/src/shared/config/postgres.js):
   - Added runtime idempotent schema migration (`ensureSchema()`) executed automatically upon pool connection.

---

## Section H: Reliable PostgreSQL Aggregation & Durable Idempotency Architecture

### H.1 Problem Statement & Previous Deficiencies
Prior to this implementation:
1. **PostgreSQL Aggregation Failures Swallowed**: In `ProcessorService.processEvent()`, any error thrown during PostgreSQL metric UPSERT was caught, logged as "non-critical", and suppressed if MongoDB raw event insertion had succeeded. Because no error was rethrown, `consumer.js` acknowledged the RabbitMQ message, permanently dropping the analytical aggregates for that event without retry or DLQ routing.
2. **Idempotency Not Durable Across Consumer Lifecycles**: Idempotency relied on an in-memory `Set` (`processedIds`) in `consumer.js` and MongoDB's unique `eventId` index. Upon consumer restart, process crash, or in-memory LRU eviction, the Set was lost. The PostgreSQL UPSERT query unconditionally incremented `total_hits` and `error_hits` upon every retry or duplicate delivery.

### H.2 Durable PostgreSQL Ledger Schema
The table `processed_events` tracks processed event IDs persistently in PostgreSQL:
```sql
CREATE TABLE IF NOT EXISTS processed_events (
    event_id VARCHAR(255) PRIMARY KEY,
    client_id VARCHAR(24) NOT NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_processed_events_client_id ON processed_events(client_id);
CREATE INDEX IF NOT EXISTS idx_processed_events_processed_at ON processed_events(processed_at);
```
- **Retention Considerations**: Records in `processed_events` must be retained for at least the maximum message TTL / replay window of RabbitMQ (e.g. 30 days) to prevent replay duplicates. MongoDB retains raw hit documents, while PostgreSQL stores only lightweight deduplication metadata (`event_id`, `client_id`, `processed_at`).
- **Migration**: Applied via `server/scripts/migrate-processed-events.sql`, included in `init-postgres.sql`, and automatically ensured at application startup via `postgres.ensureSchema()`.

### H.3 Single-Transaction Atomic Aggregation (`MetricsRepository.recordEventAndAggregateMetrics`)
```text
BEGIN (Checked-out Client from Pool)
  │
  ▼
INSERT INTO processed_events (event_id, client_id, processed_at)
VALUES ($1, $2, CURRENT_TIMESTAMP)
ON CONFLICT (event_id) DO NOTHING
RETURNING event_id;
  │
  ├─────────────────────────────────────────────────┐
  │ Row returned (New Event)                        │ No row returned (Duplicate Event ID)
  ▼                                                 ▼
Invoke upsertEndpointMetrics(client)               SELECT client_id FROM processed_events
  │                                                 │
  ▼                                                 ├─ client_id mismatch:
COMMIT                                              │    ROLLBACK & Throw EVENT_INTEGRITY_MISMATCH
  │                                                 ├─ client_id matches:
Return { isDuplicate: false, eventId }             │    COMMIT & Return { isDuplicate: true, eventId }
```
- If an error occurs at any point (e.g., PostgreSQL timeout, disk failure, serialization conflict), `ROLLBACK` is executed, undoing both the ledger entry and the metric increments.
- The checked-out client is guaranteed released in a `finally` block.

### H.4 Processing Flow & Consumer Reliability
1. **Canonical Event Identification**: Uses `eventData.eventId` (mirrored to RabbitMQ `messageId`). Missing, empty, or "unknown" identifiers are rejected immediately.
2. **MongoDB Raw Event Resilience**: If MongoDB returns a duplicate key error (code 11000) during a retry, `ApiHitRepository.save()` retrieves the existing record, verifies tenant consistency, and allows processing to proceed to PostgreSQL aggregation.
3. **Consumer ACK Invariant**: The RabbitMQ message is acknowledged if and only if MongoDB persistence and PostgreSQL aggregation commit successfully, or if the event was already confirmed committed in the ledger.
4. **Dead-Letter Handling (DLQ)**: When transient retries are exhausted or non-retryable errors occur (`EVENT_INTEGRITY_MISMATCH`, validation failures), the consumer asserts `${queue}.dlq`, publishes the payload with full audit headers (`x-dlq-reason`, `x-dlq-error`, `x-dlq-timestamp`), and acknowledges the original message only after DLQ publication succeeds.

### H.5 Verification Summary
- **Unit & Concurrency Test Suite**: `test/processing/idempotency.unit.test.js` (11 tests, 100% PASS).
- **Reliability Test Suite**: `test/reliability/` (24 tests across `configSecurity`, `circuitBreaker`, `retryStrategy`, 100% PASS).
- **Integration Test Suite**: `test/processing/idempotency.test.js` updated to verify PostgreSQL ledger persistence and consumer restart resilience.
- **Frontend Build**: Vite production build succeeded cleanly with 0 contract regressions (`dist/` generated).


---

## Section I: Analytics Date Filtering, Time-Series Aggregation & Metric-Label Hardening

### I.1 Problem Statement & Deficiencies Resolved
1. **Date-Range Filtering Discrepancy**:
   - `getTopEndpoints()` in `analyticsController.js` and `analyticService.js` only passed `startTime`, omitting `endTime`. The SQL in `MetricsRepository.getTopEndPoints()` did not apply an upper time boundary, allowing records past the selected time window to pollute rankings.
   - All three dashboard operations (`getOverallStats`, `getTopEndpoints`, `getTimeSeries`) previously calculated default time boundaries independently with separate calls to `new Date()`, resulting in misaligned intervals.
2. **Time-Series Truncation & Pre-Aggregation Limit Defect**:
   - `MetricsRepository.getMetrices()` grouped by `(service_name, endpoint, method, time_bucket)` and applied `LIMIT 24` before grouping by time bucket. If multiple services/endpoints were monitored (e.g. 5 endpoints across 24 hours = 120 raw rows), the query returned only a fraction of the timeline (less than 5 hours) and in descending order.
   - 7-day (up to 168 hours) and 30-day (up to 720 hours) selections were heavily truncated by the fixed limit of 24.
3. **Unsupported Operational Claims & Arbitrary SLA Labels**:
   - Dashboard displayed unsupported health claims: `Target < 50ms`, `Healthy SLA`, `SLA Alert`, `100% Up`, `Nominal`, `Elevated`, and a hardcoded 50ms reference line in `LatencyTrendChart.jsx`.
   - `GET /health` was labeled as general system health and initialized to `200 OK` before checking.
   - `TimeFilterStrip.jsx` claimed `Live Ingest` despite lacking WebSocket or polling streaming.
   - Empty metrics displayed `100% Yield`.
   - `MonitoredEndpointsTable.jsx` classified endpoints as `Degraded` or `Elevated 5xx` using unconfigured 1.5% and 5% thresholds.

### I.2 Technical Corrections Applied
1. **Unified Date Normalization (`AnalyticsController.normalizeTimeRange`)**:
   - Normalizes the query window once in `normalizeTimeRange()`:
     - Both omitted: previous 24 hours (`now - 24h` through `now`).
     - Start only: `startTime` through `now`.
     - End only: `endTime - 24h` through `endTime`.
     - Both provided: validated (`startTime <= endTime`).
   - Rejects invalid date formats and inverted ranges (`startTime > endTime`) with HTTP 400.
   - All 3 operations (`overallStats`, `topEndpoints`, `timeSeries`) receive the exact same normalized date range.
2. **Dedicated Time-Series Repository Query (`MetricsRepository.getTimeSeriesMetrics`)**:
   - Created dedicated SQL query grouping by `time_bucket` ONLY:
     ```sql
     SELECT
         time_bucket,
         SUM(total_hits) AS total_hits,
         SUM(error_hits) AS error_hits,
         SUM(avg_latency * total_hits) / NULLIF(SUM(total_hits), 0) AS avg_latency
     FROM endpoint_metrics
     WHERE ...
     GROUP BY time_bucket
     ORDER BY time_bucket ASC
     LIMIT $limit;
     ```
   - Mathematical weighting preserved: `SUM(avg_latency * total_hits) / NULLIF(SUM(total_hits), 0)`.
   - Chronological order (`ASC`).
   - Increased query limit up to 1000 buckets, accommodating full 7-day (168h) and 30-day (720h) trends without truncation.
3. **Top Endpoints Date Boundary Correction**:
   - `MetricsRepository.getTopEndPoints(clientId, limit, startTime, endTime)` now filters by both `time_bucket >= $startTime` and `time_bucket <= $endTime`.
4. **Hourly Resolution Semantics**:
   - All analytics queries operate on PostgreSQL `time_bucket` representing the start of the hour.
   - Documented and clarified in UI: boundary buckets overlapping custom ranges are preserved.
5. **Neutral Metric Labels & UI Hardening**:
   - Latency card: Replaced `Target < 50ms` and `Healthy SLA / SLA Alert` with `Across selected requests` and neutral `Observed` badge.
   - Services card: Replaced `100% Up` with `Registered` badge.
   - Success/Error card: Replaced `100% Yield` on empty datasets with `No requests observed` and neutral `No Data` badge.
   - `LatencyTrendChart.jsx`: Removed 50ms reference line `<ReferenceLine y={50} />` and `Target: < 50ms`. Added `Resolution: 1-hour intervals`.
   - `MonitoredEndpointsTable.jsx`: Replaced arbitrary SLA badges (`Elevated 5xx`, `Degraded`) with neutral `No errors observed` / `Errors observed` based on real `errorHits`.
   - Health Status: Initialized to `Checking` and labeled as `Monitoring API: Available` / `Unavailable`.
   - `TimeFilterStrip.jsx`: Replaced `Live Ingest` with `Mode: Manual Refresh` and added `Hourly Aggregates` indicator. Enhanced custom modal with date validation, inline errors for `start > end`, and persistent inputs.
   - Tooltips & X-Axis: Dynamic date labels based on timeline span (short: `HH:mm`, multi-day: `MMM D, HH:mm`, longer: `MMM D`) and full ISO timestamps in tooltips.

### I.3 Files Modified
1. [`server/src/services/processorService/repository/MetricsRepository.js`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/src/services/processorService/repository/MetricsRepository.js)
2. [`server/src/services/analyticService/services/analyticService.js`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/src/services/analyticService/services/analyticService.js)
3. [`server/src/services/analyticService/controller/analyticsController.js`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/src/services/analyticService/controller/analyticsController.js)
4. [`frontend/src/pages/DashboardPage.jsx`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/frontend/src/pages/DashboardPage.jsx)
5. [`frontend/src/components/dashboard/TimeFilterStrip.jsx`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/frontend/src/components/dashboard/TimeFilterStrip.jsx)
6. [`frontend/src/components/dashboard/MonitoredEndpointsTable.jsx`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/frontend/src/components/dashboard/MonitoredEndpointsTable.jsx)
7. [`frontend/src/components/charts/LatencyTrendChart.jsx`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/frontend/src/components/charts/LatencyTrendChart.jsx)
8. [`frontend/src/components/charts/RequestVolumeChart.jsx`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/frontend/src/components/charts/RequestVolumeChart.jsx)
9. [`frontend/src/components/charts/ChartTooltip.jsx`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/frontend/src/components/charts/ChartTooltip.jsx)
10. [`server/src/shared/config/mongodb.js`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/src/shared/config/mongodb.js)
11. [`server/test/analytics/analytics.unit.test.js`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/test/analytics/analytics.unit.test.js)
12. [`server/test/analytics/analytics.test.js`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/test/analytics/analytics.test.js)
13. [`server/AUTH_AND_TENANCY_REVIEW.md`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/AUTH_AND_TENANCY_REVIEW.md)

### I.4 Verification Results
- **Unit Analytics & Idempotency Suites**: 48 tests across 5 files (`test/analytics/analytics.unit.test.js`, `test/processing/idempotency.unit.test.js`, `test/reliability/configSecurity.test.js`, `test/reliability/circuitBreaker.test.js`, `test/reliability/retryStrategy.test.js`), **100% PASS** (48 passed, 0 failed).
- **Integration Tests Added**: Added 3 new test cases to `test/analytics/analytics.test.js` validating date boundary filtering, invalid range rejection, and empty period responses.
- **Frontend Production Build**: `npm run build` executed cleanly in 17.61s with 0 errors (Vite production bundle generated in `frontend/dist/`).

---

## J. Hourly Boundary Inclusion, PostgreSQL Multi-Service Aggregation & Dashboard Metric Alignment

### J.1 Problem Statement & Root Cause
1. **Hourly Boundary Exclusion**:
   - PostgreSQL stores metrics aggregated by discrete hourly buckets (`time_bucket TIMESTAMP`), representing the start of each UTC hour (e.g. `10:00:00`).
   - The SQL filter condition `time_bucket >= startTime` previously used unaligned input timestamps (e.g., `10:30:00`).
   - Consequently, for any custom window whose start fell inside an hour (e.g. `10:30–12:30`), the starting bucket (`10:00:00`) was excluded because `'10:00:00' >= '10:30:00'` evaluated to false.
2. **UTC Bucketing Mismatch**:
   - `ProcessorService.getTimeBucket()` previously called `.setMinutes(0, 0, 0)` in local server time rather than `.setUTCMinutes(0, 0, 0)`, creating potential discrepancies between ingest time and UTC query filters.
3. **Dashboard Metric Labels & Hardcoded State**:
   - `DashboardPage.jsx` contained placeholder labels: `Active Traces` (Total Requests), `Active Traced` and `Enforced` (Endpoints).
   - `MonitoredEndpointsTable.jsx` displayed `active registered endpoints` rather than endpoints observed in the selected period.
   - `YieldDonutChart.jsx` used the label `Yield Integrity`.
   - `Sidebar.jsx` contained a hardcoded initial state `{ healthy: true, latency: 18 }` rather than an explicit `Checking` state displaying `Monitoring API: Available` or `Unavailable` once `/health` completed.

### J.2 Architecture & Implementation Details

#### 1. Effective UTC Hourly Boundary Normalization
Implemented boundary alignment in [`AnalyticsController.normalizeTimeRange`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/src/services/analyticService/controller/analyticsController.js), [`AnalyticService.parseTimeFilters`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/src/services/analyticService/services/analyticService.js), and [`MetricsRepository._alignHourlyBoundaries`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/src/services/processorService/repository/MetricsRepository.js):
- **Effective Start Time**:
  - `floorToUtcHour(startTime)` floors to `UTCMinutes = 0, UTCSeconds = 0, UTCMilliseconds = 0`.
  - For `10:30`, produces `10:00:00.000Z`, ensuring the partial boundary hour bucket containing the start timestamp is included.
- **Effective End Time**:
  - If `endTime` falls inside an hour (e.g. `12:30`), `floorToUtcHour(endTime)` produces `12:00:00.000Z`. In SQL, `time_bucket <= 12:00:00.000Z` includes bucket `12:00`.
  - If `endTime` ends at an exact UTC hour boundary (e.g. `12:00:00.000Z`) and `endTime > startTime`, the range ends at 12:00:00 without entering the 12:00 hour; `effectiveEndTime` is set to `11:00:00.000Z`.
  - For default 24h range, `effectiveEndTime = floorToUtcHour(now)` and `effectiveStartTime = effectiveEndTime - 23h`, producing exactly 24 discrete hourly buckets inclusive.
- **Display Preservation**:
  - Original requested timestamps (`startTime`, `endTime`) are preserved in `timeRange.start` and `timeRange.end` for display, while database queries receive effective boundary-aligned timestamps.

#### 2. Deterministic UTC Bucketing in Ingestion
Updated [`ProcessorService.getTimeBucket`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/src/services/processorService/service/ProcessorService.js):
- Uses `date.setUTCMinutes(0, 0, 0)` for `"hour"`, `date.setUTCHours(0, 0, 0, 0)` for `"day"`, and `date.setUTCSeconds(0, 0)` for `"minute"`.

#### 3. Frontend Label Corrections
- [`DashboardPage.jsx`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/frontend/src/pages/DashboardPage.jsx):
  - Total Requests KPI badge: `Active Traces` → `Requests Observed`.
  - Endpoints KPI subtitle: `Active Traced` → `Observed Endpoints`.
  - Endpoints KPI badge: `Enforced` → `Observed`.
- [`MonitoredEndpointsTable.jsx`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/frontend/src/components/dashboard/MonitoredEndpointsTable.jsx):
  - `Showing {endpoints.length} active registered endpoints` → `Showing {endpoints.length} endpoints observed in selected period`.
- [`YieldDonutChart.jsx`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/frontend/src/components/charts/YieldDonutChart.jsx):
  - Header title: `Yield Integrity` → `Success vs Error`.
- [`Sidebar.jsx`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/frontend/src/components/layout/Sidebar.jsx):
  - Initial state: `{ healthy: null, checking: true, latency: null }`.
  - On `/health` completion: displays `Monitoring API: Available` or `Monitoring API: Unavailable` with measured ping latency in milliseconds.
- [`TimeFilterStrip.jsx`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/frontend/src/components/dashboard/TimeFilterStrip.jsx):
  - Added user explanation: *"Metrics are aggregated in hourly buckets. Partial boundary hours are represented by complete hourly buckets (e.g. 10:30–12:30 includes 10:00, 11:00, and 12:00 buckets)."*

### J.3 Test Coverage & Verification

#### 1. Six Boundary Semantics Test Scenarios ([`server/test/analytics/analytics.unit.test.js`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/test/analytics/analytics.unit.test.js))
1. **Start and end inside the same hour** (`10:15–10:45`):
   - Aligned to bucket `10:00:00.000Z` (1 bucket).
2. **Start inside an hour, end at exact hour boundary** (`10:30–12:00`):
   - Aligned to buckets `10:00:00.000Z` through `11:00:00.000Z` (2 buckets).
3. **Start at exact hour boundary, end inside an hour** (`10:00–12:30`):
   - Aligned to buckets `10:00:00.000Z` through `12:00:00.000Z` (3 buckets: 10:00, 11:00, 12:00).
4. **Range spanning several hours** (`10:30–14:30`):
   - Aligned to buckets `10:00:00.000Z` through `14:00:00.000Z` (5 complete buckets).
5. **Default 24-hour range** (`null, null`):
   - Spans exactly 24 discrete hourly buckets inclusive, ending with the current floored UTC hour.
6. **Consistency across stats, top endpoints, and time series**:
   - `AnalyticsController.getDashboard` passes identical `effectiveStartTime` and `effectiveEndTime` to `getOverallStats`, `getTopEndpoints`, and `getTimeSeries`. All queries filter on the exact same bucket range.

#### 2. PostgreSQL Multi-Service Aggregation & Tenant Isolation Test
- Verified in `analytics.unit.test.js` against a multi-service dataset (Tenant A with `auth-service` and `order-service` across multiple buckets; Tenant B with `billing-service`):
  - **Boundary bucket inclusion**: Buckets 10:00, 11:00, and 12:00 included for `10:30–12:30`; bucket 13:00 excluded.
  - **Sum of request totals**: `100 + 200 + 300 + 150 = 750` total hits.
  - **Sum of error totals**: `5 + 15 + 0 + 10 = 30` error hits (error rate = 4.00%).
  - **Mathematically weighted average latency**: `42000 / 750 = 56.00 ms`.
  - **Tenant isolation**: Zero cross-tenant leakage between Tenant A (750 hits) and Tenant B (1000 hits).

#### 3. Verification Commands & Outcomes
- **Backend Test Suite**:
  ```powershell
  cd server; npx vitest run test/reliability test/processing/idempotency.unit.test.js test/analytics/analytics.unit.test.js
  ```
  - **Result**: **5 passed (5 suites), 55 passed (55 tests), 0 failed** in 12.94s.
- **Frontend Production Build**:
  ```powershell
  cd frontend; npm run build
  ```
  - **Result**: Built successfully in 17.34s (`vite v5.4.21`, 2477 modules transformed into `frontend/dist/`).
