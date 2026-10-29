import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export const AlertMessage = ({
  type = 'error',
  title,
  message,
  onDismiss,
  className = '',
}) => {
  const styles = {
    error: {
      container: 'bg-error-container text-on-error-container border-[#E8C4C4]',
      icon: AlertCircle,
      iconColor: 'text-error',
    },
    warning: {
      container: 'bg-[#F6EFE6] text-[#6E4D1B] border-[#E3D1B8]',
      icon: AlertTriangle,
      iconColor: 'text-[#6E4D1B]',
    },
    success: {
      container: 'bg-[#E5EAE2] text-[#3B5738] border-[#C5D2C1]',
      icon: CheckCircle,
      iconColor: 'text-[#3B5738]',
    },
    info: {
      container: 'bg-surface-container text-ink-primary border-hairline',
      icon: Info,
      iconColor: 'text-burgundy',
    },
  };

  const current = styles[type] || styles.info;
  const IconComponent = current.icon;

  return (
    <div
      className={`p-3 rounded-lg border flex items-start gap-3 shadow-sm ${current.container} ${className}`}
      role="alert"
    >
      <IconComponent className={`w-5 h-5 shrink-0 mt-0.5 ${current.iconColor}`} />
      <div className="flex-1 space-y-0.5 text-xs">
        {title && <p className="font-semibold text-sm leading-tight">{title}</p>}
        {message && <p className="leading-relaxed opacity-95">{message}</p>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 rounded hover:bg-black/5 text-ink-secondary transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default AlertMessage;

