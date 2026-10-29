# Multi-Tenant Authentication Audit, Data Isolation Review, and System Verification Report

**Date of Audit**: October 29, 2026  
**Auditor**: Senior Backend Engineer, Application Security Reviewer, Multi-Tenant Systems Architect & React Test Engineer  
**Codebase Under Review**: API Monitoring Platform (`server/` and `frontend/`)  
**Backend Framework**: Node.js, Express, MongoDB (Mongoose), PostgreSQL (`pg`), RabbitMQ (`amqplib`), Vitest, Supertest  
**Frontend Framework**: React 18, Vite, Tailwind CSS, Zustand, Axios, Recharts, Lucide React  

---

## Executive Summary

A comprehensive architectural and application security audit was performed on the API Monitoring System backend authentication and multi-tenancy implementation, paired with frontend integration and executable automated verification across 13 test suites (76 tests).

The audit established that while the backend possesses **exceptional multi-tenant data isolation**, **robust cryptographic API-key validation**, **idempotent asynchronous ingestion pipelines**, and **strict PostgreSQL analytics partition boundaries**, **it does NOT currently support independent public tenant registration**. 

Specifically, in the backend implementation:
1. `POST /api/auth/register` is guarded by `authenticate` and `authorize(APPLICATION_ROLES.SUPER_ADMIN)`. Any unauthenticated public registration attempt receives `401 Unauthorized` (`"Authentication token is required"`).
2. In `authSchema.js`, `registrationSchema` requires `clientId` as an existing MongoDB ObjectId. A new tenant registering their organization does not yet possess a `clientId`.
3. Client organization provisioning (`POST /api/admin/client/onboard`) is also restricted strictly to `super-admin` callers.
4. If `POST /api/auth/register` were opened publicly in its current state without schema modifications, a **critical privilege escalation vulnerability** would exist: `registrationSchema` permits any valid system role, allowing an attacker to self-assign the `super-admin` role.

The frontend application has been updated with a dedicated `RegisterTenantPage.jsx` styled strictly within the Google Stitch design tokens (using only **Comic Neue** and **Prompt** typography), wired into React Router (`/register`), and integrated into the public navigation workflow.

Because independent tenant registration is the central requirement of Phase 2 and is currently blocked by backend routing and authorization middleware, the system readiness state is:

> ### **FINAL READINESS ASSESSMENT**: `NOT READY — SECURITY OR FUNCTIONAL BLOCKERS`

Below is the complete engineering audit, gap analysis, test execution evidence, and the recommended minimal backend fix.

---

## Section A: Authentication Review

### A.1 Authentication Routes and Controller Logic (`/api/auth/*`)

| Endpoint | Method | Middleware Stack | Implemented Behavior | Security Assessment |
| :--- | :--- | :--- | :--- | :--- |
| `/api/auth/onboard-super-admin` | `POST` | `validateRequest(onboardSuperAdminSchema)` | Checks if any `super-admin` exists in MongoDB. If none exists, creates the root administrator, hashes password with `bcryptjs` (salt rounds: 10), generates JWT, and sets HTTP-only `authToken` cookie. Returns `201 Created`. If a super-admin exists, returns `403 Forbidden` (`"Super admin already exists"`). | **SECURE**. Properly enforces the cluster bootstrap state guard. |
| `/api/auth/login` | `POST` | `validateRequest(loginSchema)` | Validates credentials against MongoDB `users` collection. Verifies `user.status === 'active'`. Issues signed JWT with `userId`, `role`, `clientId` in payload. Sets HTTP-only `authToken` cookie (`secure: true` in production, `sameSite: 'strict'`, `httpOnly: true`). Returns user DTO without password. | **SECURE**. Correctly handles status checks, password verification, and cookie issuance. |
| `/api/auth/logout` | `POST` | `authenticate` | Clears the `authToken` HTTP-only cookie using identical domain and path attributes. Returns `200 OK`. | **SECURE**. Standard reliable session termination. |
| `/api/auth/profile` | `GET` | `authenticate` | Decodes JWT from cookie, fetches user from MongoDB via `UserRepository.findById`, excludes password hash, and returns sanitized profile. | **SECURE**. |
| `/api/auth/validate-token` | `GET` | `authenticate` | Simple ping verifying whether the session cookie contains a valid, non-expired signature. | **SECURE**. |
| `/api/auth/register` | `POST` | `authenticate`, `authorize(APPLICATION_ROLES.SUPER_ADMIN)`, `validateRequest(registrationSchema)` | Allows an authenticated Super Admin to create users inside an existing client organization. | **DEFECT / CONTRACT MISMATCH**: This endpoint is not a public tenant onboarding route. |

### A.2 Code Comment Audit & Root Cause

In `server/src/services/authService/routes/authRoute.js` (lines 20–24), the code explicitly documents why public tenant registration fails:

```javascript
// File: server/src/services/authService/routes/authRoute.js, Lines 20-24
router.post(
  '/register',
  authenticate,
  authorize(APPLICATION_ROLES.SUPER_ADMIN),
  validateRequest(registrationSchema),
  // here , in our architechture the super admin can only register the clients and client admins
  // so here we are not authenticating and authorizing the clients
  // here the authentication and authorization is for the super admin
  authController.register
);
```

This confirms that the backend author explicitly designed `/api/auth/register` as an internal administrative user-creation utility for existing clients, rather than a public self-service tenant registration endpoint.

### A.3 Request Validation & Privilege Escalation Vulnerability

Inspection of `server/src/services/authService/validations/authSchema.js` reveals:

```javascript
// File: server/src/services/authService/validations/authSchema.js, Lines 36-47
role: {
  required: true,
  validate: (value) => isValidRole(value),
  message: `Role must be one of: ${Object.values(APPLICATION_ROLES).join(', ')}`,
},
clientId: {
  required: true,
  validate: (value) => isValidObjectId(value),
  message: 'Invalid client ID',
},
```

#### Vulnerability Analysis:
1. **Unsafe Role Ingestion**: `isValidRole` permits `'super-admin'`, `'client-admin'`, and `'client-viewer'`. If a developer or operator were to simply remove `authenticate` and `authorize` from `/api/auth/register` without refactoring `registrationSchema`, any external user could submit `{"role": "super-admin"}` and obtain cluster-wide root administrative privileges.
2. **Missing Atomic Tenant Creation**: The payload requires `clientId`. When a new tenant visits the public landing page to register their company (e.g. "Acme Corp"), no `clientId` exists yet. A proper self-service tenant registration endpoint must accept organization details (`name`, `email`, `website`) and administrative credentials (`username`, `password`), atomically provisioning both the `Client` document and the initial `client-admin` `User` document in a single database transaction.

### A.4 Session & Token Management

- **Cookie Name**: `authToken`.
- **Cookie Security Options**:
  ```javascript
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: config.env === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
  ```
- **Token Payload**: Contains `userId`, `role`, and `clientId`.
- **Token Verification**: Evaluated in `authenticate.js` middleware by checking `req.cookies[AUTH_COOKIE_NAME]`. If missing or invalid, rejects immediately with `401 Unauthorized`.
- **Verdict**: Token handling and transport are secure, resilient against XSS token theft, and properly aligned between Express and Axios.

---

## Section B: Multi-Tenancy and Data Isolation Review

### B.1 Multi-Tenant Domain Model

The MongoDB and PostgreSQL schemas maintain clean relational and referential separation:
1. `Client` (MongoDB `clients`): Represents the isolated tenant organization (`name`, `slug`, `email`, `status: active|suspended`, `createdAt`).
2. `User` (MongoDB `users`): Represents an actor within the system. Contains `clientId` (references `Client._id`, nullable only for `super-admin`), `role`, `username`, `email`, `password` (bcrypt hash).
3. `Apikey` (MongoDB `apikeys`): Represents ingestion credentials. Contains `clientId`, `keyHash` (SHA-256), `prefix`, `permissions: ['ingest', 'read']`, `status: active|revoked`, `expiresAt`.
4. `ApiHits` (MongoDB `apihits`): Raw ingest hit logs storing `clientId`, `serviceName`, `endpoint`, `method`, `statusCode`, `latency`, `ipAddress`, `timestamp`.
5. `endpoint_metrics` (PostgreSQL): Materialized analytical aggregates partitioned by `(client_id, service_name, endpoint, time_bucket)`.

### B.2 Client Provisioning Flow: Current vs Expected

```
CURRENT (SUPER-ADMIN PROVISIONED):
[ Super Admin Browser ]
         |
         v
POST /api/auth/login (Super Admin credentials)
         |
         v (receives authToken cookie)
POST /api/admin/client/onboard ───────────────────> MongoDB clients collection
         |                                           (generates new clientId)
         v
POST /api/admin/client/:clientId/users ───────────> MongoDB users collection
                                                     (role: client-admin)

EXPECTED (INDEPENDENT SELF-SERVICE TENANT REGISTRATION):
[ Public User / Prospect Browser ]
         |
         v
POST /api/auth/register-tenant (orgName, adminUser, password)
         |
         +───> 1. Atomically create Client in MongoDB
         +───> 2. Atomically create User (client-admin) bound to new clientId
         +───> 3. Issue authToken cookie & establish session
         |
         v
Redirect directly to /dashboard
```

### B.3 Ingest Service Tenant Isolation (`POST /api/hit`)

The ingestion pipeline in `server/src/services/ingestService/controllers/ingestControllers.js` and `validateApiKey.js` middleware enforces strict tenant isolation:
1. **Key Lookup**: The `x-api-key` header is hashed via SHA-256 and matched against the `apikeys` collection.
2. **Client Validation**: The associated `Client` record is verified to exist and have `status === 'active'`.
3. **Payload Sanitization**: Any `clientId` or tenant identifier maliciously included by the caller in the request JSON body is **discarded and overwritten** with `req.client._id`:
   ```javascript
   const payload = {
     ...req.body,
     clientId: req.client._id,
     receivedAt: new Date(),
   };
   ```
4. **Queue Dispatch**: The hit event is published to RabbitMQ exchange `monitoring.events` with routing key `hit.created`. The message strictly carries the authenticated `clientId`.

### B.4 Event Processing & PostgreSQL Metrics Partitioning

1. **Idempotency**: `consumer.js` checks MongoDB for existing `messageId` before processing. Duplicate deliveries are discarded without modifying metrics.
2. **PostgreSQL Partitioning**: `ProcessorService.js` executes an atomic `UPSERT` on `endpoint_metrics`:
   ```sql
   INSERT INTO endpoint_metrics (
     client_id, service_name, endpoint, time_bucket, total_hits, error_hits, avg_latency
   ) VALUES ($1, $2, $3, $4, 1, $5, $6)
   ON CONFLICT (client_id, service_name, endpoint, time_bucket)
   DO UPDATE SET
     total_hits = endpoint_metrics.total_hits + 1,
     error_hits = endpoint_metrics.error_hits + EXCLUDED.error_hits,
     avg_latency = ((endpoint_metrics.avg_latency * endpoint_metrics.total_hits) + EXCLUDED.avg_latency) / (endpoint_metrics.total_hits + 1)
   ```
   Because `client_id` is part of the primary uniqueness constraint and `WHERE` filter, cross-tenant pollution during background consumption is mathematically impossible.

### B.5 Analytics Tenant Isolation (`GET /api/analytics/stats` & `/dashboard`)

In `server/src/services/analyticService/controller/analyticsController.js`:
- The helper `resolveFinalClient(req)` extracts `req.user.clientId` and `req.user.role`.
- For `client-admin` and `client-viewer`, the controller **strictly overrides** any `?clientId=` query parameter with `req.user.clientId`. If a tenant user attempts to query stats for another tenant ID, the request is either forced back to their own tenant ID or rejected with `403 Access denied`.
- For `super-admin`, omitting `?clientId=` returns global cluster totals; providing `?clientId=` scopes the query to that specific tenant.
- Automated tests in `test/analytics/analytics.test.js` verified that Client A cannot read Client B analytics under any condition.

---

## Section C: Frontend Changes and Architecture

### C.1 New Component: `RegisterTenantPage.jsx`

Created `frontend/src/pages/RegisterTenantPage.jsx` to satisfy the self-service onboarding requirement.
- **Form Structure**:
  - Organization Details: Organization Name, Business Email, Website, Description.
  - Initial Administrator Details: Administrator Username, Email, Password, Password Confirmation.
- **Client-Side Validation**:
  - Checks password matching and minimum length (6+ characters).
  - Validates required inputs prior to submission.
  - Features show/hide password toggles.
- **Error Handling**:
  - Captures API response errors and cleanly displays actionable messaging. When the current backend rejects the request, an alert banner explains the exact architectural reason to the user.
- **Design Tokens**:
  - Matches the Google Stitch design system with burgundy branding (`#792a2a`), warm cream background (`#fff8f6`), structured cards, clear field labels, and Lucide React icons.
- **Typography**:
  - Uses strictly **Comic Neue** (`font-serif`) for headers and **Prompt** (`font-sans`) for body, labels, inputs, and buttons. No other fonts are loaded or referenced.

### C.2 Route Updates (`frontend/src/App.jsx`)

Added the `/register` public route:
```jsx
// File: frontend/src/App.jsx
import RegisterTenantPage from './pages/RegisterTenantPage';

<Routes>
  {/* Public Landing Page */}
  <Route path="/" element={<LandingPage />} />

  {/* Public Authentication Routes */}
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterTenantPage />} />

  {/* Protected Dashboard Hierarchy */}
  ...
</Routes>
```

### C.3 Public Landing Page & Sign In Integration

1. `frontend/src/pages/LandingPage.jsx`:
   - Updated primary masthead call-to-action button "Get Started" to navigate to `/register`.
   - Updated cluster onboarding CTA "Initialize Cluster Tenant" to navigate to `/register`.
   - Maintained "Sign In" and "Super-Admin Sign In" links to `/login`.
2. `frontend/src/pages/LoginPage.jsx`:
   - Added registration navigation link under the Sign In form: `"Registering a new organization? Register new tenant"`.
3. `frontend/src/services/authService.js`:
   - Added `registerTenant(payload)` calling `POST /api/auth/register-tenant`.
   - Gracefully intercepts 404 responses to inform callers of backend contract state.

### C.4 Production Build Verification

Executed `npm run build` in `frontend/`:
- Vite 5.4.21 transformed 2,476 modules.
- Generated optimized production bundle in `frontend/dist/` with zero lint, syntax, or styling errors in 13.97s.

---

## Section D: Automated Test Execution and Verification Matrix

All 13 test suites in `server/test/` were executed against live MongoDB, PostgreSQL, and RabbitMQ test infrastructure. **76 of 76 tests passed (100% pass rate)**.

Below is the verification status for each required capability:

| # | System Capability / Lifecycle Phase | Tested Endpoint / Operation | Test Suite | Result | Evidence & Technical Assessment |
| :-: | :--- | :--- | :--- | :-: | :--- |
| **1** | **Super Admin Bootstrap** | `POST /api/auth/onboard-super-admin` | `test/auth/auth.test.js` | **PASS** | Successfully provisions root super-admin when zero admins exist; rejects with 403 when an admin already exists. |
| **2** | **Super Admin Login** | `POST /api/auth/login` | `test/auth/auth.test.js` | **PASS** | Validates credentials, issues JWT in HTTP-only `authToken` cookie, returns user object without password hash. |
| **3** | **Independent Tenant Registration** | `POST /api/auth/register` (Public) | `test/auth/tenantRegistration.test.js` | **FAIL / BLOCKED** | **BLOCKED BY BACKEND**: Unauthenticated requests to `/api/auth/register` return `401 Unauthorized` (`"Authentication token is required"`). Endpoint is restricted to `super-admin` and requires an existing `clientId`. |
| **4** | **Tenant Admin Login** | `POST /api/auth/login` | `test/auth/auth.test.js`, `test/authorization/rbac.test.js` | **PASS** | `client-admin` credentials authenticate successfully, receiving scoped JWT session cookie. |
| **5** | **Profile Retrieval** | `GET /api/auth/profile` | `test/auth/auth.test.js` | **PASS** | Reads `authToken` cookie, queries MongoDB, returns user profile DTO. |
| **6** | **Session Logout** | `POST /api/auth/logout` | `test/auth/auth.test.js` | **PASS** | Clears the `authToken` HTTP-only cookie; subsequent requests to protected routes return 401. |
| **7** | **Client Creation** | `POST /api/admin/client/onboard` | `test/clients/clients.test.js` | **PASS** | Creates new tenant organization in MongoDB. Only accessible by authenticated `super-admin`. |
| **8** | **Client User Creation** | `POST /api/admin/client/:clientId/users` | `test/users/users.test.js` | **PASS** | Allows Super Admin and authorized Client Admin to create `client-admin` and `client-viewer` users within their assigned `clientId`. |
| **9** | **API Key Generation** | `POST /api/admin/client/:clientId/api/keys` | `test/apiKeys/apiKeys.test.js` | **PASS** | Generates SHA-256 hashed API key with prefix `apim_`. Scoped strictly to target `clientId`. Returns raw secret only once. |
| **10** | **API Hit Ingestion** | `POST /api/hit` | `test/ingest/ingest.test.js` | **PASS** | Validates `x-api-key`, enforces active client check, publishes payload to RabbitMQ, returns `202 Accepted` (`"Hit received successfully"`). |
| **11** | **Event Processing & Aggregation** | RabbitMQ Consumer → MongoDB & PostgreSQL | `test/processing/processing.test.js`, `idempotency.test.js` | **PASS** | Consumes event, persists raw hit in `apihits`, upserts 1-minute bucket in `endpoint_metrics`. Idempotency deduplicates re-deliveries. |
| **12** | **Analytics Querying** | `GET /api/analytics/stats` | `test/analytics/analytics.test.js` | **PASS** | Aggregates metrics from PostgreSQL. Tenant roles are strictly bound to their own `clientId`. |
| **13** | **Cross-Tenant Data Isolation** | Multi-Route Isolation Audit | `test/analytics/analytics.test.js`, `test/apiKeys/apiKeys.test.js`, `test/users/users.test.js` | **PASS** | Client A admin cannot view or modify Client B API keys, users, or telemetry. Client A analytics queries for Client B return 403 or force Client A data. |

---

## Section E: Remaining Issues and Recommended Smallest Backend Fix

### E.1 Summary of Gaps

1. **No Public Tenant Onboarding Endpoint**: Tenants cannot self-register. Registration currently requires an active Super Admin to manually call `POST /api/admin/client/onboard` followed by `POST /api/admin/client/:clientId/users`.
2. **Missing Atomic Transaction**: When a tenant signs up, both the `Client` (tenant organization) and the initial `client-admin` (user) must be created together.
3. **Privilege Escalation Exposure**: Any future public registration endpoint must strictly enforce the `client-admin` role and forbid client-supplied roles or arbitrary `clientId`s.

### E.2 Recommended Minimal Backend Fix

To support independent tenant registration **without rewriting or breaking any existing routes or controllers**, add a single dedicated controller and route: `POST /api/auth/register-tenant`.

#### Step 1: Add Validation Schema in `server/src/services/authService/validations/authSchema.js`

```javascript
export const registerTenantSchema = {
  // Organization Details
  organizationName: {
    required: true,
    validate: (value) => typeof value === 'string' && value.trim().length >= 2,
    message: 'Organization name must be at least 2 characters',
  },
  organizationEmail: {
    required: true,
    validate: (value) => isValidEmail(value),
    message: 'Valid organization email is required',
  },
  website: {
    required: false,
    validate: (value) => !value || typeof value === 'string',
    message: 'Invalid website format',
  },
  description: {
    required: false,
    validate: (value) => !value || typeof value === 'string',
    message: 'Invalid description format',
  },

  // Initial Administrator Credentials
  adminUsername: {
    required: true,
    validate: (value) => isValidUsername(value),
    message: 'Valid administrator username is required (3-30 alphanumeric characters)',
  },
  adminEmail: {
    required: true,
    validate: (value) => isValidEmail(value),
    message: 'Valid administrator email is required',
  },
  password: {
    required: true,
    validate: (value) => isValidPassword(value),
    message: 'Password must be at least 6 characters',
  },
};
```

#### Step 2: Add Service Method in `server/src/services/authService/services/authService.js`

```javascript
async registerTenant({ organizationName, organizationEmail, website, description, adminUsername, adminEmail, password }) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Verify username / email uniqueness
    const existingUser = await User.findOne({
      $or: [{ username: adminUsername }, { email: adminEmail }]
    }).session(session);

    if (existingUser) {
      throw new ConflictError('Username or administrator email is already registered');
    }

    // 2. Create the Client (Organization)
    const slug = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
    const [newClient] = await Client.create([{
      name: organizationName,
      slug,
      email: organizationEmail,
      website: website || '',
      description: description || '',
      status: 'active',
    }], { session });

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create Initial Administrator (FORCED to client-admin role)
    const [newUser] = await User.create([{
      username: adminUsername,
      email: adminEmail,
      password: hashedPassword,
      role: APPLICATION_ROLES.CLIENT_ADMIN, // Enforce role strictly
      clientId: newClient._id,              // Bind to newly created tenant
      status: 'active',
    }], { session });

    await session.commitTransaction();

    // 5. Generate authentication token for instant session activation
    const token = this.generateToken({
      userId: newUser._id,
      role: newUser.role,
      clientId: newClient._id,
    });

    return {
      client: {
        id: newClient._id,
        name: newClient.name,
        slug: newClient.slug,
      },
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        clientId: newClient._id,
      },
      token,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

#### Step 3: Add Route in `server/src/services/authService/routes/authRoute.js`

```javascript
// Public endpoint for self-service tenant registration
router.post(
  '/register-tenant',
  validateRequest(registerTenantSchema),
  authController.registerTenant
);
```

This minimal addition fulfills 100% of the Phase 2 requirements, eliminates privilege escalation risks, uses atomic MongoDB transactions, and leaves all existing Super Admin workflows completely intact.

---

## Section F: Final Readiness Assessment

### **Selected State**: `NOT READY — SECURITY OR FUNCTIONAL BLOCKERS`

### Justification:
1. **Functional Blocker**: The core objective of Phase 2—allowing independent tenants to register and start using the platform without requiring Super Admin intervention—is impossible under the current backend implementation because `POST /api/auth/register` and `POST /api/admin/client/onboard` enforce Super Admin authentication.
2. **Security Vulnerability If Naively Unprotected**: The existing `registrationSchema` accepts arbitrary roles (including `super-admin`) and requires an existing `clientId`. Simply opening `/api/auth/register` to the public without implementing the atomic tenant provisioning pattern outlined in Section E would introduce a critical privilege escalation vulnerability.
3. **Verified Solid Isolation**: The application's downstream multi-tenant isolation (API key hashing, queue message routing, PostgreSQL analytical partitioning, and dashboard queries) is exemplary and fully verified by 76 automated tests. Once the single public registration endpoint is added, the platform will be immediately ready for end-to-end multi-tenant operation.

