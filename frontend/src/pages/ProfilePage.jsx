import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCircle,
  Shield,
  Building,
  KeyRound,
  CheckCircle2,
  XCircle,
  LogOut,
  Lock,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import StatusBadge from '../components/common/StatusBadge';

export const ProfilePage = () => {
  const { user, role, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const perms = user?.permissions || {
    canViewAnalytics: true,
    canCreateApiKeys: role === 'super-admin' || role === 'client-admin',
    canManageUsers: role === 'super-admin' || role === 'client-admin',
    canExportData: role === 'super-admin' || role === 'client-admin',
  };

  return (
    <div className="flex flex-col w-full pb-12 gap-6">
      {/* Header */}
      <div className="w-full py-4 bg-surface-container-low px-6 rounded-xl border border-hairline/60 shadow-sm flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-ink-secondary uppercase tracking-wider font-bold mb-1">
            <span>Identity Ledger</span>
            <span className="opacity-40">/</span>
            <span className="text-burgundy">Account Profile</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl text-burgundy tracking-tight font-medium">
            Authenticated Profile
          </h1>
          <p className="text-sm text-ink-secondary max-w-2xl mt-0.5">
            Active session context, role entitlements, and tenant association.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-card-surface hover:bg-surface-container border border-hairline/60 rounded-lg text-xs font-bold uppercase tracking-wider text-error transition-all shadow-sm cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Profile Card (7 cols on lg) */}
        <div className="lg:col-span-7 bg-card-surface rounded-xl p-6 border border-hairline/60 shadow-sm flex flex-col gap-5">
          <div className="flex items-center gap-4 pb-4 border-b border-hairline/40">
            <div className="w-16 h-16 rounded-full bg-burgundy flex items-center justify-center text-white font-serif text-2xl font-bold shadow-md">
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-xl font-medium text-ink-primary">
                  {user?.username || 'Unknown User'}
                </h3>
                <StatusBadge type={role || 'client-viewer'} label={role || 'client-viewer'} />
              </div>
              <span className="text-xs text-ink-secondary font-mono mt-0.5">
                {user?.email || 'No email provided'}
              </span>
            </div>
          </div>

          {/* Account Identifiers */}
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-ink-secondary block mb-1">
                Internal Account UUID
              </span>
              <div className="p-2 rounded bg-surface-container-low font-mono font-semibold text-burgundy border border-hairline/40 select-all">
                {user?._id || user?.id || '—'}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-ink-secondary block mb-1">
                Tenant Association (Client ID)
              </span>
              <div className="p-2 rounded bg-surface-container-low font-mono font-semibold text-ink-primary border border-hairline/40 select-all">
                {user?.clientId || (role === 'super-admin' ? 'Global Cluster (All Clients)' : 'None')}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-ink-secondary block mb-1">
                Account Status
              </span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse" />
                <span className="font-bold text-tertiary-container uppercase tracking-wider text-[11px]">
                  Active &amp; Verified
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Permissions & Security Specs (5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Entitlements Matrix */}
          <div className="bg-card-surface rounded-xl p-6 border border-hairline/60 shadow-sm flex flex-col gap-4">
            <h4 className="font-serif text-base font-medium text-burgundy pb-2 border-b border-hairline/40">
              Role Entitlements Matrix
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-ink-secondary font-medium">View Analytics &amp; Charts</span>
                {perms.canViewAnalytics !== false ? (
                  <div className="flex items-center gap-1 text-[#3B5738] font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Authorized</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-error font-bold">
                    <XCircle className="w-4 h-4" />
                    <span>Denied</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-ink-secondary font-medium">Create API Ingestion Keys</span>
                {perms.canCreateApiKeys ? (
                  <div className="flex items-center gap-1 text-[#3B5738] font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Authorized</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-error font-bold">
                    <XCircle className="w-4 h-4" />
                    <span>Denied</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-ink-secondary font-medium">Manage Client Users</span>
                {perms.canManageUsers ? (
                  <div className="flex items-center gap-1 text-[#3B5738] font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Authorized</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-error font-bold">
                    <XCircle className="w-4 h-4" />
                    <span>Denied</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-ink-secondary font-medium">Onboard Client Tenants</span>
                {role === 'super-admin' ? (
                  <div className="flex items-center gap-1 text-[#3B5738] font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Authorized</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-error font-bold">
                    <XCircle className="w-4 h-4" />
                    <span>Super Admin Only</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Security Transport Notice */}
          <div className="bg-surface-container-low rounded-xl p-5 border border-hairline/60 shadow-sm flex items-start gap-3 text-xs text-ink-secondary">
            <Lock className="w-5 h-5 text-burgundy shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-burgundy uppercase tracking-wider text-[11px]">
                Session Protocol Guard
              </span>
              <p className="leading-relaxed">
                Your session is secured using HTTP-only cookies (<code className="text-burgundy font-mono">authToken</code>) with SameSite strict policy. Tokens cannot be read by browser JavaScript scripts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

