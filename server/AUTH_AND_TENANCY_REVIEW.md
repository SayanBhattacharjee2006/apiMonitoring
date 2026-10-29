# Multi-Tenant Authentication Audit, Data Isolation Review, and System Verification Report

**Date of Audit**: October 29, 2026  
**Auditor**: Senior Backend Engineer, Application Security Reviewer, Multi-Tenant Systems Architect & React Test Engineer  
**Codebase Under Review**: API Monitoring Platform (`server/` and `frontend/`)  
**Backend Framework**: Node.js, Express, MongoDB (Mongoose), PostgreSQL (`pg`), RabbitMQ (`amqplib`), Vitest, Supertest  
**Frontend Framework**: React 18, Vite, Tailwind CSS, Zustand, Axios, Recharts, Lucide React  

---

## Executive Summary

A comprehensive architectural and application security audit was performed on the API Monitoring System backend authentication and multi-tenancy implementation, paired with frontend integration and executable automated verification across **15 test suites (99 tests, 100% pass rate)**, real Docker container validation, and a clean frontend production build.

The review confirmed that the system provides **strict multi-tenant data isolation**, **robust RBAC boundaries**, **idempotent asynchronous ingestion pipelines**, and **strict PostgreSQL analytics partition boundaries**. 

Specific confirmed security, authorization, and correctness issues identified during review were systematically addressed:
1. **Production Secret Validation Hardened**: Insecure defaults (`your_jwt_secret`, `adm_bootstrap_secret_default`) removed. In production, missing secrets, short secrets (JWT < 32 chars, Bootstrap < 16 chars), placeholder secrets, and any strings containing development/test markers (`test`, `dev`, `placeholder`, `default`, `changeme`) trigger fatal startup errors.
2. **Docker Consumer Startup Failure Resolved via Process Separation**: `api-app` and `consumer` processes run with explicit `SERVICE_ROLE` identifiers (`SERVICE_ROLE: api` vs `SERVICE_ROLE: consumer`). The consumer process does not receive, require, or validate `SUPER_ADMIN_BOOTSTRAP_SECRET` or `JWT_SECRET`, preventing production crash loops while keeping the bootstrap secret strictly scoped to the API container.
3. **Database & Infrastructure Credential Hardening**: Externalized PostgreSQL, RabbitMQ, and pgAdmin credentials using environment variable interpolation with fallback. Bound all published host ports (`5433`, `27017`, `5672`, `15672`, `8080`) to `127.0.0.1` by default via `${HOST_BIND:-127.0.0.1}`. Created `server/.env.example` as a clean production template.
4. **Super Admin Bootstrap Secured & Concurrency-Protected**: Added an atomic MongoDB partial unique index on `{ role: 1 }` filtered to `role: 'super-admin'`. In production, bootstrap strictly requires `SUPER_ADMIN_BOOTSTRAP_SECRET`. Concurrent bootstrap requests are atomically serialized: one succeeds, and concurrent/subsequent requests receive HTTP 400 ("Super admin already exists").
5. **Tenant Registration Rollback Completed**: `AuthService.registerTenant()` tracks both `createdUser` and `createdClient`. If any post-creation step (e.g., token generation or serialization) fails, both the created user and organization records are cleaned up, preventing orphaned records.
6. **API Key Security Claims Corrected & Architecture Documented**: Landing page copy was updated to remove unsupported claims of salted SHA-512 hashing and placeholder keys replaced with `YOUR_API_KEY`. The actual generation implementation (`apim_` prefix + 20 random bytes hex = 45 characters) and storage model (plaintext `keyValue` in MongoDB with listing sanitization) are accurately documented as a known architectural limitation requiring hashing prior to production rollout.
7. **Landing Page Capabilities Aligned**: Removed unsupported claims regarding distributed tracing, payload inspection, automated alerting, OpenTelemetry SDK, p95/p99 latency, and static operational badges. Ingestion examples match the real `POST /api/hit` schema (`serviceName`, `endpoint`, `method`, `statusCode`, `latencyMs`).
8. **Docker Build Context Protected**: Added `server/.dockerignore` to prevent leaking `.env*`, `.git`, `node_modules`, `test`, and `logs` into Docker build contexts.
9. **Full Real Runtime & E2E Verification**: Verified in real Docker containers (`api-monitoring-app` and `api-monitoring-consumer`) and automated suites (`test/e2e/multiTenantLifecycle.test.js`, `test/reliability/configSecurity.test.js`) verifying self-service tenants through registration, key minting, ingest, consumer processing, MongoDB/Postgres isolation, and Super Admin global visibility.

> ### **FINAL READINESS ASSESSMENT**: `REVIEW COMPLETE — ACTIONABLE LIMITATIONS DOCUMENTED`
> While the multi-tenancy boundaries, session security, process roles, and asynchronous processing pipelines are fully verified in real Docker environments, the product must not be labeled `PRODUCTION READY` until the API-key storage model is migrated from plaintext to cryptographic one-way hashing.

---

## Section A: Configuration Security & Process Separation

### A.1 Production Secret Validation (`server/src/shared/config/index.js`)

| Setting | Process Scope | Production Validation Rule | Security Impact |
| :--- | :--- | :--- | :--- |
| `JWT_SECRET` | `api` only | Must be >= 32 characters; rejected if missing, equal to known placeholders, or containing `test`, `dev`, `placeholder`, `default`, `changeme`. | Eliminates forged JWT vulnerabilities from predictable or test secrets. |
| `SUPER_ADMIN_BOOTSTRAP_SECRET` | `api` only | Must be >= 16 characters; rejected if missing, equal to known placeholders, or containing `test`, `dev`, `placeholder`, `default`, `changeme`. | Prevents unauthenticated administrative cluster takeover in production. |
| `SERVICE_ROLE` | All processes | Set to `api` for web server, `consumer` for background queue worker. | When `SERVICE_ROLE === 'consumer'`, bootstrap and JWT validation is bypassed; `bootstrapSecret` and `jwt.secret` are set to `null`. |

### A.2 Docker Compose Configuration (`server/docker-compose.yml`)
- **API Service (`api-app`)**:
  - `SERVICE_ROLE: api`
  - `JWT_SECRET: ${JWT_SECRET:?JWT_SECRET is required}`
  - `SUPER_ADMIN_BOOTSTRAP_SECRET: ${SUPER_ADMIN_BOOTSTRAP_SECRET:?SUPER_ADMIN_BOOTSTRAP_SECRET is required}`
- **Consumer Service (`consumer`)**:
  - `SERVICE_ROLE: consumer`
  - Neither `SUPER_ADMIN_BOOTSTRAP_SECRET` nor `JWT_SECRET` is injected into the container environment. The consumer starts and operates without administrative privileges or secrets.
- **Credential Externalization & Localhost Port Binding**:
  - PostgreSQL credentials: `${POSTGRES_USER:-postgres}`, `${POSTGRES_PASSWORD:-postgres}`, `${POSTGRES_DB:-api_monitoring}`
  - RabbitMQ credentials: `${RABBITMQ_USER:-api_user}`, `${RABBITMQ_PASSWORD:-secure_password}`, `${RABBITMQ_VHOST:-api_monitoring}`
  - pgAdmin credentials: `${PGADMIN_EMAIL:-admin@api-monitoring.com}`, `${PGADMIN_PASSWORD:-admin123}`
  - Published host ports bound to `${HOST_BIND:-127.0.0.1}` (`127.0.0.1:5433:5432`, `127.0.0.1:27017:27017`, `127.0.0.1:5672:5672`, `127.0.0.1:15672:15672`, `127.0.0.1:8080:80`). Database and queue services are never directly reachable across external network interfaces by default.

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
- **Remediation Plan (Pre-Production Requirement)**:
  - Add a `keyHash` field in `ApiKey` schema (SHA-256).
  - Store only `keyHash` and a display prefix (e.g., `apim_56ca...`).
  - In `validateApiKey`, compute `crypto.createHash('sha256').update(apiKey).digest('hex')` and query `{ keyHash }`.
  - Drop the plaintext `keyValue` field.
- **Marketing / Copy Correction**: All claims of "Salted SHA-512 hashing" were purged from `LandingPage.jsx`.

---

## Section D: Landing Page Capabilities Alignment

`frontend/src/pages/LandingPage.jsx` was audited to eliminate unsupported claims and align with backend reality:

| Prior Claim | Audit Finding | Updated Truthful Representation |
| :--- | :--- | :--- |
| `pls_live_948f93e9...` | Key-like string in documentation copy | Replaced with explicit `YOUR_API_KEY` placeholder |
| "Salted SHA-512 key hash tokens" | Hashing not implemented; raw keys stored in DB | Replaced with "Scoped tenant authentication keys" |
| "p95 Latency Ledger" & "p99: 68ms" | Backend computes arithmetic weighted mean latency | Replaced with "Average Latency" / "weighted mean" |
| "Sub-millisecond overhead (<0.4ms)" | Unmeasured benchmark claim | Replaced with architectural description of async queuing |
| "Distributed Tracing" & "Payload Analysis" | Only endpoint-level hit ingestion is implemented | Replaced with "High-throughput hit ingestion" and "Endpoint Analytics" |
| "OpenTelemetry SDK" | Ingestion uses lightweight custom HTTP POST payload | Replaced with "HTTP Ingest Protocol" |
| "All Systems Operational" badge | Static unverified badge | Replaced with static platform identity; removed false operational guarantee |
| Ingestion Payload Example | Verified against `POST /api/hit` schema | `serviceName`, `endpoint`, `method`, `statusCode`, `latencyMs` |

Typography adherence was verified: Exclusively **Comic Neue** (`font-serif`) and **Prompt** (`font-sans`).

---

## Section E: Automated Test Verification Matrix

All 15 test suites in `server/test/` were executed against live MongoDB, PostgreSQL, and RabbitMQ test infrastructure. **99 of 99 tests passed (100% pass rate)**:

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
| **15** | **Configuration Security & Role Separation** | Secret Validation & Role Checks | `test/reliability/configSecurity.test.js` | **PASS** | Validates rejection of missing, short, placeholder, and dev/test secrets in production; validates consumer role bypass and non-production flexibility. |

---

## Section F: Real Docker Runtime End-to-End Verification

*Note: The following results document actual executable commands run against the live Docker containers (`api-monitoring-app` and `api-monitoring-consumer`) in the local Docker Desktop environment.*

### F.1 Container Startup & Health Verification
1. **Container Images Built**: `server-api-app:latest` and `server-consumer:latest` built via `docker compose build`.
2. **Services Started**: `docker compose up -d` started all 6 services:
   - `api-monitoring-postgres`: Up (healthy), bound to `127.0.0.1:5433->5432`
   - `api-monitoring-rabbitmq`: Up (healthy), bound to `127.0.0.1:5672->5672`, `127.0.0.1:15672->15672`
   - `api-monitoring-mongo`: Up, bound to `127.0.0.1:27017->27017`
   - `api-monitoring-pgadmin`: Up, bound to `127.0.0.1:8080->80`
   - `api-monitoring-app`: Up, HTTP 200 on `GET /health` (`status: healthy`, `uptime: 31.98s`)
   - `api-monitoring-consumer`: Up, connected to MongoDB, PostgreSQL, and RabbitMQ; listening on `api_hits` queue without errors.

### F.2 Live Ingestion & Processing Execution Trace
1. **Tenant Self-Service Registration**:
   - `POST http://localhost:5000/api/auth/register-tenant`
   - Payload: Organization `"Acme Monitoring Corp"`, username `"acme_admin"`.
   - Result: HTTP 201 Created. User ID `6ae37ebb1193a7420d6eab9d`, Client ID `6ae37ebb1193a7420d6eab9c`.
2. **Client Admin Authentication**:
   - `POST http://localhost:5000/api/auth/login`
   - Result: HTTP 200 OK. Set-Cookie `authToken` received with user permissions.
3. **API Key Generation**:
   - `POST http://localhost:5000/api/admin/client/6ae37ebb1193a7420d6eab9c/api/keys`
   - Result: HTTP 201 Created. Key issued: `apim_56ca2cfd596a8fa4cb17fc8b44f4f9273e23cca0` (45 characters).
4. **Traffic Ingestion**:
   - `POST http://localhost:5000/api/hit` with header `x-api-key: apim_56ca2cfd596a8fa4cb17fc8b44f4f9273e23cca0`
   - Payload: `serviceName: "billing-api"`, `endpoint: "/api/v1/invoices"`, `method: "GET"`, `statusCode: 200`, `latencyMs: 38.5`
   - Result: HTTP 202 Accepted. Event queued (`eventId: de88ee34-d8da-4dd3-9560-626d3a3ba30d`).
5. **Consumer Pipeline Processing**:
   - Checked `docker logs api-monitoring-consumer --tail 30`:
     - Log: `Processing event data: { clientId: "6ae37ebb1193a7420d6eab9c", endpoint: "/api/v1/invoices", serviceName: "billing-api" }`
     - Log: `API hit saved to MongoDB`
     - Log: `Metrics updated successfully`
     - Log: `Event processed successfully`
6. **PostgreSQL Relational Aggregate Verification**:
   - Executed SQL query in container: `SELECT * FROM endpoint_metrics WHERE client_id = '6ae37ebb1193a7420d6eab9c';`
   - Output row verified:
     - `client_id`: `6ae37ebb1193a7420d6eab9c`
     - `service_name`: `billing-api`
     - `endpoint`: `/api/v1/invoices`
     - `method`: `GET`
     - `total_hits`: `1`
     - `avg_latency`: `38.500`
7. **Analytics API Endpoint Verification**:
   - `GET http://localhost:5000/api/analytics/stats` via authenticated session cookie.
   - Result: HTTP 200 OK:
     ```json
     {
       "totalHits": 1,
       "errorHits": 0,
       "successHits": 1,
       "errorRate": 0,
       "avgLatency": 38.5,
       "uniqueServices": 1,
       "uniqueEndpoints": 1
     }
     ```

---

## Section G: Summary of Modified Files

1. [`server/src/shared/config/index.js`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/src/shared/config/index.js):
   - Removed insecure placeholder secrets.
   - Added production secret validation rejecting short, placeholder, and dev/test marked strings.
   - Added role-based configuration isolation (`SERVICE_ROLE === 'consumer'` bypasses bootstrap/JWT secret requirements).
2. [`server/Dockerfile`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/Dockerfile): Added `ENV SERVICE_ROLE=api`.
3. [`server/Dockerfile.consumer`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/Dockerfile.consumer): Added `ENV SERVICE_ROLE=consumer`.
4. [`server/docker-compose.yml`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/docker-compose.yml):
   - Added `SERVICE_ROLE: api` and `SERVICE_ROLE: consumer`.
   - Removed `SUPER_ADMIN_BOOTSTRAP_SECRET` and `JWT_SECRET` from the consumer service.
   - Externalized database/queue credentials via environment variables.
   - Bound exposed database/queue ports to `${HOST_BIND:-127.0.0.1}`.
5. [`server/.env.example`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/.env.example): Created reference template documenting all required production configuration variables, database credentials, and port binds.
6. [`server/.env`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/.env): Configured strong non-dev bootstrap secret for local Compose testing.
7. [`server/test/reliability/configSecurity.test.js`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/test/reliability/configSecurity.test.js): Added 10-test suite verifying production secret validation and process role isolation.
8. [`server/src/shared/models/User.js`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/src/shared/models/User.js): Added atomic partial unique index on `{ role: 1 }` filtered to `role: 'super-admin'`.
9. [`server/src/services/authService/services/authService.js`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/src/services/authService/services/authService.js):
   - `onboardSuperAdmin`: Mandates bootstrap secret in production and maps duplicate key error (code 11000) to 400.
   - `registerTenant`: Implemented comprehensive compensating rollback cleaning up both `createdUser` and `createdClient` on failure.
10. [`server/test/setup/testDatabase.js`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/test/setup/testDatabase.js): Added `User.syncIndexes()` to synchronize MongoDB indexes before test runs.
11. [`server/test/auth/tenantRegistration.test.js`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/test/auth/tenantRegistration.test.js): Added regression tests for invalid secrets, concurrent bootstrap race condition protection, and user/client rollback.
12. [`server/test/e2e/multiTenantLifecycle.test.js`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/test/e2e/multiTenantLifecycle.test.js): Added complete multi-tenant lifecycle integration test for two self-service tenants.
13. [`frontend/src/pages/LandingPage.jsx`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/frontend/src/pages/LandingPage.jsx): Replaced key string with `YOUR_API_KEY`, removed unsupported claims (SHA-512, p95/p99, distributed tracing, sub-millisecond guarantees, static operational badge), and aligned copy with real backend capabilities.
14. [`server/AUTH_AND_TENANCY_REVIEW.md`](file:///c:/Users/sayan/OneDrive/Desktop/Learnings/projects/apiMonitoring/server/AUTH_AND_TENANCY_REVIEW.md): Fully updated audit report documenting findings, fixes, test matrix, and plaintext key storage limitation.
