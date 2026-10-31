import React from 'react';

export const ChartTooltip = ({ active, payload, label, unit = '', formatter }) => {
  if (active && payload && payload.length) {
    const fullDate = payload[0]?.payload?.fullDate;
    const displayHeader = fullDate || label;

    return (
      <div className="bg-surface-container-highest border border-hairline/80 px-3 py-2 rounded-lg shadow-md text-xs font-sans text-ink-primary">
        {displayHeader && <p className="font-semibold text-burgundy mb-1">{displayHeader}</p>}
        {payload.map((entry, index) => {
          const val = formatter ? formatter(entry.value, entry.name) : `${entry.value} ${unit}`;
          return (
            <div key={`item-${index}`} className="flex items-center gap-2 py-0.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color || entry.fill || '#642A3A' }}
              />
              <span className="text-ink-secondary capitalize">{entry.name}:</span>
              <span className="font-semibold text-ink-primary tabular-nums">{val}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

export default ChartTooltip;
