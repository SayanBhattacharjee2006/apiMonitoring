import React, { useState } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';

export const TIME_PRESETS = [
  { id: '1h', label: 'Last 1 hour', hours: 1 },
  { id: '24h', label: 'Last 24 hours', hours: 24 },
  { id: '7d', label: 'Last 7 days', hours: 24 * 7 },
  { id: '30d', label: 'Last 30 days', hours: 24 * 30 },
  { id: 'custom', label: 'Custom Range', hours: 0 },
];

export const TimeFilterStrip = ({
  activePreset = '24h',
  onPresetChange,
  customRange = { start: '', end: '' },
  onCustomRangeChange,
  onRefresh,
  isRefreshing = false,
}) => {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [tempStart, setTempStart] = useState(customRange.start || '');
  const [tempEnd, setTempEnd] = useState(customRange.end || '');

  const handlePresetClick = (presetId) => {
    if (presetId === 'custom') {
      setShowCustomModal(true);
    } else {
      setShowCustomModal(false);
      onPresetChange(presetId);
    }
  };

  const applyCustomRange = () => {
    if (tempStart && tempEnd) {
      onCustomRangeChange({
        start: new Date(tempStart).toISOString(),
        end: new Date(tempEnd).toISOString(),
      });
      setShowCustomModal(false);
      onPresetChange('custom');
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-hairline/60">
      {/* Preset Pills */}
      <div className="flex items-center flex-wrap gap-1.5 p-1 rounded-lg bg-surface-container-low border border-hairline/60 shadow-sm">
        {TIME_PRESETS.map((preset) => {
          const isActive = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset.id)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-burgundy text-white shadow-sm'
                  : 'text-ink-secondary hover:text-burgundy hover:bg-surface-container'
              }`}
            >
              {preset.id === 'custom' && <Calendar className="w-3.5 h-3.5" />}
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sync Interval & Live Refresh Trigger */}
      <div className="flex items-center gap-3 text-xs text-ink-secondary">
        <div className="flex items-center gap-1.5">
          <span className="uppercase tracking-wider font-bold text-[10px]">Sync:</span>
          <span className="font-semibold text-burgundy">Live Ingest</span>
        </div>
        <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1 bg-card-surface hover:bg-surface-container text-burgundy font-semibold rounded border border-hairline/60 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Polling...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Custom Range Drawer/Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-primary/20 backdrop-blur-xs">
          <div className="bg-card-surface border border-hairline rounded-xl p-5 shadow-xl max-w-sm w-full flex flex-col gap-4">
            <h4 className="font-serif text-base font-semibold text-burgundy">
              Select Custom Window
            </h4>
            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-ink-secondary font-semibold uppercase text-[10px] mb-1">
                  Start Timestamp
                </label>
                <input
                  type="datetime-local"
                  value={tempStart}
                  onChange={(e) => setTempStart(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-hairline bg-surface-container-low text-ink-primary outline-none focus:border-burgundy"
                />
              </div>
              <div>
                <label className="block text-ink-secondary font-semibold uppercase text-[10px] mb-1">
                  End Timestamp
                </label>
                <input
                  type="datetime-local"
                  value={tempEnd}
                  onChange={(e) => setTempEnd(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-hairline bg-surface-container-low text-ink-primary outline-none focus:border-burgundy"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline/60">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="px-3 py-1 rounded text-xs text-ink-secondary hover:text-ink-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyCustomRange}
                disabled={!tempStart || !tempEnd}
                className="px-4 py-1.5 rounded bg-burgundy text-white text-xs font-semibold shadow hover:opacity-95 disabled:opacity-50"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeFilterStrip;

