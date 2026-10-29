import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import EmptyState from '../common/EmptyState';
import { ShieldCheck } from 'lucide-react';

export const ReliabilityBarChart = ({ topEndpoints = [], isLoading = false, error = null }) => {
  const chartData = useMemo(() => {
    if (!Array.isArray(topEndpoints) || topEndpoints.length === 0) {
      return [];
    }

    return topEndpoints.map((item) => {
      const total = Math.max(0, Number(item.totalHits) || 0);
      const errors = Math.max(0, Number(item.errorHits) || 0);
      const success = Math.max(0, total - errors);

      const endpointLabel = item.endpoint || 'Unknown';
      const shortName = endpointLabel.length > 20 ? `${endpointLabel.substring(0, 18)}…` : endpointLabel;

      return {
        endpoint: item.endpoint,
        shortName,
        serviceName: item.serviceName || 'Default',
        method: item.method || 'GET',
        successHits: success,
        errorHits: errors,
        totalHits: total,
        errorRate: item.errorRate || (total > 0 ? ((errors / total) * 100).toFixed(2) : '0.00'),
      };
    });
  }, [topEndpoints]);

  if (isLoading) {
    return (
      <div className="p-6 rounded-xl bg-card-surface border border-hairline/60 shadow-sm flex flex-col justify-center items-center h-80">
        <div className="w-8 h-8 rounded-full border-2 border-tertiary-container border-t-transparent animate-spin mb-2" />
        <span className="text-xs uppercase font-bold text-ink-secondary">Evaluating Reliability Distribution...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-card-surface border border-hairline/60 shadow-sm flex flex-col justify-center items-center h-80 text-center">
        <p className="text-xs font-semibold text-error mb-1">Failed to load reliability breakdown</p>
        <p className="text-xs text-ink-secondary">{error}</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-card-surface border border-hairline/60 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">Telemetry Ledger 05</span>
          <span className="px-1.5 py-0.5 rounded bg-surface-container text-[10px] font-semibold text-tertiary-container">Reliability</span>
        </div>
        <EmptyState
          icon={ShieldCheck}
          title="No Reliability Data"
          description="Service reliability charts will emerge as incoming traces report HTTP status distributions."
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
              Telemetry Ledger 05
            </span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container text-[10px] font-semibold text-tertiary-container">
              Success vs Error
            </span>
          </div>
          <h3 className="font-serif text-lg font-medium text-burgundy">
            Endpoint Reliability Breakdown
          </h3>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-ink-primary">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#81b483]"></span>
            <span>Success</span>
          </span>
          <span className="flex items-center gap-1.5 text-ink-primary">
            <span className="w-2.5 h-2.5 rounded-sm bg-burgundy"></span>
            <span>Error</span>
          </span>
        </div>
      </div>

      {/* Stacked Bar Chart */}
      <div className="w-full h-72 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F1E6E4" vertical={false} />
            <XAxis
              dataKey="shortName"
              stroke="#847376"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#DED6CA' }}
              angle={-20}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              stroke="#847376"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-surface-container-highest border border-hairline p-3 rounded-lg shadow-md text-xs">
                      <div className="font-bold text-burgundy mb-1">
                        {item.method} {item.endpoint}
                      </div>
                      <div className="text-ink-secondary text-[11px] mb-2 font-mono">
                        Service: {item.serviceName}
                      </div>
                      <div className="space-y-1 pt-1 border-t border-hairline/60">
                        <div className="flex justify-between gap-4 text-[#3B5738]">
                          <span>Successful Hits:</span>
                          <span className="font-semibold tabular-nums">
                            {item.successHits.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 text-error">
                          <span>Error Hits:</span>
                          <span className="font-semibold tabular-nums">
                            {item.errorHits.toLocaleString()} ({item.errorRate}%)
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 text-ink-primary pt-1 border-t border-hairline/40 font-semibold">
                          <span>Total Ingest:</span>
                          <span className="tabular-nums">{item.totalHits.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="successHits" name="Success" stackId="a" fill="#81b483" />
            <Bar dataKey="errorHits" name="Error" stackId="a" fill="#642A3A" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between items-center text-[10px] uppercase font-bold text-ink-secondary pt-3 border-t border-hairline/40 mt-2">
        <span>Enforced Formula: Total = Success Hits + Error Hits</span>
        <span>Stacked Volumetric Density</span>
      </div>
    </div>
  );
};

export default ReliabilityBarChart;

