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
import { Gauge } from 'lucide-react';

export const LatencyTrendChart = ({ rawTimeSeries = [], isLoading = false, error = null }) => {
  const { chartData, peakLatency, overallAvg } = useMemo(() => {
    if (!Array.isArray(rawTimeSeries) || rawTimeSeries.length === 0) {
      return { chartData: [], peakLatency: 0, overallAvg: 0 };
    }

    // Group by timeBucket and calculate weighted average latency
    const bucketMap = new Map();

    rawTimeSeries.forEach((item) => {
      const bucket = item.timeBucket;
      if (!bucket) return;

      const dateObj = new Date(bucket);
      const timeKey = dateObj.getTime();
      const hits = Number(item.totalHits) || 0;
      const latency = Number(item.avgLatency) || 0;

      if (!bucketMap.has(timeKey)) {
        bucketMap.set(timeKey, {
          timestamp: timeKey,
          dateObj,
          sumLatencyHits: latency * hits,
          totalHits: hits,
        });
      } else {
        const existing = bucketMap.get(timeKey);
        existing.sumLatencyHits += latency * hits;
        existing.totalHits += hits;
      }
    });

    const sortedBuckets = Array.from(bucketMap.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );

    const minTime = sortedBuckets[0]?.timestamp || 0;
    const maxTime = sortedBuckets[sortedBuckets.length - 1]?.timestamp || 0;
    const spanMs = maxTime - minTime;
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const SEVEN_DAYS = 7 * ONE_DAY;

    let peak = 0;
    let totalAllHits = 0;
    let totalAllLatencyHits = 0;

    const data = sortedBuckets.map((b) => {
      const weightedAvg =
        b.totalHits > 0 ? Number((b.sumLatencyHits / b.totalHits).toFixed(2)) : 0;
      if (weightedAvg > peak) peak = weightedAvg;
      totalAllHits += b.totalHits;
      totalAllLatencyHits += b.sumLatencyHits;

      let label;
      if (spanMs <= ONE_DAY) {
        label = b.dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (spanMs <= SEVEN_DAYS) {
        const month = b.dateObj.toLocaleDateString([], { month: 'short' });
        const day = b.dateObj.getDate();
        const time = b.dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        label = `${month} ${day}, ${time}`;
      } else {
        label = b.dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }

      return {
        timestamp: b.timestamp,
        label,
        fullDate: b.dateObj.toLocaleString([], {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        avgLatency: weightedAvg,
        totalHits: b.totalHits,
      };
    });

    const overall =
      totalAllHits > 0 ? Number((totalAllLatencyHits / totalAllHits).toFixed(1)) : 0;

    return { chartData: data, peakLatency: peak, overallAvg: overall };
  }, [rawTimeSeries]);

  if (isLoading) {
    return (
      <div className="p-6 rounded-xl bg-card-surface border border-hairline/60 shadow-sm flex flex-col justify-center items-center h-80">
        <div className="w-8 h-8 rounded-full border-2 border-secondary border-t-transparent animate-spin mb-2" />
        <span className="text-xs uppercase font-bold text-ink-secondary">Computing Latency Metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-card-surface border border-hairline/60 shadow-sm flex flex-col justify-center items-center h-80 text-center">
        <p className="text-xs font-semibold text-error mb-1">Failed to load latency trend</p>
        <p className="text-xs text-ink-secondary">{error}</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-card-surface border border-hairline/60 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">Telemetry Ledger 03</span>
          <span className="px-1.5 py-0.5 rounded bg-surface-container text-[10px] font-semibold text-secondary">Latency</span>
        </div>
        <EmptyState
          icon={Gauge}
          title="No Latency Telemetry"
          description="No latency records available for this period. Ensure services are dispatching requests to calculate response times."
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
              Telemetry Ledger 03
            </span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container text-[10px] font-semibold text-secondary">
              Response Times
            </span>
          </div>
          <h3 className="font-serif text-lg font-medium text-burgundy">
            Weighted Average Latency (ms)
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-secondary-container/60 text-on-secondary-container text-xs font-semibold">
            Mean: {overallAvg}ms
          </span>
          <span className="px-2 py-0.5 rounded bg-surface-container text-burgundy text-xs font-semibold">
            Peak: {peakLatency}ms
          </span>
        </div>
      </div>

      {/* SVG Recharts Area */}
      <div className="w-full h-64 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#576156" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#576156" stopOpacity={0.0} />
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
              tickFormatter={(val) => `${val}ms`}
            />
            <Tooltip
              content={
                <ChartTooltip
                  unit="ms"
                  formatter={(val) => `${val} ms`}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="avgLatency"
              name="Avg Latency"
              stroke="#576156"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#latencyGrad)"
              activeDot={{ r: 5, fill: '#642A3A', stroke: '#FFFCF7', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between items-center text-[10px] uppercase font-bold text-ink-secondary pt-3 border-t border-hairline/40 mt-2">
        <span>Formula: sum(latency × hits) / sum(hits)</span>
        <span>Resolution: 1-hour intervals</span>
      </div>
    </div>
  );
};

export default LatencyTrendChart;
