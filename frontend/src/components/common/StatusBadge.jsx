import React from 'react';

export const StatusBadge = ({ type = 'healthy', label, size = 'sm', className = '' }) => {
  const styles = {
    healthy: 'bg-[#E5EAE2] text-[#3B5738] border-[#C5D2C1]',
    operational: 'bg-[#E5EAE2] text-[#3B5738] border-[#C5D2C1]',
    active: 'bg-[#E5EAE2] text-[#3B5738] border-[#C5D2C1]',
    degraded: 'bg-[#F6EFE6] text-[#6E4D1B] border-[#E3D1B8]',
    warning: 'bg-[#F6EFE6] text-[#6E4D1B] border-[#E3D1B8]',
    critical: 'bg-[#FAECEC] text-[#752525] border-[#E8C4C4]',
    error: 'bg-[#FAECEC] text-[#752525] border-[#E8C4C4]',
    inactive: 'bg-[#ebe0de] text-[#77716E] border-[#d7c1c4]',

    // Roles
    'super-admin': 'bg-burgundy text-white border-burgundy',
    'client-admin': 'bg-[#EFE2E5] text-burgundy border-[#d7c1c4] font-bold',
    'client-viewer': 'bg-[#E5EAE2] text-secondary border-[#C5D2C1]',

    // Environments
    production: 'bg-burgundy text-white border-burgundy',
    staging: 'bg-sage-container text-ink-primary border-[#C5D2C1]',
    development: 'bg-surface-container-highest text-ink-primary border-[#DED6CA]',
    testing: 'bg-surface-container-high text-ink-secondary border-[#DED6CA]',

    // HTTP Methods
    GET: 'bg-secondary-container text-on-secondary-container border-[#C5D2C1] font-mono',
    POST: 'bg-primary-container text-white border-primary-container font-mono',
    PUT: 'bg-[#F6EFE6] text-[#6E4D1B] border-[#E3D1B8] font-mono',
    DELETE: 'bg-error-container text-error border-error-container font-mono',
    PATCH: 'bg-surface-container-highest text-ink-primary border-[#DED6CA] font-mono',
  };

  const styleClass = styles[type] || 'bg-surface-container text-ink-secondary border-hairline';

  const dotColors = {
    healthy: 'bg-[#3B5738]',
    operational: 'bg-[#3B5738]',
    active: 'bg-[#3B5738]',
    degraded: 'bg-[#6E4D1B]',
    warning: 'bg-[#6E4D1B]',
    critical: 'bg-[#752525]',
    error: 'bg-[#752525]',
  };

  const hasDot = Boolean(dotColors[type]);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs uppercase tracking-wider font-semibold ${styleClass} ${className}`}
    >
      {hasDot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[type]}`} />}
      {label || type}
    </span>
  );
};

export default StatusBadge;

