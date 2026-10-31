import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  LineChart,
  Building2,
  KeyRound,
  UserPlus,
  UserCircle,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  X,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import authService from '../../services/authService';

export const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const { user, role, logout } = useAuthStore();
  const navigate = useNavigate();
  const [healthStatus, setHealthStatus] = useState({ healthy: null, checking: true, latency: null });

  // Periodically check system /health
  useEffect(() => {
    let isMounted = true;
    const checkBackendHealth = async () => {
      const start = Date.now();
      try {
        await authService.getHealth();
        if (isMounted) {
          setHealthStatus({ healthy: true, checking: false, latency: Date.now() - start });
        }
      } catch (err) {
        if (isMounted) {
          setHealthStatus({ healthy: false, checking: false, latency: Date.now() - start });
        }
      }
    };

    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isSuperAdmin = role === 'super-admin';
  const isClientAdmin = role === 'client-admin';
  const canManageKeys = isSuperAdmin || isClientAdmin;
  const canManageUsers = isSuperAdmin || isClientAdmin;
  const canOnboardClient = isSuperAdmin;

  const roleLabel = isSuperAdmin
    ? 'Super Admin Global'
    : isClientAdmin
    ? 'Client Admin'
    : 'Client Viewer';

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded text-sm transition-all ${
      isActive
        ? 'bg-burgundy text-white font-semibold shadow-sm'
        : 'text-ink-secondary hover:bg-surface-container hover:text-ink-primary'
    }`;

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between">
      {/* Top Section */}
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-hairline/60 bg-surface-container-lowest">
          <div className="flex items-center gap-2.5">
            {/* Monogram Emblem */}
            <div className="w-8 h-8 rounded bg-burgundy flex items-center justify-center text-white font-serif font-bold text-lg shadow-sm">
              P
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-base text-burgundy font-semibold tracking-tight leading-tight">
                Pulse Observability
              </span>
              <span className="text-[10px] uppercase tracking-wider text-secondary font-bold">
                Telemetry Edition
              </span>
            </div>
          </div>
          {setMobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1 text-ink-secondary hover:text-burgundy"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* User Context Badge */}
        <div className="p-3">
          <div className="flex items-center justify-between px-3 py-2 bg-surface-container rounded-lg border border-hairline/60">
            <div className="flex items-center gap-2 overflow-hidden">
              <ShieldCheck className="w-4 h-4 text-burgundy shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-bold text-ink-secondary">
                  Context
                </span>
                <span className="text-xs font-semibold text-ink-primary truncate">
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1 px-3 mt-1">
          <div className="text-[11px] uppercase tracking-wider text-ink-secondary/80 font-bold px-3 pt-2 pb-1">
            Overview
          </div>
          <NavLink
            to="/dashboard"
            className={navItemClass}
            onClick={() => setMobileOpen && setMobileOpen(false)}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/analytics"
            className={navItemClass}
            onClick={() => setMobileOpen && setMobileOpen(false)}
          >
            <LineChart className="w-4 h-4" />
            <span>Analytics</span>
          </NavLink>

          {/* Management section */}
          {(canOnboardClient || canManageKeys || canManageUsers) && (
            <>
              <div className="text-[11px] uppercase tracking-wider text-ink-secondary/80 font-bold px-3 pt-3 pb-1">
                Management
              </div>

              {canOnboardClient && (
                <NavLink
                  to="/clients"
                  className={navItemClass}
                  onClick={() => setMobileOpen && setMobileOpen(false)}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Clients</span>
                </NavLink>
              )}

              {canManageKeys && (
                <NavLink
                  to="/api-keys"
                  className={navItemClass}
                  onClick={() => setMobileOpen && setMobileOpen(false)}
                >
                  <KeyRound className="w-4 h-4" />
                  <span>API Keys</span>
                </NavLink>
              )}

              {canManageUsers && (
                <NavLink
                  to="/create-user"
                  className={navItemClass}
                  onClick={() => setMobileOpen && setMobileOpen(false)}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create User</span>
                </NavLink>
              )}
            </>
          )}

          <div className="text-[11px] uppercase tracking-wider text-ink-secondary/80 font-bold px-3 pt-3 pb-1">
            Account
          </div>
          <NavLink
            to="/profile"
            className={navItemClass}
            onClick={() => setMobileOpen && setMobileOpen(false)}
          >
            <UserCircle className="w-4 h-4" />
            <span>Profile</span>
          </NavLink>
        </nav>
      </div>

      {/* Bottom Diagnostics & Logout */}
      <div className="p-3 border-t border-hairline/60 bg-surface-container-low flex flex-col gap-2">
        <div className="flex items-center justify-between px-3 py-1.5 rounded bg-secondary-container/40 border border-secondary-fixed-dim/40">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                healthStatus.checking
                  ? 'bg-ink-secondary/60 animate-pulse'
                  : healthStatus.healthy
                  ? 'bg-tertiary-container animate-pulse'
                  : 'bg-error animate-ping'
              }`}
            />
            <span className="text-[11px] uppercase font-bold text-tertiary-container tracking-wider">
              {healthStatus.checking
                ? 'Monitoring API: Checking...'
                : healthStatus.healthy
                ? 'Monitoring API: Available'
                : 'Monitoring API: Unavailable'}
            </span>
          </div>
          <span className="text-[11px] font-mono text-ink-secondary">
            {healthStatus.latency !== null ? `${healthStatus.latency}ms` : '—'}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded text-sm text-ink-secondary hover:bg-surface-container-high hover:text-error transition-colors w-full text-left cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-surface-container-low border-r border-hairline/60 z-30 flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Panel */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-ink-primary/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 bg-surface-container-low h-full shadow-2xl flex flex-col z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;

