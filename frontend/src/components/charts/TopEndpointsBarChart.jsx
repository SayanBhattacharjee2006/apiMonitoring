import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import EmptyState from '../common/EmptyState';
import StatusBadge from '../common/StatusBadge';
import { BarChart3 } from 'lucide-react';

export const TopEndpointsBarChart = ({ topEndpoints = [], isLoading = false, error = null }) => {
  const chartData = useMemo(() => {
    if (!Array.isArray(topEndpoints) || topEndpoints.length === 0) {
      return [];
    }

    // Rank by totalHits descending
    return [...topEndpoints]
      .sort((a, b) => (Number(b.totalHits) || 0) - (Number(a.totalHits) || 0))
      .map((item) => ({
        ...item,
        hits: Number(item.totalHits) || 0,
        latency: Number(item.avgLatency) || 0,
        errRate: Number(item.errorRate) || 0,
        displayName: `${item.method ? item.method + ' ' : ''}${item.endpoint || 'Unknown'}`,
      }));
  }, [topEndpoints]);

  if (isLoading) {
    return (
      <div className="p-6 rounded-xl bg-card-surface border border-hairline/60 shadow-sm flex flex-col justify-center items-center h-80">
        <div className="w-8 h-8 rounded-full border-2 border-burgundy border-t-transparent animate-spin mb-2" />
        <span className="text-xs uppercase font-bold text-ink-secondary">Ranking Top Endpoints...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-card-surface border border-hairline/60 shadow-sm flex flex-col justify-center items-center h-80 text-center">
        <p className="text-xs font-semibold text-error mb-1">Failed to rank top endpoints</p>
        <p className="text-xs text-ink-secondary">{error}</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-card-surface border border-hairline/60 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">Telemetry Ledger 04</span>
          <span className="px-1.5 py-0.5 rounded bg-surface-container text-[10px] font-semibold text-burgundy">Top Endpoints</span>
        </div>
        <EmptyState
          icon={BarChart3}
          title="No Endpoint Records"
          description="Endpoint breakdown will populate as applications stream traffic through the monitored routes."
        />
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 rounded-xl bg-card-surface border border-hairline/60 shadow-sm flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-2 border-b border-hairline/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
              Telemetry Ledger 04
            </span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container text-[10px] font-semibold text-burgundy">
              Volume Ranking
            </span>
          </div>
          <h3 className="font-serif text-lg font-medium text-burgundy">
            Top Endpoints by Volume &amp; Ingest Density
          </h3>
        </div>

        <span className="text-xs text-ink-secondary uppercase font-semibold">
          Ranked by Total Hits
        </span>
      </div>

      {/* Horizontal Comparative Bar Chart */}
      <div className="w-full h-72 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F1E6E4" horizontal={false} />
            <XAxis
              type="number"
              stroke="#847376"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#DED6CA' }}
              tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
            />
            <YAxis
              type="category"
              dataKey="displayName"
              stroke="#847376"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#DED6CA' }}
              width={160}
              tickFormatter={(val) => (val.length > 24 ? `${val.substring(0, 22)}…` : val)}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-surface-container-highest border border-hairline p-3 rounded-lg shadow-md text-xs">
                      <div className="flex items-center gap-2 mb-1.5">
                        <StatusBadge type={item.method} label={item.method} />
                        <span className="font-bold text-burgundy">{item.endpoint}</span>
                      </div>
                      <div className="text-ink-secondary text-[11px] mb-2 font-mono">
                        Service: {item.serviceName || 'Default'}
                      </div>
                      <div className="space-y-1 pt-1 border-t border-hairline/60">
                        <div className="flex justify-between gap-4">
                          <span className="text-ink-secondary">Total Ingest:</span>
                          <span className="font-semibold text-burgundy tabular-nums">
                            {item.hits.toLocaleString()} hits
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-ink-secondary">Avg Latency:</span>
                          <span className="font-semibold text-ink-primary tabular-nums">
                            {item.latency} ms
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-ink-secondary">Error Rate:</span>
                          <span className="font-semibold text-error tabular-nums">
                            {item.errRate}% ({Number(item.errorHits || 0).toLocaleString()} failed)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="hits" name="Total Hits" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index % 2 === 0 ? '#642A3A' : '#576156'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between items-center text-[10px] uppercase font-bold text-ink-secondary pt-3 border-t border-hairline/40 mt-2">
        <span>Endpoints: {chartData.length} Analyzed</span>
        <span>Includes Latency &amp; Error Metrics in Tooltips</span>
      </div>
    </div>
  );
};

export default TopEndpointsBarChart;

