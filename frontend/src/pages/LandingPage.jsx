import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Key,
  ArrowLeftRight,
  Cpu,
  Database,
  BarChart3,
  Lock,
  Gauge,
  Building2,
  Zap,
  Layers,
  User,
  LogIn,
  TrendingUp,
} from 'lucide-react';
import useAuthStore from '../store/authStore';

export const LandingPage = () => {
  const { isAuthenticated, user } = useAuthStore();
  const [activeSnippetTab, setActiveSnippetTab] = useState('curl'); // 'curl' | 'node' | 'python'
  const [copied, setCopied] = useState(false);

  const snippets = {
    curl: `curl -X POST http://localhost:5000/api/hit \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pls_live_948f93e920d3ba84c6e1" \\
  -d '{
    "serviceName": "billing-service",
    "endpoint": "/v1/charges/create",
    "method": "POST",
    "statusCode": 200,
    "latencyMs": 42.5
  }'`,
    node: `await fetch('http://localhost:5000/api/hit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.PULSE_API_KEY
  },
  body: JSON.stringify({
    serviceName: 'billing-service',
    endpoint: '/v1/charges/create',
    method: 'POST',
    statusCode: 200,
    latencyMs: 42.5
  })
});`,
    python: `import requests, os

response = requests.post(
    'http://localhost:5000/api/hit',
    headers={
        'Content-Type': 'application/json',
        'x-api-key': os.getenv('PULSE_API_KEY')
    },
    json={
        'serviceName': 'billing-service',
        'endpoint': '/v1/charges/create',
        'method': 'POST',
        'statusCode': 200,
        'latencyMs': 42.5
    },
    timeout=2.0
)`,
  };

  const handleCopySnippet = () => {
    const text = snippets[activeSnippetTab];
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-cream-base text-ink-primary font-sans antialiased selection:bg-burgundy/10 selection:text-burgundy">
      {/* 1. TOP NAVIGATION BAR */}
      <header className="fixed top-0 w-full z-50 bg-[#fff8f6]/90 backdrop-blur-xl border-b border-hairline/60 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="h-16 max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-burgundy flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight text-burgundy">
              Pulse Observability
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            <a href="#features" className="hover:text-burgundy transition-colors">
              Features
            </a>
            <a href="#pipeline-architecture" className="hover:text-burgundy transition-colors">
              Architecture
            </a>
            <a href="#documentation" className="hover:text-burgundy transition-colors">
              Documentation
            </a>
            <a href="#security" className="hover:text-burgundy transition-colors">
              Security
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 bg-burgundy text-white hover:bg-burgundy-dark transition-all px-4 py-2 rounded-lg text-xs font-semibold shadow-sm"
              >
                <User className="w-3.5 h-3.5" />
                <span>Dashboard ({user?.username || 'Active'})</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-xs font-semibold uppercase tracking-wider text-ink-secondary hover:text-burgundy transition-colors px-3 py-1.5"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 bg-burgundy text-white hover:bg-burgundy-dark transition-all px-4 py-2 rounded-lg text-xs font-semibold shadow-sm active:scale-95"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Create workspace</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT WRAPPER */}
      <main className="w-full pt-16">
        {/* 2. HERO MASTHEAD SECTION */}
        <section className="relative w-full overflow-hidden px-6 lg:px-12 pt-14 pb-20">
          {/* Subtle Radial Atmosphere */}
          <div className="absolute -top-32 -left-20 w-96 h-96 bg-burgundy/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 -right-20 w-96 h-96 bg-tertiary-container/5 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto flex flex-col gap-12 relative z-10">
            {/* Title & Introduction */}
            <div className="flex flex-col gap-6 max-w-4xl">
              <div className="inline-flex items-center gap-2 self-start px-3 py-1 bg-surface-container-high rounded-full border border-hairline/60 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#154620] animate-pulse" />
                <span className="text-[11px] font-bold tracking-wider uppercase text-ink-secondary">
                  NEXT-GENERATION API TELEMETRY &amp; INGEST ENGINE
                </span>
                <span className="text-hairline font-bold">|</span>
                <span className="text-[11px] font-bold text-burgundy uppercase tracking-wider">
                  V2.4 SPEC
                </span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-burgundy tracking-tight leading-[1.15] font-semibold">
                Precision Telemetry for Mission-Critical API Infrastructure
              </h1>

              <p className="text-base sm:text-lg text-ink-secondary max-w-3xl leading-relaxed">
                A modular, high-throughput observability platform engineered with secure multi-tenant isolation, asynchronous event buffering, and actionable reliability analytics.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 bg-burgundy hover:bg-burgundy-dark text-white font-semibold text-sm px-6 py-3.5 rounded-lg shadow-md transition-all active:scale-95"
                >
                  <span>Create your workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 bg-card-surface hover:bg-surface-container text-ink-primary font-semibold text-sm px-6 py-3.5 rounded-lg border border-hairline/80 shadow-sm transition-all"
                >
                  <LogIn className="w-4 h-4 text-burgundy" />
                  <span>Sign in</span>
                </Link>

                <div className="flex items-center gap-2 px-3 py-2 text-ink-secondary text-xs font-semibold ml-auto sm:ml-0">
                  <ShieldCheck className="w-4 h-4 text-[#154620]" />
                  <span>Cryptographic API Key Ingestion</span>
                </div>
              </div>
            </div>

            {/* EDITORIAL CONSOLE PREVIEW */}
            <div className="w-full bg-card-surface rounded-xl shadow-xl p-6 lg:p-8 flex flex-col gap-6 border border-hairline/80">
              {/* Header bar of preview */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-hairline/50">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#154620] shadow-sm animate-pulse" />
                  <span className="font-serif text-lg font-semibold text-ink-primary">
                    Production Gateway Telemetry Ledger
                  </span>
                  <span className="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">
                    Cluster::us-east-1a
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-ink-secondary">
                  <span>
                    Sync: <strong className="text-ink-primary font-semibold">Real-Time (50ms tick)</strong>
                  </span>
                  <span>
                    Tenant: <strong className="text-ink-primary font-semibold">T-9821_PROD</strong>
                  </span>
                  <span className="bg-surface-container px-2.5 py-1 rounded text-ink-primary font-semibold text-[11px] border border-hairline/40">
                    Zero Drop Guarantee
                  </span>
                </div>
              </div>

              {/* 4-Stat High Density Matrix */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-surface-container-low p-4 rounded-lg flex flex-col gap-1 border border-hairline/40">
                  <span className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">
                    Request Volume
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-2xl sm:text-3xl font-bold text-burgundy tabular-nums">
                      1,482,904
                    </span>
                    <span className="text-[#154620] text-xs font-bold flex items-center">
                      <TrendingUp className="w-3.5 h-3.5 inline mr-0.5" />
                      12.4%
                    </span>
                  </div>
                  <span className="text-xs text-ink-secondary">Hits logged today</span>
                </div>

                <div className="bg-surface-container-low p-4 rounded-lg flex flex-col gap-1 border border-hairline/40">
                  <span className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">
                    Yield Success Rate
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-2xl sm:text-3xl font-bold text-[#154620] tabular-nums">
                      99.84%
                    </span>
                    <span className="bg-[#baf0bb] text-[#002108] text-[10px] px-1.5 py-0.5 rounded font-bold">
                      200 OK
                    </span>
                  </div>
                  <span className="text-xs text-ink-secondary">SLA threshold: 99.50%</span>
                </div>

                <div className="bg-surface-container-low p-4 rounded-lg flex flex-col gap-1 border border-hairline/40">
                  <span className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">
                    p95 Latency Ledger
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-2xl sm:text-3xl font-bold text-burgundy tabular-nums">
                      42.1 ms
                    </span>
                    <span className="text-ink-secondary text-xs font-semibold">p99: 68ms</span>
                  </div>
                  <span className="text-xs text-ink-secondary">-4ms from 24h baseline</span>
                </div>

                <div className="bg-surface-container-low p-4 rounded-lg flex flex-col gap-1 border border-hairline/40">
                  <span className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">
                    Ingest Queue Backlog
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-2xl sm:text-3xl font-bold text-secondary tabular-nums">
                      0.00 ms
                    </span>
                    <span className="bg-secondary-fixed text-on-secondary-fixed text-[10px] px-1.5 py-0.5 rounded font-bold">
                      DRAINED
                    </span>
                  </div>
                  <span className="text-xs text-ink-secondary">RabbitMQ stream workers: 32</span>
                </div>
              </div>

              {/* Sub-Second Latency Spectrum & Live Incoming Trace Pulses */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                {/* SVG Latency Sparkline */}
                <div className="lg:col-span-2 bg-surface-container-low p-5 rounded-lg flex flex-col gap-3 border border-hairline/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-burgundy" />
                      <span className="font-serif text-sm font-semibold text-ink-primary">
                        Sub-Second Hit Latency Spectrum
                      </span>
                    </div>
                    <span className="text-xs text-ink-secondary font-medium">
                      Sampling: 100% of /api/hit traffic
                    </span>
                  </div>

                  {/* High Quality Area SVG Chart */}
                  <div className="w-full h-36 relative flex items-end">
                    <svg
                      className="w-full h-full text-secondary"
                      fill="none"
                      preserveAspectRatio="none"
                      viewBox="0 0 600 120"
                    >
                      <defs>
                        <linearGradient id="landingChartGradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#642A3A" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#642A3A" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Grid Lines */}
                      <line
                        stroke="#DED6CA"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                        x1="0"
                        x2="600"
                        y1="30"
                        y2="30"
                      />
                      <line
                        stroke="#DED6CA"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                        x1="0"
                        x2="600"
                        y1="65"
                        y2="65"
                      />
                      <line
                        stroke="#DED6CA"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                        x1="0"
                        x2="600"
                        y1="100"
                        y2="100"
                      />
                      {/* Area Fill */}
                      <path
                        d="M0,85 Q40,82 80,75 T160,65 T240,80 T320,55 T400,60 T480,42 T540,58 T600,45 L600,120 L0,120 Z"
                        fill="url(#landingChartGradient)"
                      />
                      {/* Trace Curve Line */}
                      <path
                        d="M0,85 Q40,82 80,75 T160,65 T240,80 T320,55 T400,60 T480,42 T540,58 T600,45"
                        fill="none"
                        stroke="#642A3A"
                        strokeWidth="2.5"
                      />
                      {/* Anomaly highlight node at x=480, y=42 */}
                      <circle cx="480" cy="42" fill="#642A3A" r="5" />
                      <circle
                        cx="480"
                        cy="42"
                        fill="none"
                        r="10"
                        stroke="#642A3A"
                        strokeOpacity="0.4"
                        strokeWidth="2"
                        className="animate-ping"
                      />
                    </svg>
                  </div>

                  <div className="flex items-center justify-between text-xs text-ink-secondary pt-1 border-t border-hairline/40">
                    <span>T - 60 minutes</span>
                    <span className="inline-flex items-center gap-1.5 text-burgundy font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-burgundy" />
                      p95 Incident Snapshot (48.2ms burst absorbed)
                    </span>
                    <span>Present Moment</span>
                  </div>
                </div>

                {/* Live Trace Stream Box */}
                <div className="bg-surface-container-low p-5 rounded-lg flex flex-col gap-3 border border-hairline/40">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-sm font-semibold text-ink-primary">
                      Live Trace Stream
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#154620]">
                      <span className="w-2 h-2 rounded-full bg-[#154620] animate-ping" />
                      INGESTING
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 font-mono text-xs">
                    <div className="bg-card-surface p-2.5 rounded shadow-sm flex items-center justify-between border border-hairline/40">
                      <div className="flex items-center gap-2">
                        <span className="text-[#002108] font-bold text-[10px] bg-[#baf0bb] px-1.5 py-0.5 rounded">
                          200
                        </span>
                        <span className="text-ink-primary font-semibold truncate max-w-[130px]">
                          POST /v1/checkout
                        </span>
                      </div>
                      <span className="text-secondary font-medium tabular-nums">1.1ms</span>
                    </div>

                    <div className="bg-card-surface p-2.5 rounded shadow-sm flex items-center justify-between border border-hairline/40">
                      <div className="flex items-center gap-2">
                        <span className="text-[#002108] font-bold text-[10px] bg-[#baf0bb] px-1.5 py-0.5 rounded">
                          200
                        </span>
                        <span className="text-ink-primary font-semibold truncate max-w-[130px]">
                          GET /users/auth
                        </span>
                      </div>
                      <span className="text-secondary font-medium tabular-nums">0.8ms</span>
                    </div>

                    <div className="bg-card-surface p-2.5 rounded shadow-sm flex items-center justify-between border border-hairline/40">
                      <div className="flex items-center gap-2">
                        <span className="text-burgundy font-bold text-[10px] bg-burgundy-soft px-1.5 py-0.5 rounded">
                          429
                        </span>
                        <span className="text-ink-primary font-semibold truncate max-w-[130px]">
                          POST /webhooks/stripe
                        </span>
                      </div>
                      <span className="text-burgundy font-bold tabular-nums">14.8ms</span>
                    </div>

                    <div className="bg-card-surface p-2.5 rounded shadow-sm flex items-center justify-between border border-hairline/40">
                      <div className="flex items-center gap-2">
                        <span className="text-[#002108] font-bold text-[10px] bg-[#baf0bb] px-1.5 py-0.5 rounded">
                          200
                        </span>
                        <span className="text-ink-primary font-semibold truncate max-w-[130px]">
                          PUT /inventory/sync
                        </span>
                      </div>
                      <span className="text-secondary font-medium tabular-nums">2.4ms</span>
                    </div>
                  </div>

                  <div className="mt-auto pt-2 flex items-center justify-between text-xs text-ink-secondary border-t border-hairline/40">
                    <span>SHA-512 Hash Verified</span>
                    <span className="text-burgundy font-semibold">Zero Unhashed Logs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. METRIC COUNTERS RIBBON */}
        <section className="w-full bg-surface-container py-12 px-6 lg:px-12 border-y border-hairline/60">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex flex-col gap-1">
              <span className="font-serif text-3xl sm:text-4xl lg:text-5xl text-burgundy font-bold leading-tight tabular-nums">
                1.48M+
              </span>
              <span className="text-sm font-semibold text-ink-primary">Daily Hits Processed</span>
              <span className="text-xs text-ink-secondary">Zero throttled trace requests</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#154620] font-bold leading-tight tabular-nums">
                &lt;2ms
              </span>
              <span className="text-sm font-semibold text-ink-primary">Ingestion Overhead</span>
              <span className="text-xs text-ink-secondary">Validated at load balancer layer</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-serif text-3xl sm:text-4xl lg:text-5xl text-secondary font-bold leading-tight tabular-nums">
                99.99%
              </span>
              <span className="text-sm font-semibold text-ink-primary">Pipeline Availability</span>
              <span className="text-xs text-ink-secondary">High-availability worker pool</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-serif text-3xl sm:text-4xl lg:text-5xl text-burgundy font-bold leading-tight tabular-nums">
                0
              </span>
              <span className="text-sm font-semibold text-ink-primary">Plaintext Secrets Stored</span>
              <span className="text-xs text-ink-secondary">Salted sha-512 key hash tokens</span>
            </div>
          </div>
        </section>

        {/* 4. ARCHITECTURE & DATA PIPELINE LEDGER */}
        <section className="w-full py-20 px-6 lg:px-12" id="pipeline-architecture">
          <div className="max-w-7xl mx-auto flex flex-col gap-12">
            <div className="flex flex-col gap-3 max-w-3xl">
              <div className="inline-flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-burgundy">
                  PIPELINE TOPOLOGY
                </span>
                <span className="text-hairline">/</span>
                <span className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
                  HIGH-CONCURRENCY ARCHITECTURE
                </span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl text-ink-primary font-semibold">
                The Pulse Distributed Ingest Ledger
              </h2>
              <p className="text-base text-ink-secondary leading-relaxed">
                Requests are decoupled from storage through non-blocking asynchronous event buffering. Each layer is instrumented for deterministic failover and audited data continuity.
              </p>
            </div>

            {/* 6-Stage Process Chain Bento */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="bg-card-surface p-6 rounded-xl shadow-sm flex flex-col gap-4 border border-hairline/60 relative hover:border-burgundy/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider uppercase text-burgundy">
                    STAGE 01
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="font-serif text-lg font-semibold text-ink-primary">
                  Monitored Services
                </h3>
                <p className="text-xs text-ink-secondary leading-relaxed">
                  Your distributed API nodes, serverless handlers, or gateway proxies dispatch lightweight telemetry payloads without blocking customer-facing request threads.
                </p>
                <div className="mt-auto pt-3">
                  <span className="text-[11px] font-mono font-semibold bg-surface-container-low px-3 py-1.5 rounded block text-ink-secondary border border-hairline/40">
                    Async HTTP dispatch
                  </span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-card-surface p-6 rounded-xl shadow-sm flex flex-col gap-4 border border-hairline/60 relative hover:border-burgundy/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider uppercase text-burgundy">
                    STAGE 02
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                    <Key className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="font-serif text-lg font-semibold text-ink-primary">
                  API-Key Ingestion (/api/hit)
                </h3>
                <p className="text-xs text-ink-secondary leading-relaxed">
                  Micro-gateway intercepts incoming packets, verifies the cryptographic hash against tenant memory caches in &lt;0.4ms, and accepts valid payloads.
                </p>
                <div className="mt-auto pt-3">
                  <span className="text-[11px] font-mono font-semibold bg-surface-container-low px-3 py-1.5 rounded block text-ink-secondary border border-hairline/40">
                    Header: x-api-key
                  </span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-card-surface p-6 rounded-xl shadow-sm flex flex-col gap-4 border border-hairline/60 relative hover:border-burgundy/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider uppercase text-burgundy">
                    STAGE 03
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                    <ArrowLeftRight className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="font-serif text-lg font-semibold text-ink-primary">
                  RabbitMQ Event Broker
                </h3>
                <p className="text-xs text-ink-secondary leading-relaxed">
                  Telemetric envelopes enter high-durability exchange partitions. Bursts up to 250,000 hits/sec are seamlessly absorbed with zero backpressure on client APIs.
                </p>
                <div className="mt-auto pt-3">
                  <span className="text-[11px] font-mono font-semibold bg-surface-container-low px-3 py-1.5 rounded block text-ink-secondary border border-hairline/40">
                    Topic: telemetry.ingest.*
                  </span>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-card-surface p-6 rounded-xl shadow-sm flex flex-col gap-4 border border-hairline/60 relative hover:border-burgundy/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider uppercase text-burgundy">
                    STAGE 04
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                    <Cpu className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="font-serif text-lg font-semibold text-ink-primary">
                  Parallel Stream Workers
                </h3>
                <p className="text-xs text-ink-secondary leading-relaxed">
                  Stateless worker daemons normalize schema variations, compute endpoint response percentiles, detect anomalous response bursts, and enrich trace contexts.
                </p>
                <div className="mt-auto pt-3">
                  <span className="text-[11px] font-mono font-semibold bg-surface-container-low px-3 py-1.5 rounded block text-ink-secondary border border-hairline/40">
                    Auto-scaling worker pool
                  </span>
                </div>
              </div>

              {/* Step 5 */}
              <div className="bg-card-surface p-6 rounded-xl shadow-sm flex flex-col gap-4 border border-hairline/60 relative hover:border-burgundy/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider uppercase text-burgundy">
                    STAGE 05
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                    <Database className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="font-serif text-lg font-semibold text-ink-primary">
                  Mongo &amp; Postgres Storage
                </h3>
                <p className="text-xs text-ink-secondary leading-relaxed">
                  Dual-persistence layer: high-volume semi-structured trace payloads sit in indexed MongoDB clusters, while tenant identities and ACLs live in ACID Postgres.
                </p>
                <div className="mt-auto pt-3">
                  <span className="text-[11px] font-mono font-semibold bg-surface-container-low px-3 py-1.5 rounded block text-ink-secondary border border-hairline/40">
                    Partitioned by Tenant ID
                  </span>
                </div>
              </div>

              {/* Step 6 */}
              <div className="bg-card-surface p-6 rounded-xl shadow-sm flex flex-col gap-4 border border-hairline/60 relative hover:border-burgundy/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider uppercase text-burgundy">
                    STAGE 06
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="font-serif text-lg font-semibold text-ink-primary">
                  Analytics Aggregation
                </h3>
                <p className="text-xs text-ink-secondary leading-relaxed">
                  Continuous rollups generate instant p50, p95, and p99 ledgers, error budget depletion forecasts, and alerting triggers without full-table table scans.
                </p>
                <div className="mt-auto pt-3">
                  <span className="text-[11px] font-mono font-semibold bg-surface-container-low px-3 py-1.5 rounded block text-ink-secondary border border-hairline/40">
                    Live WebSocket Push
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. KEY CAPABILITIES / FEATURES GRID */}
        <section className="w-full bg-surface-container py-20 px-6 lg:px-12" id="features">
          <div className="max-w-7xl mx-auto flex flex-col gap-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex flex-col gap-3 max-w-2xl">
                <span className="text-xs font-bold uppercase tracking-wider text-burgundy">
                  CORE CAPABILITIES
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl text-ink-primary font-semibold">
                  Engineered for Academic Rigor &amp; Defense-in-Depth
                </h2>
                <p className="text-base text-ink-secondary">
                  Telemetry should neither leak payload secrets nor slow production services. Pulse provides strict tenancy isolation by mathematical design.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-hairline rounded-full overflow-hidden">
                  <div className="w-full h-full bg-burgundy rounded-full" />
                </div>
                <span className="text-xs font-bold text-ink-secondary uppercase tracking-wider">
                  Enterprise Grade
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Capability 1 */}
              <div className="bg-card-surface p-8 rounded-xl shadow-sm flex flex-col gap-4 border border-hairline/60">
                <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-burgundy">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-ink-primary">
                  Immutable Cryptographic API Keys
                </h3>
                <p className="text-sm text-ink-secondary leading-relaxed">
                  Keys are minted using 64-character pseudo-random entropy and secured via salted sha-512 one-way derivation. Pulse stores only the irreversible digest; compromise of backend storage yields zero plaintext secrets to unauthorized adversaries.
                </p>
                <div className="mt-4 pt-4 border-t border-hairline/40 flex items-center justify-between text-xs text-ink-secondary font-medium">
                  <span>Hashing: Salted SHA-512</span>
                  <span className="text-[#154620] font-semibold">Zero Unhashed Persistence</span>
                </div>
              </div>

              {/* Capability 2 */}
              <div className="bg-card-surface p-8 rounded-xl shadow-sm flex flex-col gap-4 border border-hairline/60">
                <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-burgundy">
                  <Gauge className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-ink-primary">
                  Real-Time Ingestion Analytics
                </h3>
                <p className="text-sm text-ink-secondary leading-relaxed">
                  Gain immediate visibility into endpoint density, active error-budget consumption, and micro-latency regressions. Anomaly detection identifies outlier payloads and upstream timeout spikes prior to widespread degradation.
                </p>
                <div className="mt-4 pt-4 border-t border-hairline/40 flex items-center justify-between text-xs text-ink-secondary font-medium">
                  <span>Granularity: 100ms Buckets</span>
                  <span className="text-[#154620] font-semibold">Dynamic Outlier Isolation</span>
                </div>
              </div>

              {/* Capability 3 */}
              <div className="bg-card-surface p-8 rounded-xl shadow-sm flex flex-col gap-4 border border-hairline/60">
                <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-burgundy">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-ink-primary">
                  Multi-Tenant Scoped Governance
                </h3>
                <p className="text-sm text-ink-secondary leading-relaxed">
                  Granular tenant segregation prevents noisy neighbor interference and guarantees data compartmentalization. Granular privilege tiers enable seamless separation between Super-Admins, Tenant-Admins, and Read-Only Auditors.
                </p>
                <div className="mt-4 pt-4 border-t border-hairline/40 flex items-center justify-between text-xs text-ink-secondary font-medium">
                  <span>Role-Based Access Control</span>
                  <span className="text-[#154620] font-semibold">Row-Level Database Isolation</span>
                </div>
              </div>

              {/* Capability 4 */}
              <div className="bg-card-surface p-8 rounded-xl shadow-sm flex flex-col gap-4 border border-hairline/60">
                <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-burgundy">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-ink-primary">
                  Defense-in-Depth Tenant Security
                </h3>
                <p className="text-sm text-ink-secondary leading-relaxed">
                  Session tokens are sealed within HTTP-only, SameSite cookies with active database status verification. Ingested API calls authenticate via salted SHA-512 hashed keys, ensuring no plaintext keys persist in storage.
                </p>
                <div className="mt-4 pt-4 border-t border-hairline/40 flex items-center justify-between text-xs text-ink-secondary font-medium">
                  <span>Session: HTTP-Only Secure</span>
                  <span className="text-[#154620] font-semibold">Strict Role Authorization</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. LIVE DEVELOPER INTEGRATION SPEC SECTION */}
        <section className="w-full py-20 px-6 lg:px-12" id="documentation">
          <div className="max-w-7xl mx-auto flex flex-col gap-10">
            <div className="flex flex-col gap-3 max-w-2xl">
              <div className="inline-flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-burgundy">
                  INTEGRATION SPECIFICATION
                </span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl text-ink-primary font-semibold">
                Stream Telemetry in Under Five Minutes
              </h2>
              <p className="text-base text-ink-secondary">
                Send synchronous or asynchronous hit records using standard HTTP transport. Authenticate via the simple{' '}
                <code className="font-mono text-burgundy font-bold bg-surface-container px-1.5 py-0.5 rounded">
                  x-api-key
                </code>{' '}
                header with zero custom SDK bloat required.
              </p>
            </div>

            {/* Code Inspector Terminal */}
            <div className="w-full bg-[#201A19] text-[#FAEEEC] rounded-xl shadow-2xl overflow-hidden border border-[#352F2E]">
              {/* Terminal Header */}
              <div className="bg-[#292323] px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-[#3D3434]">
                <div className="flex items-center gap-6">
                  {/* Traffic light dots */}
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#BA1A1A] inline-block" />
                    <span className="w-3 h-3 rounded-full bg-[#E3D1B8] inline-block" />
                    <span className="w-3 h-3 rounded-full bg-[#BAF0BB] inline-block" />
                  </div>
                  {/* Tabs */}
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveSnippetTab('curl')}
                      className={`px-3 py-1.5 rounded transition-all font-semibold cursor-pointer ${
                        activeSnippetTab === 'curl'
                          ? 'bg-[#3D3434] text-white shadow-inner'
                          : 'text-[#C5B8B6] hover:text-white'
                      }`}
                    >
                      cURL
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSnippetTab('node')}
                      className={`px-3 py-1.5 rounded transition-all font-semibold cursor-pointer ${
                        activeSnippetTab === 'node'
                          ? 'bg-[#3D3434] text-white shadow-inner'
                          : 'text-[#C5B8B6] hover:text-white'
                      }`}
                    >
                      Node.js (Fetch)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSnippetTab('python')}
                      className={`px-3 py-1.5 rounded transition-all font-semibold cursor-pointer ${
                        activeSnippetTab === 'python'
                          ? 'bg-[#3D3434] text-white shadow-inner'
                          : 'text-[#C5B8B6] hover:text-white'
                      }`}
                    >
                      Python (Requests)
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-[#9ED3A0] hidden sm:inline">
                    POST /api/hit — 202 Accepted Response
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySnippet}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3D3434] hover:bg-[#4D4242] text-white rounded text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-sm"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#9ED3A0]" />
                        <span className="text-[#9ED3A0]">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Snippet</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Code Snippet Pre */}
              <div className="p-6 lg:p-8 font-mono text-xs sm:text-sm overflow-x-auto">
                <pre className="leading-relaxed text-[#F7EBE9]">
                  <code>{snippets[activeSnippetTab]}</code>
                </pre>
              </div>

              {/* Terminal Footer Status Bar */}
              <div className="bg-[#292323] px-6 py-3 border-t border-[#3D3434] flex flex-wrap items-center justify-between text-xs text-[#C5B8B6] font-mono">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#BAF0BB]" />
                    HTTP/2 Multiplexed
                  </span>
                  <span>TLS 1.3 Strict</span>
                </div>
                <div className="pt-1 sm:pt-0">
                  <span>
                    Acknowledgement: <span className="text-[#BAF0BB]">{'{ "success": true, "statusCode": 202, "data": { "status": "queued" } }'}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. EDITORIAL CONVERSION BANNER */}
        <section className="w-full bg-surface-container py-20 px-6 lg:px-12">
          <div className="max-w-7xl mx-auto bg-card-surface rounded-xl shadow-lg p-8 lg:p-14 flex flex-col lg:flex-row items-center justify-between gap-10 border border-hairline/80">
            <div className="flex flex-col gap-4 max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-burgundy">
                READY TO INSTRUMENT?
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl text-burgundy tracking-tight font-semibold">
                Ready to instrument your API cluster?
              </h2>
              <p className="text-base text-ink-secondary leading-relaxed">
                Create an isolated tenant workspace or connect your production API services in minutes. Full multi-tenant monitoring, metrics aggregation, and role governance included.
              </p>
              <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-ink-secondary font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#154620]" />
                  Instant workspace provisioning
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#154620]" />
                  Real-time telemetry aggregation
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#154620]" />
                  Salted SHA-512 API keys
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 bg-burgundy hover:bg-burgundy-dark text-white font-semibold text-sm px-8 py-4 rounded-lg shadow-md transition-all active:scale-95"
              >
                <span>Create your workspace</span>
                <Zap className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 bg-surface-container hover:bg-surface-container-high text-ink-primary font-semibold text-sm px-8 py-4 rounded-lg border border-hairline/60 shadow-sm transition-all"
              >
                <span>Sign in</span>
                <LogIn className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 8. FOOTER */}
      <footer className="w-full bg-surface-container border-t border-hairline/60" id="security">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
            <div className="md:col-span-2 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-burgundy flex items-center justify-center text-white">
                  <Activity className="w-4 h-4" />
                </div>
                <span className="font-serif text-lg font-bold text-burgundy">
                  Pulse Observability
                </span>
              </div>
              <p className="text-xs text-ink-secondary max-w-sm leading-relaxed">
                Scholarly telemetry, distributed tracing, and payload analytics designed for systems reliability engineers and architects.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-primary">
                Product
              </span>
              <nav className="flex flex-col gap-2 text-xs text-ink-secondary">
                <a href="#features" className="hover:text-burgundy transition-colors">
                  Tracing Engine
                </a>
                <a href="#features" className="hover:text-burgundy transition-colors">
                  Metrics &amp; Logs
                </a>
                <a href="#features" className="hover:text-burgundy transition-colors">
                  Payload Analysis
                </a>
                <a href="#features" className="hover:text-burgundy transition-colors">
                  Alert Automation
                </a>
              </nav>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-primary">
                Developer Docs
              </span>
              <nav className="flex flex-col gap-2 text-xs text-ink-secondary">
                <a href="#documentation" className="hover:text-burgundy transition-colors">
                  Quickstart API
                </a>
                <a href="#pipeline-architecture" className="hover:text-burgundy transition-colors">
                  OpenTelemetry SDK
                </a>
                <a href="#documentation" className="hover:text-burgundy transition-colors">
                  Reference Manual
                </a>
                <a href="#documentation" className="hover:text-burgundy transition-colors">
                  Client Libraries
                </a>
              </nav>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-primary">
                Compliance &amp; Trust
              </span>
              <nav className="flex flex-col gap-2 text-xs text-ink-secondary">
                <span className="hover:text-burgundy transition-colors cursor-pointer">
                  Audit &amp; Compliance
                </span>
                <span className="hover:text-burgundy transition-colors cursor-pointer">
                  GDPR &amp; Privacy
                </span>
                <span className="hover:text-burgundy transition-colors cursor-pointer">
                  System Status
                </span>
                <span className="hover:text-burgundy transition-colors cursor-pointer">
                  Encryption Protocols
                </span>
              </nav>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-hairline/40 flex flex-col md:flex-row items-center justify-between text-xs text-ink-secondary gap-4">
            <p>© 2025 Pulse Observability, Inc. Architectural systems telemetry.</p>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 text-[#154620] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#154620]" />
                All Systems Operational
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

