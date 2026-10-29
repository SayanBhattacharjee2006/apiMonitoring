import React from 'react';
import { Menu, Filter, Shield, User } from 'lucide-react';
import useAuthStore from '../../store/authStore';

export const Header = ({ onOpenMobile }) => {
  const { user, role, activeScopeClientId } = useAuthStore();

  const isSuperAdmin = role === 'super-admin';
  const displayScope = activeScopeClientId
    ? `Client: ${activeScopeClientId.substring(0, 12)}...`
    : isSuperAdmin
    ? 'Global Cluster'
    : user?.clientId
    ? `Tenant: ${String(user.clientId).substring(0, 10)}...`
    : 'Authenticated';

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-14 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-hairline/60 z-20 px-4 md:px-6 flex items-center justify-between">
      {/* Left side: Mobile Toggle & Brand indicator */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-1.5 rounded-md hover:bg-surface-container text-ink-primary"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-serif text-base text-burgundy tracking-tight font-semibold hidden sm:inline">
            Pulse Observability
          </span>
          <div className="hidden sm:block h-3.5 w-px bg-hairline"></div>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-container/50 border border-secondary-fixed-dim/50 text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse"></span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-on-secondary-container">
              Telemetry Online
            </span>
          </div>
        </div>
      </div>

      {/* Right side: Scope badge & User avatar */}
      <div className="flex items-center gap-3">
        {/* Scope Indicator Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-low border border-hairline/60 rounded text-xs text-ink-secondary">
          <Filter className="w-3.5 h-3.5 text-burgundy" />
          <span className="uppercase text-[10px] tracking-wider text-ink-secondary font-bold">
            Scope:
          </span>
          <span className="font-semibold text-burgundy max-w-[130px] sm:max-w-[180px] truncate">
            {displayScope}
          </span>
        </div>

        {/* User Monogram Chip */}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full bg-burgundy flex items-center justify-center text-white font-semibold text-xs shadow-sm"
            title={`${user?.username || 'User'} (${role || 'Role'})`}
          >
            {user?.username ? user.username.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-ink-primary leading-tight">
              {user?.username || 'User'}
            </span>
            <span className="text-[10px] uppercase font-bold text-ink-secondary">
              {role || 'Role'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

