import React from 'react';

export const KpiCard = ({
  title,
  value,
  subtitle,
  badgeText,
  badgeType = 'neutral',
  icon: Icon,
  iconColor = 'text-burgundy',
  className = '',
}) => {
  const badgeStyles = {
    neutral: 'bg-surface-container text-ink-secondary',
    success: 'bg-[#E5EAE2] text-[#3B5738]',
    error: 'bg-surface-container-highest text-burgundy',
    warning: 'bg-[#F6EFE6] text-[#6E4D1B]',
  };

  return (
    <div
      className={`flex flex-col p-4 sm:p-5 rounded-xl bg-card-surface border border-hairline/60 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
          {title}
        </span>
        {Icon && (
          <Icon
            className={`w-5 h-5 ${iconColor} group-hover:scale-110 transition-transform`}
          />
        )}
      </div>

      <div className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-ink-primary tabular-nums">
        {value}
      </div>

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {badgeText && (
          <span
            className={`px-1.5 py-0.5 rounded text-[11px] font-semibold tracking-wide ${
              badgeStyles[badgeType] || badgeStyles.neutral
            }`}
          >
            {badgeText}
          </span>
        )}
        {subtitle && (
          <span className="text-xs text-ink-secondary leading-none">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default KpiCard;

