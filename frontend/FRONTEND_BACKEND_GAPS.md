# API Monitoring Frontend-Backend Capabilities & Discrepancies

This document catalogs architectural discrepancies, missing backend endpoints, and capabilities represented in the Google Stitch design system versus the current Express/MongoDB/PostgreSQL backend implementation.

---

## 1. Client Management

| Stitch Design Requirement | Backend Status | Backend Endpoint | Frontend Handling |
| :--- | :--- | :--- | :--- |
| **Client Directory / Listing** | **Not Supported** | No `GET /api/admin/clients` endpoint exists in `server/src/services/clientService/routes/clientRoutes.js`. | The frontend does not fabricate mock client records. An architectural notice informs Super Admins of zero-knowledge tenant isolation, requiring retention of the generated Client ID. |
| **Client Details Inspection** | **Not Supported** | No `GET /api/admin/client/:clientId` endpoint exists. | Displays created client metadata immediately upon return from the onboard endpoint. |
| **Client Modification / Deletion** | **Not Supported** | No `PUT /api/admin/client/:clientId` or `DELETE` endpoints exist. | Documented as missing; no deceptive edit/delete buttons rendered. |
| **Client Onboarding** | **Fully Supported** | `POST /api/admin/client/onboard` | Implemented in `ClientsPage.jsx` supporting `name`, `email`, `description`, `website`. |

---

## 2. User Governance & Access Control

| Stitch Design Requirement | Backend Status | Backend Endpoint | Frontend Handling |
| :--- | :--- | :--- | :--- |
| **User Directory / Listing** | **Not Supported** | No `GET /api/admin/client/:clientId/users` or `GET /api/admin/users` exists. | The frontend does not fabricate fake user tables. A notice clarifies that user accounts are isolated partitions. |
| **User Modification / Deactivation** | **Not Supported** | No user edit or status toggle route exists. | Documented as missing backend feature. |
| **User Onboarding / Invitation Email** | **Not Supported** | The backend stores user records in MongoDB without an email/SMTP delivery transport. | Displays an explicit notice: *"Manual Dispatch Mandatory: User credentials are not emailed automatically by backend."* |
| **Client User Provisioning** | **Fully Supported** | `POST /api/admin/client/:clientId/users` | Implemented in `CreateUserPage.jsx` supporting `username`, `email`, `password`, `role` (`client-admin` / `client-viewer`). |
| **Super Admin Bootstrap** | **Fully Supported** | `POST /api/auth/onboard-super-admin` | Implemented in `LoginPage.jsx` under the *Initial Setup* tab with bootstrap state guard handling. |

---

## 3. API Key Management

| Stitch Design Requirement | Backend Status | Backend Endpoint | Frontend Handling |
| :--- | :--- | :--- | :--- |
| **API Key Creation** | **Fully Supported** | `POST /api/admin/client/:clientId/api/keys` | Implemented in `ApiKeysPage.jsx`. The backend returns the raw `keyValue` (prefixed with `apim_`). |
| **One-Time Secret Display** | **Architectural Alignment** | `POST /api/admin/client/:clientId/api/keys` | Displayed immediately in a secure one-time reveal banner with copy action. Never persisted in Zustand or browser storage. |
| **API Key Listing** | **Fully Supported** | `GET /api/admin/client/:clientId/api/keys` | Displays active key metadata. Note: The backend explicitly deletes `keyValue` before returning list records. |
| **Key Revocation / Rotation** | **Not Supported** | No `DELETE` or `PUT` endpoints exist in `clientRoutes.js` for API keys. | Marked as **Immutable Token** in the directory table; no fake delete/revoke buttons. |

---

## 4. Telemetry & Analytics

| Stitch Design Requirement | Backend Status | Backend Endpoint | Frontend Handling |
| :--- | :--- | :--- | :--- |
| **Overall Stats Ledger** | **Fully Supported** | `GET /api/analytics/stats` | Implemented via `stats` object: `totalHits`, `successHits`, `errorHits`, `errorRate`, `avgLatency`, `uniqueServices`, `uniqueEndpoints`. |
| **Aggregated Dashboard** | **Fully Supported** | `GET /api/analytics/dashboard` | Consumes `stats`, `topEndpoints`, and `recentTimeSeries` using `Promise.allSettled`. |
| **Weighted Average Latency** | **Formula Enforced** | `recentTimeSeries` | Implemented using weighted average formula: `sum(avgLatency × totalHits) / sum(totalHits)`. |
| **Percentile Latency (p95, p99)** | **Not Supported** | Backend SQL aggregation calculates `avg_latency`, `min_latency`, and `max_latency`, but does not compute p95/p99 percentiles. | Documented in `AnalyticsPage.jsx` and dashboard; no fabricated percentile values. |
| **Real-time WebSockets / SSE** | **Not Supported** | Backend currently does not run a WebSocket server for live stream metrics. | The frontend implements on-demand Live Polling (`refreshContextBtn` / `TimeFilterStrip`). |
| **Date Range Filtering** | **Fully Supported** | `startTime` and `endTime` query params | Implemented presets (1h, 24h, 7d, 30d, custom ISO range) sent to `/api/analytics/dashboard`. |

---

## 5. Security & Authentication Architecture

* **Session Token Transport**: The backend utilizes HTTP-only cookies (`authToken`). The frontend does NOT store JWTs in `localStorage` or `sessionStorage`.
* **Session Restoration**: On application startup, the frontend issues `GET /api/auth/profile` with credentials enabled (`withCredentials: true`). If valid, the user state is populated in the Zustand store.
* **CORS & Reverse Proxy**: In development, Vite proxies `/api` and `/health` requests to `http://localhost:5000` to prevent cross-origin cookie restrictions.

