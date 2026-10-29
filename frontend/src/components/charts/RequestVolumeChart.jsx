import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import ChartTooltip from './ChartTooltip';
import EmptyState from '../common/EmptyState';
import { Activity } from 'lucide-react';

export const RequestVolumeChart = ({ rawTimeSeries = [], isLoading = false, error = null }) => {
  const chartData = useMemo(() => {
    if (!Array.isArray(rawTimeSeries) || rawTimeSeries.length === 0) {
      return [];
    }

    // Group by timeBucket
    const bucketMap = new Map();

    rawTimeSeries.forEach((item) => {
      const bucket = item.timeBucket;
      if (!bucket) return;

      const dateObj = new Date(bucket);
      const timeKey = dateObj.getTime();
      const hits = Number(item.totalHits) || 0;

      if (bucketMap.has(timeKey)) {
        bucketMap.get(timeKey).totalHits += hits;
      } else {
        bucketMap.set(timeKey, {
          timestamp: timeKey,
          label: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          fullDate: dateObj.toLocaleString(),
          totalHits: hits,
        });
      }
    });

    // Sort chronologically
    return Array.from(bucketMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [rawTimeSeries]);

  const peakPoint = useMemo(() => {
    if (chartData.length === 0) return null;
    return chartData.reduce(
      (max, cur) => (cur.totalHits > (max?.totalHits || 0) ? cur : max),
      chartData[0]
    );
  }, [chartData]);

  if (isLoading) {
    return (
      <div className="p-6 rounded-xl bg-card-surface border border-hairline/60 shadow-sm flex flex-col justify-center items-center h-80">
        <div className="w-8 h-8 rounded-full border-2 border-burgundy border-t-transparent animate-spin mb-2" />
        <span className="text-xs uppercase font-bold text-ink-secondary">Compiling Telemetry Waves...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-card-surface border border-hairline/60 shadow-sm flex flex-col justify-center items-center h-80 text-center">
        <p className="text-xs font-semibold text-error mb-1">Failed to load request volume</p>
        <p className="text-xs text-ink-secondary">{error}</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-card-surface border border-hairline/60 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">Telemetry Ledger 01</span>
          <span className="px-1.5 py-0.5 rounded bg-surface-container text-[10px] font-semibold text-burgundy">Volume</span>
        </div>
        <EmptyState
          icon={Activity}
          title="No Volume Telemetry"
          description="No request volume recorded in this time range. Send API calls with your API key to generate telemetry data."
        />
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 rounded-xl bg-card-surface border border-hairline/60 shadow-sm flex flex-col justify-between">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-2 border-b border-hairline/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
              Telemetry Ledger 01
            </span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container text-[10px] font-semibold text-burgundy">
              Request Volume
            </span>
          </div>
          <h3 className="font-serif text-lg font-medium text-burgundy">
            Request Volume Over Time
          </h3>
        </div>

        {peakPoint && (
          <div className="flex items-center gap-2 text-xs text-ink-secondary">
            <span className="w-2.5 h-0.5 bg-burgundy"></span>
            <span>Peak:</span>
            <span className="font-semibold text-burgundy tabular-nums">
              {peakPoint.totalHits.toLocaleString()} hits @ {peakPoint.label}
            </span>
          </div>
        )}
      </div>

      {/* SVG Recharts Area */}
      <div className="w-full h-64 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#642A3A" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#642A3A" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1E6E4" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#847376"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#DED6CA' }}
            />
            <YAxis
              stroke="#847376"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
            />
            <Tooltip
              content={
                <ChartTooltip
                  unit="hits"
                  formatter={(val) => Number(val).toLocaleString()}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="totalHits"
              name="Total Hits"
              stroke="#642A3A"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#volGrad)"
              activeDot={{ r: 6, fill: '#642A3A', stroke: '#FFFCF7', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between items-center text-[10px] uppercase font-bold text-ink-secondary pt-3 border-t border-hairline/40 mt-2">
        <span>Timeline Start</span>
        <span>Chronological Ingest Stream</span>
        <span>Timeline End</span>
      </div>
    </div>
  );
};

export default RequestVolumeChart;

