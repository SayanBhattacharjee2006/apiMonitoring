import React from 'react';
import { FolderX } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = FolderX,
  title = 'No Telemetry Records Detected',
  description = 'The telemetry service returned an empty ingest payload for this cluster over the selected window. Please check trace collector agents or broaden the time range.',
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 md:p-12 rounded-xl bg-surface-container-low text-center border border-hairline/60 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary mb-3 shadow-inner">
        <Icon className="w-6 h-6 text-burgundy" />
      </div>
      <h3 className="font-serif text-lg font-semibold text-burgundy tracking-tight">
        {title}
      </h3>
      <p className="font-sans text-sm text-ink-secondary max-w-md mt-1 mb-4 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-1.5 bg-burgundy text-white text-xs uppercase tracking-wider font-semibold rounded shadow-sm hover:opacity-95 transition-all active:scale-95 cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;

