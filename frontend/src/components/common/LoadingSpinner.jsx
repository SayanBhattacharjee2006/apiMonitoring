import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ message = 'Loading...', size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 text-sm',
    md: 'w-6 h-6 text-base',
    lg: 'w-10 h-10 text-lg',
  };

  return (
    <div className={`flex flex-col items-center justify-center p-6 text-ink-secondary gap-3 ${className}`}>
      <Loader2 className={`animate-spin text-burgundy ${sizeClasses[size] || sizeClasses.md}`} />
      {message && <span className="text-xs font-semibold tracking-wider uppercase text-ink-secondary">{message}</span>}
    </div>
  );
};

export default LoadingSpinner;

