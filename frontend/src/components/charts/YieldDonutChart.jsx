import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import EmptyState from '../common/EmptyState';
import { PieChart as PieIcon } from 'lucide-react';

export const YieldDonutChart = ({
  successHits = 0,
  errorHits = 0,
  totalHits = 0,
  isLoading = false,
  error = null,
}) => {
  const { data, yieldRate, errorRate, total } = useMemo(() => {
    const s = Number(successHits) || 0;
    const e = Number(errorHits) || 0;
    const calcTotal = Number(totalHits) || s + e;

    const yieldPct = calcTotal > 0 ? ((s / calcTotal) * 100).toFixed(2) : '100.00';
    const errPct = calcTotal > 0 ? ((e / calcTotal) * 100).toFixed(2) : '0.00';

    const pieData = [
      { name: 'Successful', value: s, color: '#81b483' },
      { name: 'Anomalies / 4xx / 5xx', value: e, color: '#642A3A' },
    ];

    return {
      data: pieData,
      yieldRate: yieldPct,
      errorRate: errPct,
      total: calcTotal,
    };
  }, [successHits, errorHits, totalHits]);

  if (isLoading) {
    return (
      <div className="p-6 rounded-xl bg-card-surface border border-hairline/60 shadow-sm flex flex-col justify-center items-center h-80">
        <div className="w-8 h-8 rounded-full border-2 border-burgundy border-t-transparent animate-spin mb-2" />
        <span className="text-xs uppercase font-bold text-ink-secondary">Computing Ingest Yield...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-card-surface border border-hairline/60 shadow-sm flex flex-col justify-center items-center h-80 text-center">
        <p className="text-xs font-semibold text-error mb-1">Failed to calculate yield</p>
        <p className="text-xs text-ink-secondary">{error}</p>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="p-6 rounded-xl bg-card-surface border border-hairline/60 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">Telemetry Ledger 02</span>
          <span className="px-1.5 py-0.5 rounded bg-surface-container text-[10px] font-semibold text-burgundy">Yield</span>
        </div>
        <EmptyState
          icon={PieIcon}
          title="No Traffic for Yield Analysis"
          description="Awaiting telemetry hits to compute success vs error proportions."
        />
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 rounded-xl bg-card-surface border border-hairline/60 shadow-sm flex flex-col justify-between">
      {/* Header */}
      <div className="pb-3 mb-2 border-b border-hairline/40">
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
          Telemetry Ledger 02
        </span>
        <h3 className="font-serif text-lg font-medium text-burgundy">
          Yield Integrity
        </h3>
      </div>

      {/* Donut Container with centered inscription */}
      <div className="relative flex items-center justify-center my-auto py-2">
        <div className="w-48 h-48 sm:w-56 sm:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={85}
                paddingAngle={data[1].value > 0 ? 3 : 0}
                dataKey="value"
                stroke="#FFFCF7"
                strokeWidth={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val, name) => [
                  `${Number(val).toLocaleString()} hits`,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="font-serif text-xl sm:text-2xl font-bold text-burgundy tabular-nums">
            {total >= 1000000
              ? `${(total / 1000000).toFixed(2)}M`
              : total >= 1000
              ? `${(total / 1000).toFixed(1)}k`
              : total}
          </span>
          <span className="text-[10px] uppercase tracking-wider font-bold text-ink-secondary">
            Total Ingest
          </span>
          <span className="text-[11px] font-semibold text-[#3B5738] mt-0.5">
            {yieldRate}% Yield
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2 pt-3 border-t border-hairline/40 text-xs">
        <div className="flex items-center justify-between text-ink-primary">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#81b483]"></span>
            <span>2xx / 3xx Success</span>
          </div>
          <div className="flex items-center gap-2 font-mono tabular-nums">
            <span className="text-ink-secondary">({Number(successHits).toLocaleString()})</span>
            <span className="font-semibold text-secondary">{yieldRate}%</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-ink-primary">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-burgundy"></span>
            <span>4xx / 5xx Anomalies</span>
          </div>
          <div className="flex items-center gap-2 font-mono tabular-nums">
            <span className="text-ink-secondary">({Number(errorHits).toLocaleString()})</span>
            <span className="font-semibold text-burgundy">{errorRate}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YieldDonutChart;

