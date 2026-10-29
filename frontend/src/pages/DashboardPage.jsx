import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Network,
  RefreshCw,
  Building,
  CheckCircle,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import analyticsService from '../services/analyticsService';
import authService from '../services/authService';
import KpiCard from '../components/dashboard/KpiCard';
import TimeFilterStrip from '../components/dashboard/TimeFilterStrip';
import RequestVolumeChart from '../components/charts/RequestVolumeChart';
import LatencyTrendChart from '../components/charts/LatencyTrendChart';
import YieldDonutChart from '../components/charts/YieldDonutChart';
import TopEndpointsBarChart from '../components/charts/TopEndpointsBarChart';
import ReliabilityBarChart from '../components/charts/ReliabilityBarChart';
import MonitoredEndpointsTable from '../components/dashboard/MonitoredEndpointsTable';
import AlertMessage from '../components/common/AlertMessage';

export const DashboardPage = () => {
  const { user, role, activeScopeClientId, setActiveScopeClientId } = useAuthStore();
  const isSuperAdmin = role === 'super-admin';

  // State
  const [activePreset, setActivePreset] = useState('24h');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [healthStatus, setHealthStatus] = useState('200 OK');

  // Client Scope State (Super Admin can target a specific client ID)
  const [scopeClientIdInput, setScopeClientIdInput] = useState(activeScopeClientId || '');
  const [isEditingScope, setIsEditingScope] = useState(false);

  // Compute time range boundaries
  const getTimeBoundaries = useCallback(() => {
    const now = new Date();
    let startTime;
    let endTime = now.toISOString();

    if (activePreset === 'custom' && customRange.start && customRange.end) {
      return { startTime: customRange.start, endTime: customRange.end };
    }

    const hoursMap = {
      '1h': 1,
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30,
    };

    const hours = hoursMap[activePreset] || 24;
    startTime = new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

    return { startTime, endTime };
  }, [activePreset, customRange]);

  // Fetch Dashboard Analytics
  const fetchDashboard = useCallback(
    async (showSilentLoader = false) => {
      if (showSilentLoader) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const { startTime, endTime } = getTimeBoundaries();
        const params = { startTime, endTime };

        // For Super Admin: if a client ID is scoped, pass it
        if (isSuperAdmin && activeScopeClientId) {
          params.clientId = activeScopeClientId;
        }

        const [dashRes, healthRes] = await Promise.allSettled([
          analyticsService.getDashboard(params),
          authService.getHealth(),
        ]);

        if (dashRes.status === 'fulfilled' && dashRes.value?.data) {
          setDashboardData(dashRes.value.data);
        } else if (dashRes.status === 'rejected') {
          setError(dashRes.reason?.message || 'Failed to fetch telemetry analytics');
        }

        if (healthRes.status === 'fulfilled') {
          setHealthStatus('200 OK');
        } else {
          setHealthStatus('Degraded');
        }
      } catch (err) {
        setError(err.message || 'An error occurred while loading dashboard telemetry');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [getTimeBoundaries, isSuperAdmin, activeScopeClientId]
  );

  useEffect(() => {
    fetchDashboard(false);
  }, [fetchDashboard]);

  // Handle scope submission for Super Admin
  const handleApplyScope = (e) => {
    e.preventDefault();
    setActiveScopeClientId(scopeClientIdInput);
    setIsEditingScope(false);
  };

  const handleClearScope = () => {
    setScopeClientIdInput('');
    setActiveScopeClientId(null);
    setIsEditingScope(false);
  };

  // Safe extraction of dashboard items
  const stats = dashboardData?.stats || null;
  const topEndpoints = dashboardData?.topEndpoints || [];
  const recentTimeSeries = dashboardData?.recentTimeSeries || [];

  return (
    <div className="flex flex-col w-full pb-12">
      {/* Top Editorial Title Bar & Scoping Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div className="flex flex-col gap-1 max-w-2xl">
          <div className="flex items-center gap-2 text-ink-secondary text-xs uppercase tracking-wider font-bold">
            <span>Cluster Registry</span>
            <span className="opacity-40">/</span>
            <span className="text-burgundy">Active Pipeline</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl text-burgundy tracking-tight font-medium">
            System Observability Overview
          </h1>
          <p className="text-sm text-ink-secondary">
            Real-time telemetry and ingest analytics across registered services.
          </p>
        </div>

        {/* Scoping Controls & Health Ping */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Client Scope Context */}
          {isSuperAdmin ? (
            <div className="relative">
              {!isEditingScope ? (
                <button
                  onClick={() => setIsEditingScope(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card-surface border border-hairline/60 shadow-sm text-left hover:border-burgundy transition-colors cursor-pointer"
                >
                  <Building className="w-4 h-4 text-burgundy shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-ink-secondary">
                      Client Scope
                    </span>
                    <span className="text-xs font-semibold text-burgundy max-w-[140px] truncate">
                      {activeScopeClientId ? `ID: ${activeScopeClientId.substring(0, 10)}...` : 'All Tenants (Global)'}
                    </span>
                  </div>
                </button>
              ) : (
                <form
                  onSubmit={handleApplyScope}
                  className="flex items-center gap-1.5 p-1.5 rounded-lg bg-card-surface border border-burgundy shadow-md"
                >
                  <input
                    type="text"
                    value={scopeClientIdInput}
                    onChange={(e) => setScopeClientIdInput(e.target.value)}
                    placeholder="Enter Client ID (24-hex)"
                    className="px-2 py-1 text-xs rounded border border-hairline bg-surface-container-low text-ink-primary outline-none font-mono"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 bg-burgundy text-white text-xs rounded font-semibold hover:opacity-90 cursor-pointer"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={handleClearScope}
                    className="px-2 py-1 bg-surface-container text-ink-secondary text-xs rounded hover:text-ink-primary cursor-pointer"
                    title="Reset to Global"
                  >
                    Global
                  </button>
                </form>
              )}
            </div>
          ) : user?.clientId ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card-surface border border-hairline/60 shadow-sm text-left">
              <Building className="w-4 h-4 text-secondary shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold text-ink-secondary">Tenant Scope</span>
                <span className="text-xs font-semibold text-ink-primary font-mono">
                  {String(user.clientId).substring(0, 12)}...
                </span>
              </div>
            </div>
          ) : null}

          {/* Health Badge */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card-surface border border-hairline/60 shadow-sm">
            <span
              className={`w-2 h-2 rounded-full ${
                healthStatus === '200 OK'
                  ? 'bg-tertiary-container animate-pulse'
                  : 'bg-error animate-ping'
              }`}
            />
            <span className="text-[11px] uppercase tracking-wider font-bold text-tertiary-container">
              GET /health: {healthStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <AlertMessage
          type="error"
          title="Telemetry Ingest Failure"
          message={error}
          onDismiss={() => setError(null)}
          className="mb-6"
        />
      )}

      {/* Time Horizon Filtering Strip */}
      <TimeFilterStrip
        activePreset={activePreset}
        onPresetChange={setActivePreset}
        customRange={customRange}
        onCustomRangeChange={setCustomRange}
        onRefresh={() => fetchDashboard(true)}
        isRefreshing={isRefreshing}
      />

      {/* Six KPI Metric Ledger */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-8">
        <KpiCard
          title="Total Requests"
          value={stats ? Number(stats.totalHits).toLocaleString() : '—'}
          subtitle="Selected window"
          badgeText="Active Traces"
          badgeType="neutral"
          icon={Activity}
          iconColor="text-burgundy"
        />

        <KpiCard
          title="Successful"
          value={stats ? Number(stats.successHits).toLocaleString() : '—'}
          subtitle={
            stats && stats.totalHits > 0
              ? `${(((stats.successHits) / stats.totalHits) * 100).toFixed(2)}% Yield`
              : '100% Yield'
          }
          badgeText={stats && stats.errorHits === 0 ? 'Optimal' : 'Reported'}
          badgeType="success"
          icon={CheckCircle2}
          iconColor="text-[#3B5738]"
        />

        <KpiCard
          title="Error Rate"
          value={stats ? `${stats.errorRate}%` : '—'}
          subtitle={stats ? `${Number(stats.errorHits).toLocaleString()} Failed` : '0 Failed'}
          badgeText={stats && stats.errorRate > 2 ? 'Elevated' : 'Nominal'}
          badgeType={stats && stats.errorRate > 2 ? 'error' : 'neutral'}
          icon={AlertTriangle}
          iconColor="text-burgundy"
        />

        <KpiCard
          title="Avg Latency"
          value={stats ? `${stats.avgLatency} ms` : '—'}
          subtitle="Target < 50ms"
          badgeText={stats && stats.avgLatency < 50 ? 'Healthy SLA' : 'SLA Alert'}
          badgeType={stats && stats.avgLatency < 50 ? 'success' : 'warning'}
          icon={Clock}
          iconColor="text-secondary"
        />

        <KpiCard
          title="Services"
          value={stats ? stats.uniqueServices : '—'}
          subtitle="Monitored Apps"
          badgeText="100% Up"
          badgeType="success"
          icon={Layers}
          iconColor="text-secondary"
        />

        <KpiCard
          title="Endpoints"
          value={stats ? stats.uniqueEndpoints : '—'}
          subtitle="Active Traced"
          badgeText="Enforced"
          badgeType="neutral"
          icon={Network}
          iconColor="text-secondary"
        />
      </div>

      {/* Primary Visualizations: Graph A (Volume) + Graph C (Yield Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-8">
        <div className="lg:col-span-8">
          <RequestVolumeChart
            rawTimeSeries={recentTimeSeries}
            isLoading={isLoading}
            error={dashboardData?.recentTimeSeries === null ? 'Time series telemetry unavailable' : null}
          />
        </div>
        <div className="lg:col-span-4">
          <YieldDonutChart
            successHits={stats?.successHits || 0}
            errorHits={stats?.errorHits || 0}
            totalHits={stats?.totalHits || 0}
            isLoading={isLoading}
            error={dashboardData?.stats === null ? 'Yield calculations unavailable' : null}
          />
        </div>
      </div>

      {/* Secondary Visualizations: Graph B (Weighted Latency) + Graph E (Reliability Stack) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-8">
        <div className="lg:col-span-6">
          <LatencyTrendChart
            rawTimeSeries={recentTimeSeries}
            isLoading={isLoading}
            error={dashboardData?.recentTimeSeries === null ? 'Latency trend unavailable' : null}
          />
        </div>
        <div className="lg:col-span-6">
          <ReliabilityBarChart
            topEndpoints={topEndpoints}
            isLoading={isLoading}
            error={dashboardData?.topEndpoints === null ? 'Reliability breakdown unavailable' : null}
          />
        </div>
      </div>

      {/* Tertiary Visualization: Graph D (Top Endpoints Ranking) */}
      <div className="w-full mb-8">
        <TopEndpointsBarChart
          topEndpoints={topEndpoints}
          isLoading={isLoading}
          error={dashboardData?.topEndpoints === null ? 'Top endpoints data unavailable' : null}
        />
      </div>

      {/* Monitored Endpoints Table */}
      <div className="w-full">
        <MonitoredEndpointsTable
          endpoints={topEndpoints}
          isLoading={isLoading}
          error={dashboardData?.topEndpoints === null ? 'Endpoint registry unavailable' : null}
        />
      </div>
    </div>
  );
};

export default DashboardPage;

