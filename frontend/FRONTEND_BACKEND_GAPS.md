# API Monitoring Frontend-Backend Capabilities, Gaps & Multi-Tenant Audit

This document catalogs architectural alignments, backend endpoints, and capabilities represented in the Google Stitch design system versus the current Express/MongoDB/PostgreSQL backend implementation.

---

## 1. Multi-Tenant Onboarding & Independent Registration

| Capability / User Journey | Backend Status | Backend Endpoint | Frontend Handling |
| :--- | :--- | :--- | :--- |
| **Independent Tenant Registration** | **Fully Supported** | `POST /api/auth/register-tenant` | Implemented in `RegisterTenantPage.jsx` (`/register`). "Create your workspace" flow with distinct sections for Organization Details and Administrator Account, plus inline real-time password policy feedback. Authenticates immediately upon creation and redirects to `/dashboard`. |
| **Super Admin Bootstrap** | **Fully Supported** | `POST /api/auth/onboard-super-admin` | Dedicated route in `SetupAdminPage.jsx` (`/setup-admin`). Supports conditional `bootstrapSecret` if tenant organizations already exist in cluster. |
| **Customer Workspace Sign In** | **Fully Supported** | `POST /api/auth/login` | Implemented in `LoginPage.jsx` (`/login`). Clean "Welcome back" experience without tabs or operational clutter. |
| **Super Admin Provisioning** | **Fully Supported** | `POST /api/admin/client/onboard` + `POST /api/admin/client/:clientId/users` | Implemented across `ClientsPage.jsx` and `CreateUserPage.jsx`. |
| **Role-Based Privilege Escalation Prevention** | **Server Enforced** | `POST /api/auth/register-tenant` | The server strictly forces `role: client-admin` regardless of client request body, preventing unauthorized privilege escalation to `super-admin`. |
| **Session Cookie Security** | **Server Enforced** | `/api/auth/*` | Standardized `httpOnly: true`, `secure: true` (prod), `sameSite: 'lax'`, uniform `path: '/'`. JWT is never stored in browser localStorage or sessionStorage. |

---

## 2. Client & Tenant Management

| Stitch Design Requirement | Backend Status | Backend Endpoint | Frontend Handling |
| :--- | :--- | :--- | :--- |
| **Client Directory / Listing** | **Fully Supported** | `GET /api/admin/clients` & `GET /api/clients` | Implemented in `ClientsPage.jsx` with full registry table (Client Name, Slug, Client ID with one-click copy, Email, Status, Registered Date, and Direct Action buttons). Also integrated into `ApiKeysPage.jsx`, `DashboardPage.jsx`, `AnalyticsPage.jsx`, and `CreateUserPage.jsx` as tenant selector dropdowns. |
| **Client Details Inspection** | **Fully Supported** | `GET /api/admin/client/:clientId` | Supported via direct ID query. |
| **Client Modification / Deletion** | **Not Supported** | No `PUT /api/admin/client/:clientId` or `DELETE` endpoints exist. | Documented as missing; no deceptive edit/delete buttons rendered. |
| **Client Onboarding** | **Fully Supported** | `POST /api/admin/client/onboard` | Implemented in `ClientsPage.jsx` supporting `name`, `email`, `description`, `website`. |

---

## 3. User Governance & Access Control

| Stitch Design Requirement | Backend Status | Backend Endpoint | Frontend Handling |
| :--- | :--- | :--- | :--- |
| **User Directory / Listing** | **Not Supported** | No `GET /api/admin/client/:clientId/users` or `GET /api/admin/users` exists. | The frontend does not fabricate fake user tables. A notice clarifies that user accounts are isolated partitions. |
| **User Modification / Deactivation** | **Not Supported** | No user edit or status toggle route exists. | Documented as missing backend feature. |
| **User Onboarding / Invitation Email** | **Not Supported** | The backend stores user records in MongoDB without an email/SMTP delivery transport. | Displays an explicit notice: *"Manual Dispatch Mandatory: User credentials are not emailed automatically by backend."* |
| **Client User Provisioning** | **Fully Supported** | `POST /api/admin/client/:clientId/users` | Implemented in `CreateUserPage.jsx` supporting `username`, `email`, `password`, `role` (`client-admin` / `client-viewer`). Restricted to Super Admin and Client Admin (Client Viewer returns 403). |

---

## 4. API Key Management

| Stitch Design Requirement | Backend Status | Backend Endpoint | Frontend Handling |
| :--- | :--- | :--- | :--- |
| **API Key Creation** | **Fully Supported** | `POST /api/admin/client/:clientId/api/keys` | Implemented in `ApiKeysPage.jsx`. The backend returns the raw `keyValue` (prefixed with `apim_`). Restricted to Super Admin and Client Admin. |
| **One-Time Secret Display** | **Architectural Alignment** | `POST /api/admin/client/:clientId/api/keys` | Displayed immediately in a secure one-time reveal banner with copy action. Never persisted in Zustand or browser storage. |
| **API Key Listing** | **Fully Supported** | `GET /api/admin/client/:clientId/api/keys` | Displays active key metadata. Note: The backend explicitly deletes `keyValue` before returning list records. Restricted to Super Admin and Client Admin (Client Viewer returns 403). |
| **Key Revocation / Rotation** | **Not Supported** | No `DELETE` or `PUT` endpoints exist in `clientRoutes.js` for API keys. | Marked as **Immutable Token** in the directory table; no fake delete/revoke buttons. |

---

## 5. Telemetry & Analytics

| Stitch Design Requirement | Backend Status | Backend Endpoint | Frontend Handling |
| :--- | :--- | :--- | :--- |
| **Overall Stats Ledger** | **Fully Supported** | `GET /api/analytics/stats` | Implemented via `stats` object: `totalHits`, `successHits`, `errorHits`, `errorRate`, `avgLatency`, `uniqueServices`, `uniqueEndpoints`. |
| **Aggregated Dashboard** | **Fully Supported** | `GET /api/analytics/dashboard` | Consumes `stats`, `topEndpoints`, and `recentTimeSeries` using `Promise.allSettled`. |
| **Weighted Average Latency** | **Formula Enforced** | `recentTimeSeries` | Implemented using weighted average formula: `sum(avgLatency × totalHits) / sum(totalHits)`. |
| **Percentile Latency (p95, p99)** | **Not Supported** | Backend SQL aggregation calculates `avg_latency`, `min_latency`, and `max_latency`, but does not compute p95/p99 percentiles. | Documented in `AnalyticsPage.jsx` and dashboard; no fabricated percentile values. |
| **Real-time WebSockets / SSE** | **Not Supported** | Backend currently does not run a WebSocket server for live stream metrics. | The frontend implements on-demand Live Polling (`refreshContextBtn` / `TimeFilterStrip`). |
| **Date Range Filtering** | **Fully Supported** | `startTime` and `endTime` query params | Implemented presets (1h, 24h, 7d, 30d, custom ISO range) sent to `/api/analytics/dashboard`. |
| **Live Ingest Contract Alignment** | **Fully Supported** | `POST /api/hit` (Header: `x-api-key`) | Documented across Landing Page and quickstarts matching actual ingest schema (`serviceName`, `endpoint`, `method`, `statusCode`, `latencyMs`). |

---

## 6. Security, Authentication Architecture & Typography

- **Session Token Transport**: The backend utilizes HTTP-only cookies (`authToken`). The frontend does NOT store JWTs in `localStorage` or `sessionStorage`.
- **Session Restoration**: On application startup, the frontend issues `GET /api/auth/profile` with credentials enabled (`withCredentials: true`). If valid, the user state is populated in the Zustand store.
- **Revocation Enforcement**: Inactive user accounts (`User.isActive: false`) and suspended organizations (`Client.isActive: false`) are rejected at the middleware layer on every protected route.
- **CORS & Reverse Proxy**: In development, Vite proxies `/api` and `/health` requests to `http://localhost:5000` to prevent cross-origin cookie restrictions.
- **Strict Typography Compliance**: Per design requirements, the frontend is strictly restricted to two font families:
  1. **Comic Neue** (`font-serif`): Headings, mastheads, primary logos, and editorial highlights.
  2. **Prompt** (`font-sans`): Body text, labels, form controls, navigation links, and data tables.
  No other font families are imported or used.
