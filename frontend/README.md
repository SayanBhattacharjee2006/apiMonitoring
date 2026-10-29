# Pulse Observability — API Monitoring Frontend

A high-performance, editorial React application built to monitor distributed API telemetry, service uptime, latency, and client governance. Developed directly from Google Stitch design specifications using the editorial palette and typography.

---

## Technology Stack

- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS with custom editorial design tokens
- **Typography**: Google Fonts — *Comic Neue* (Primary Interface) & *Newsreader* (Headlines)
- **State Management**: Zustand (`useAuthStore`)
- **HTTP Client**: Axios with centralized error handling & HTTP-only cookie credentials
- **Routing**: React Router v6 with Role-Based Route Guards
- **Visualizations**: Recharts (Responsive Area, Line, Donut, and Bar charts)
- **Icons**: Lucide React

---

## Directory Structure

```text
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/
│   │   ├── charts/         # 5 Recharts visualizations (Volume, Latency, Yield, Top Endpoints, Reliability)
│   │   ├── common/         # AlertMessage, EmptyState, LoadingSpinner, ProtectedRoute, StatusBadge
│   │   ├── dashboard/      # KpiCard, MonitoredEndpointsTable, TimeFilterStrip
│   │   └── layout/         # AppLayout, Header, Sidebar
│   ├── pages/
│   │   ├── LoginPage.jsx        # Dual-tab Sign In & Initial Super Admin Setup
│   │   ├── DashboardPage.jsx    # Real analytics KPI ledger and 5 charts
│   │   ├── AnalyticsPage.jsx    # In-depth telemetry breakdown & latency metrics
│   │   ├── ClientsPage.jsx      # Client onboarding & cryptographic ID minting
│   │   ├── ApiKeysPage.jsx      # API key creation, reveal banner & directory table
│   │   ├── CreateUserPage.jsx   # Tenant user provisioning with role picker
│   │   ├── ProfilePage.jsx      # Authenticated user session & entitlements matrix
│   │   └── NotFoundPage.jsx     # 404 fallback
│   ├── services/
│   │   ├── apiClient.js         # Centralized Axios client (withCredentials: true)
│   │   ├── authService.js       # Authentication & profile endpoints
│   │   ├── analyticsService.js  # Dashboard and stats endpoints
│   │   ├── clientService.js     # Client onboarding and user creation
│   │   └── apiKeyService.js     # API key creation and listing
│   ├── store/
│   │   └── authStore.js         # Zustand auth store with session restoration
│   ├── App.jsx                  # Main routing hierarchy
│   ├── index.css                # Tailwind directives & typography overrides
│   └── main.jsx                 # React root mounting
├── .env.example
├── FRONTEND_BACKEND_GAPS.md     # Backend capability gaps documentation
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

---

## Development Setup

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` if custom backend URL is desired:
```bash
cp .env.example .env
```
Default proxy forwards `/api` and `/health` to `http://localhost:5000`.

### 3. Start Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 4. Build for Production
```bash
npm run build
```
Build output is generated in `frontend/dist/`.

