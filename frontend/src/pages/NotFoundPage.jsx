import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center text-burgundy mb-4 shadow-sm">
        <Compass className="w-8 h-8 text-burgundy" />
      </div>
      <span className="text-xs uppercase font-bold text-ink-secondary tracking-widest mb-1">
        404 Not Found
      </span>
      <h2 className="font-serif text-3xl font-medium text-burgundy mb-2">
        Route Not Cataloged
      </h2>
      <p className="text-sm text-ink-secondary max-w-md mb-6 leading-relaxed">
        The telemetry route or resource handle you requested does not exist in the active cluster registry.
      </p>
      <Link
        to="/dashboard"
        className="px-5 py-2.5 bg-burgundy hover:bg-burgundy-dark text-white text-xs font-semibold uppercase tracking-wider rounded-lg shadow transition-all flex items-center gap-2 active:scale-95"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
};

export default NotFoundPage;

