# Automated Integration & API Testing Suite

This directory contains the comprehensive automated integration, API, and reliability testing system for the **API Monitoring Backend**.

---

## 1. Overview & Coverage

The test suite automatically validates the end-to-end backend architecture:

```
Super Admin Onboarding
      ↓
User & Client Authentication (JWT via Cookie & Bearer header)
      ↓
Client Management (POST /api/admin/client/onboard)
      ↓
Client User Management & RBAC (super-admin, client-admin, client-viewer)
      ↓
API Key Generation & Secret Redaction (POST/GET /api/admin/client/:clientId/api/keys)
      ↓
API Ingestion (POST /api/hit) -> 202 Queued
      ↓
RabbitMQ Message Broker (api_monitoring_test_queue)
      ↓
Background Processor Consumer
      ↓
MongoDB Raw Event Persistence (api_hits collection)
      ↓
PostgreSQL Metric Aggregation (endpoint_metrics table)
      ↓
Analytics API (GET /api/analytics/stats & dashboard)
      ↓
Multi-Tenancy & Cross-Tenant Data Isolation
      ↓
Reliability Engineering (Retry Strategy & Circuit Breaker)
```

### Test Suite Structure
```text
server/test/
├── setup/
│   ├── testEnv.js           # Environment setup & infrastructure pre-flight health checks
│   ├── globalSetup.js       # Global suite teardown (connection closures)
│   ├── testDatabase.js      # Isolated MongoDB & PostgreSQL connections and cleanup
│   └── testRabbitMQ.js      # Dedicated RabbitMQ test queue setup and purge helpers
├── helpers/
│   ├── testData.js          # Deterministic test data generators with unique prefixes
│   ├── auth.js              # Automated Super Admin onboarding, login & cookie/token extraction
│   ├── client.js            # Client onboarding & client user creation helpers
│   ├── apiKey.js            # API key generation and listing helpers
│   ├── ingest.js            # POST /api/hit request helper
│   ├── consumerHelper.js    # In-process test consumer lifecycle management
│   └── polling.js           # waitForCondition helper for asynchronous eventual consistency
├── auth/
│   └── auth.test.js         # Super Admin onboarding, login, profile, logout, failure paths
├── clients/
│   └── clients.test.js      # Client creation, slug generation, defaults, duplicates, auth
├── users/
│   └── users.test.js        # User roles, permissions, client isolation, 404/400 validation
├── apiKeys/
│   └── apiKeys.test.js      # API key creation, keyId/keyValue handling, secret redaction
├── ingest/
│   └── ingest.test.js       # Positive 202 ingest, auth failures, payload validation
├── processing/
│   ├── processing.test.js   # Event propagation: RabbitMQ → Consumer → Mongo raw event → Postgres aggregation
│   └── idempotency.test.js  # MessageId deduplication and duplicate event rejection
├── analytics/
│   └── analytics.test.js    # Stats, dashboard, top endpoints, time series, multi-tenancy isolation
├── authorization/
│   └── rbac.test.js         # Complete RBAC permission matrix for all 3 application roles
├── reliability/
│   ├── retryStrategy.test.js# Network transient error classification & backoff with jitter
│   └── circuitBreaker.test.js# CLOSED -> OPEN -> HALF_OPEN state transitions & recovery
└── e2e/
    └── fullLifecycle.test.js# End-to-end journey from initial onboarding to verified analytics
```

---

## 2. Prerequisites & Services

The test suite runs against real containerized infrastructure services defined in `docker-compose.yml`:

1. **MongoDB** (`localhost:27017`): Uses isolated test database `api_monitoring_test`.
2. **PostgreSQL** (`localhost:5433`): Uses isolated test database `api_monitoring_test`.
3. **RabbitMQ** (`localhost:5672`): Uses dedicated test queue `api_monitoring_test_queue` and DLQ `api_monitoring_test_queue.dlq`.

To verify or start the infrastructure:
```bash
# Start all containers in the background
docker compose up -d

# Verify running containers
docker ps
```

---

## 3. Test Environment Configuration (`.env.test`)

Test configuration is isolated from development data in `.env.test`:
```env
NODE_ENV="test"
PORT="5001"

MONGO_URI="mongodb://localhost:27017/api_monitoring_test"
MONGO_DB_NAME="api_monitoring_test"

PG_HOST="localhost"
PG_PORT="5433"
PG_DATABASE="api_monitoring_test"
PG_USER="postgres"
PG_PASSWORD="postgres"

RABBITMQ_URL="amqp://api_user:secure_password@localhost:5672/api_monitoring"
RABBITMQ_QUEUE="api_monitoring_test_queue"
RABBITMQ_PUBLISHER_CONFIRMS="true"
RABBITMQ_RETRY_ATTEMPTS="3"
RABBITMQ_RETRY_DELAY="500"

JWT_SECRET="test_jwt_secret_key_1234567890_test_suite_key"
JWT_EXPIRES_IN="24h"

RATE_LIMIT_WINDOW_MS="60000"
RATE_LIMIT_MAX_REQUESTS="10000"
```

---

## 4. How to Run Tests

### Run all tests together:
```bash
npm test
```

### Run tests in interactive watch mode:
```bash
npm run test:watch
```

### Run individual test suites:
```bash
# Authentication tests
npm run test:auth

# Client & User management tests
npm run test:clients

# API Key tests
npm run test:api-keys

# API Hit Ingestion tests
npm run test:ingest

# Asynchronous RabbitMQ & Event Processing tests
npm run test:processing

# Analytics & Tenant Isolation tests
npm run test:analytics

# Role-Based Access Control (RBAC) tests
npm run test:rbac

# Reliability (Retry & Circuit Breaker) tests
npm run test:reliability

# Full End-to-End Lifecycle test
npm run test:e2e
```

### Run a specific test file directly:
```bash
npx vitest run test/auth/auth.test.js
```

---

## 5. Key Architecture Features

### Completely Automated Authentication
No manual copying of JWTs or cookies is ever required. Test helpers (`onboardSuperAdmin`, `loginUser`, `loginAsClientAdmin`) dynamically make API calls, extract the `authToken` HTTP cookie, and provide both Cookie strings and Bearer authorization headers to subsequent requests.

### Asynchronous Eventual Consistency (No Arbitrary Sleeps)
RabbitMQ processing is asynchronous. Rather than using arbitrary fixed sleeps (`sleep(5000)`), tests use `waitForCondition(predicate, { timeout, interval, description })`. The condition polls every 200–250ms until the expected MongoDB document or PostgreSQL metric record is verified, failing fast with descriptive diagnostics if a timeout occurs.

### Test Isolation & Deterministic Cleanup
- Tests run against dedicated test databases: `api_monitoring_test` in MongoDB and PostgreSQL, and `api_monitoring_test_queue` in RabbitMQ.
- Development and production data are never modified.
- `beforeEach` and `afterEach` hooks clean collections and truncate tables, while deterministic prefixes (`test-admin-*`, `test-client-*`, `test-user-*`, `test-api-key-*`) prevent cross-test collisions.
- Running `npm test` repeatedly is 100% idempotent.

### Failure Classification
The test framework includes pre-flight infrastructure health checks in `test/setup/testEnv.js`. If MongoDB, PostgreSQL, or RabbitMQ are unreachable, tests fail immediately with a clear `[INFRASTRUCTURE ERROR]` diagnostic message rather than masking the issue as an application assertion failure.
