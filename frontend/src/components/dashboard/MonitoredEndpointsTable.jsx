import React from 'react';
import StatusBadge from '../common/StatusBadge';
import EmptyState from '../common/EmptyState';
import { Layers } from 'lucide-react';

export const MonitoredEndpointsTable = ({
  endpoints = [],
  isLoading = false,
  error = null,
}) => {
  if (isLoading) {
    return (
      <div className="p-6 rounded-xl bg-card-surface border border-hairline/60 shadow-sm flex flex-col justify-center items-center h-48">
        <div className="w-6 h-6 rounded-full border-2 border-burgundy border-t-transparent animate-spin mb-2" />
        <span className="text-xs uppercase font-bold text-ink-secondary">Loading Registry Traces...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-card-surface border border-hairline/60 shadow-sm text-center">
        <p className="text-xs font-semibold text-error mb-1">Failed to load monitored endpoints</p>
        <p className="text-xs text-ink-secondary">{error}</p>
      </div>
    );
  }

  if (!Array.isArray(endpoints) || endpoints.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-card-surface border border-hairline/60 shadow-sm">
        <div className="pb-3 mb-3 border-b border-hairline/40">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
            Registry Inspection
          </span>
          <h3 className="font-serif text-lg font-medium text-burgundy">
            Recent Monitored Endpoints
          </h3>
        </div>
        <EmptyState
          icon={Layers}
          title="No Endpoint Records Detected"
          description="The telemetry service returned an empty ingest payload for this cluster over the selected window. Please check trace collector agents or broaden the time range."
        />
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 rounded-xl bg-card-surface border border-hairline/60 shadow-sm flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-hairline/40">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
            Registry Inspection
          </span>
          <h3 className="font-serif text-lg font-medium text-burgundy">
            Recent Monitored Endpoints
          </h3>
        </div>

        <span className="text-xs text-ink-secondary font-mono">
          Showing {endpoints.length} active registered endpoints
        </span>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low text-ink-secondary font-semibold text-xs border-b border-hairline/60">
              <th className="py-2.5 px-4 rounded-l">Method</th>
              <th className="py-2.5 px-4">Endpoint URI</th>
              <th className="py-2.5 px-4">Service Domain</th>
              <th className="py-2.5 px-4 text-right">Total Hits</th>
              <th className="py-2.5 px-4 text-right">Avg Latency</th>
              <th className="py-2.5 px-4 text-right">Error Rate</th>
              <th className="py-2.5 px-4 rounded-r text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline/40 text-xs text-ink-primary">
            {endpoints.map((ep, idx) => {
              const errRate = Number(ep.errorRate) || 0;
              const errHits = Number(ep.errorHits) || 0;
              const statusType = errHits > 0 ? 'warning' : 'healthy';
              const statusLabel = errHits > 0 ? 'Errors observed' : 'No errors observed';

              return (
                <tr
                  key={`${ep.method}-${ep.endpoint}-${idx}`}
                  className="hover:bg-surface-container-low transition-colors"
                >
                  <td className="py-3 px-4">
                    <StatusBadge type={ep.method || 'GET'} label={ep.method || 'GET'} />
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-burgundy">
                    {ep.endpoint}
                  </td>
                  <td className="py-3 px-4 text-ink-secondary font-sans">
                    {ep.serviceName || 'Default Service'}
                  </td>
                  <td className="py-3 px-4 text-right font-medium tabular-nums">
                    {Number(ep.totalHits || 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-ink-primary tabular-nums">
                    {ep.avgLatency} ms
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-semibold tabular-nums ${
                      errRate > 0 ? 'text-burgundy' : 'text-[#3B5738]'
                    }`}
                  >
                    {errRate.toFixed(2)}%
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge type={statusType} label={statusLabel} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MonitoredEndpointsTable;
