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
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import analyticsService from '../services/analyticsService';
import authService from '../services/authService';
import clientService from '../services/clientService';
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

  const [clients, setClients] = useState([]);

  useEffect(() => {
    if (isSuperAdmin) {
      clientService
        .getClients()
        .then((res) => {
          if (res?.data && Array.isArray(res.data)) {
            setClients(res.data);
          }
        })
        .catch((err) => console.error('Failed to load clients for dashboard:', err));
    }
  }, [isSuperAdmin]);

  // State
  const [activePreset, setActivePreset] = useState('24h');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [healthStatus, setHealthStatus] = useState('Checking');

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
          setHealthStatus('Available');
        } else {
          setHealthStatus('Unavailable');
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
            Aggregated telemetry and ingest analytics across registered services.
          </p>
        </div>

        {/* Scoping Controls & Health Ping */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Client Scope Context */}
          {isSuperAdmin ? (
            <div className="flex items-center gap-2 bg-card-surface px-3 py-1.5 rounded-lg border border-hairline/60 shadow-sm">
              <Building className="w-4 h-4 text-burgundy shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold text-ink-secondary">
                  Telemetry Scope
                </span>
                <select
                  value={activeScopeClientId || ''}
                  onChange={(e) => setActiveScopeClientId(e.target.value || null)}
                  className="text-xs font-semibold text-burgundy bg-transparent outline-none cursor-pointer max-w-[180px] sm:max-w-[220px]"
                >
                  <option value="">Cluster Global (All Tenants)</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.slug})
                    </option>
                  ))}
                </select>
              </div>
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
                healthStatus === 'Available'
                  ? 'bg-tertiary-container animate-pulse'
                  : healthStatus === 'Checking'
                  ? 'bg-ink-secondary/50'
                  : 'bg-error animate-ping'
              }`}
            />
            <span className="text-[11px] uppercase tracking-wider font-bold text-ink-secondary">
              Monitoring API:{' '}
              <span
                className={
                  healthStatus === 'Available'
                    ? 'text-tertiary-container'
                    : healthStatus === 'Unavailable'
                    ? 'text-error'
                    : 'text-ink-primary'
                }
              >
                {healthStatus}
              </span>
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
          badgeText="Requests Observed"
          badgeType="neutral"
          icon={Activity}
          iconColor="text-burgundy"
        />

        <KpiCard
          title="Successful"
          value={stats ? Number(stats.successHits).toLocaleString() : '—'}
          subtitle={
            stats && stats.totalHits > 0
              ? `${(((stats.successHits) / stats.totalHits) * 100).toFixed(2)}% Success Rate`
              : 'No requests observed'
          }
          badgeText={
            stats && stats.totalHits > 0
              ? stats.errorHits === 0
                ? 'No Errors'
                : 'Errors Observed'
              : 'No Data'
          }
          badgeType={stats && stats.errorHits > 0 ? 'warning' : 'neutral'}
          icon={CheckCircle2}
          iconColor="text-[#3B5738]"
        />

        <KpiCard
          title="Error Rate"
          value={stats && stats.totalHits > 0 ? `${stats.errorRate}%` : (stats ? '0%' : '—')}
          subtitle={stats ? `${Number(stats.errorHits).toLocaleString()} Failed` : '0 Failed'}
          badgeText={
            stats && stats.totalHits > 0
              ? stats.errorHits > 0
                ? 'Errors Observed'
                : 'No Errors'
              : 'No Data'
          }
          badgeType={stats && stats.errorHits > 0 ? 'warning' : 'neutral'}
          icon={AlertTriangle}
          iconColor="text-burgundy"
        />

        <KpiCard
          title="Avg Latency"
          value={stats ? `${stats.avgLatency} ms` : '—'}
          subtitle="Across selected requests"
          badgeText="Observed"
          badgeType="neutral"
          icon={Clock}
          iconColor="text-secondary"
        />

        <KpiCard
          title="Services"
          value={stats ? stats.uniqueServices : '—'}
          subtitle="Monitored Apps"
          badgeText="Registered"
          badgeType="neutral"
          icon={Layers}
          iconColor="text-secondary"
        />

        <KpiCard
          title="Endpoints"
          value={stats ? stats.uniqueEndpoints : '—'}
          subtitle="Observed Endpoints"
          badgeText="Observed"
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
