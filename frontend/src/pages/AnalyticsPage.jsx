import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart as LineChartIcon,
  Building,
  Filter,
  Layers,
  Clock,
  Activity,
  AlertTriangle,
  Info,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import analyticsService from '../services/analyticsService';
import clientService from '../services/clientService';
import TimeFilterStrip from '../components/dashboard/TimeFilterStrip';
import RequestVolumeChart from '../components/charts/RequestVolumeChart';
import LatencyTrendChart from '../components/charts/LatencyTrendChart';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import AlertMessage from '../components/common/AlertMessage';

export const AnalyticsPage = () => {
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
        .catch((err) => console.error('Failed to load clients for analytics:', err));
    }
  }, [isSuperAdmin]);

  const [activePreset, setActivePreset] = useState('24h');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

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

  const fetchAnalytics = useCallback(
    async (silent = false) => {
      if (silent) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        const { startTime, endTime } = getTimeBoundaries();
        const params = { startTime, endTime };

        if (isSuperAdmin && activeScopeClientId) {
          params.clientId = activeScopeClientId;
        }

        const res = await analyticsService.getDashboard(params);
        if (res?.data) {
          setDashboardData(res.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch analytics ledger');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [getTimeBoundaries, isSuperAdmin, activeScopeClientId]
  );

  useEffect(() => {
    fetchAnalytics(false);
  }, [fetchAnalytics]);

  const stats = dashboardData?.stats;
  const timeSeries = dashboardData?.recentTimeSeries || [];
  const topEndpoints = dashboardData?.topEndpoints || [];

  return (
    <div className="flex flex-col w-full pb-12">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-ink-secondary text-xs uppercase tracking-wider font-bold mb-1">
            <span>Diagnostics</span>
            <span className="opacity-40">/</span>
            <span className="text-burgundy">In-Depth Telemetry Ledger</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl text-burgundy tracking-tight font-medium">
            Telemetry &amp; Latency Analytics
          </h1>
          <p className="text-sm text-ink-secondary mt-0.5">
            Statistical breakdown of incoming traces across services and routes.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isSuperAdmin && (
            <div className="flex items-center gap-1.5 bg-card-surface px-3 py-1.5 rounded-lg border border-hairline/60 shadow-sm">
              <Building className="w-4 h-4 text-burgundy shrink-0" />
              <select
                value={activeScopeClientId || ''}
                onChange={(e) => setActiveScopeClientId(e.target.value || null)}
                className="text-xs font-semibold text-burgundy bg-transparent outline-none cursor-pointer"
              >
                <option value="">Cluster Global (All Tenants)</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.slug})
                  </option>
                ))}
              </select>
            </div>
          )}
          <StatusBadge
            type={isSuperAdmin ? 'super-admin' : 'client-admin'}
            label={isSuperAdmin ? (activeScopeClientId ? `Client: ${activeScopeClientId.substring(0, 8)}...` : 'Cluster Global') : 'Tenant Assoc'}
          />
        </div>
      </div>

      {error && (
        <AlertMessage
          type="error"
          title="Analytics Retrieval Error"
          message={error}
          onDismiss={() => setError(null)}
          className="mb-6"
        />
      )}

      {/* Protocol Note for Analytics Gap */}
      <div className="w-full mb-6 bg-surface-container-high rounded-xl p-4 flex items-start gap-3 border border-hairline/60">
        <Info className="w-5 h-5 text-burgundy shrink-0 mt-0.5" />
        <div className="text-xs text-ink-secondary leading-relaxed">
          <span className="font-bold text-burgundy uppercase tracking-wider">
            Telemetry Metric Fidelity Note:
          </span>{' '}
          The current backend calculates arithmetic weighted means for latency. Percentile metrics (p95, p99) and custom alert notification triggers are not currently exposed by backend analytics API and are safely omitted.
        </div>
      </div>

      {/* Time Horizon Filter Strip */}
      <TimeFilterStrip
        activePreset={activePreset}
        onPresetChange={setActivePreset}
        customRange={customRange}
        onCustomRangeChange={setCustomRange}
        onRefresh={() => fetchAnalytics(true)}
        isRefreshing={isRefreshing}
      />

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <RequestVolumeChart rawTimeSeries={timeSeries} isLoading={isLoading} />
        <LatencyTrendChart rawTimeSeries={timeSeries} isLoading={isLoading} />
      </div>

      {/* Service-by-Service Breakdown Table */}
      <div className="p-5 sm:p-6 rounded-xl bg-card-surface border border-hairline/60 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-hairline/40">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
              Decomposition Ledger
            </span>
            <h3 className="font-serif text-lg font-medium text-burgundy">
              Top Endpoints Telemetry Details
            </h3>
          </div>
          <span className="text-xs font-mono text-ink-secondary">
            {topEndpoints.length} registered endpoints
          </span>
        </div>

        {topEndpoints.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No Breakdown Telemetry"
            description="Service metrics will populate automatically when requests arrive via the ingestion endpoint."
          />
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low text-ink-secondary font-semibold border-b border-hairline/60">
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Endpoint</th>
                  <th className="py-2.5 px-3 text-right">Total Hits</th>
                  <th className="py-2.5 px-3 text-right">Error Hits</th>
                  <th className="py-2.5 px-3 text-right">Error Rate</th>
                  <th className="py-2.5 px-3 text-right">Mean Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline/40 text-ink-primary">
                {topEndpoints.map((ep, idx) => (
                  <tr key={idx} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-3 px-3 font-semibold text-ink-primary">{ep.serviceName || 'Default'}</td>
                    <td className="py-3 px-3">
                      <StatusBadge type={ep.method || 'GET'} label={ep.method || 'GET'} />
                    </td>
                    <td className="py-3 px-3 font-mono text-burgundy font-medium">{ep.endpoint}</td>
                    <td className="py-3 px-3 text-right font-medium tabular-nums">
                      {Number(ep.totalHits || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-error font-medium tabular-nums">
                      {Number(ep.errorHits || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold tabular-nums">
                      {Number(ep.errorRate || 0).toFixed(2)}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {ep.avgLatency} ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;

