import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import LoadingSpinner from './LoadingSpinner';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, isRestoring, role } = useAuthStore();

  // During session restoration, show a calm editorial loading screen instead of briefly flickering or redirecting
  if (isRestoring) {
    return (
      <div className="min-h-screen bg-cream-base flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-burgundy mb-4 shadow-sm">
          <div className="w-6 h-6 rounded-full border-2 border-burgundy border-t-transparent animate-spin" />
        </div>
        <h2 className="font-serif text-xl font-medium text-burgundy mb-1">
          Pulse Observability
        </h2>
        <span className="text-xs uppercase font-bold tracking-widest text-ink-secondary">
          Restoring Telemetry Session...
        </span>
      </div>
    );
  }

  // Not authenticated -> redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role permissions if specified
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;

