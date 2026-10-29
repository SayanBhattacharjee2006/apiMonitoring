import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  UserPlus,
  Shield,
  Eye,
  EyeOff,
  Building,
  CheckCircle,
  AlertCircle,
  MailCheck,
  Lock,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import clientService from '../services/clientService';
import AlertMessage from '../components/common/AlertMessage';

export const CreateUserPage = () => {
  const { user, role } = useAuthStore();
  const [searchParams] = useSearchParams();
  const isSuperAdmin = role === 'super-admin';

  // Client ID:
  // For Client Admin: always user.clientId
  // For Super Admin: from URL search param or typed
  const defaultClientId =
    (!isSuperAdmin && user?.clientId) ? user.clientId : (searchParams.get('clientId') || '');

  const [targetClientId, setTargetClientId] = useState(defaultClientId);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('client-admin');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [createdUser, setCreatedUser] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetClientId.trim()) {
      setError('Target Client ID is required to provision a user.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await clientService.createClientUser(targetClientId.trim(), {
        username,
        email,
        password,
        role: selectedRole,
      });

      if (response && response.data) {
        setCreatedUser(response.data);
        // Reset form fields except client ID
        setUsername('');
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      setError(err.message || 'Failed to provision client user account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-12 gap-6">
      {/* Header Bar */}
      <div className="w-full py-4 bg-surface-container-low px-6 rounded-xl border border-hairline/60 shadow-sm flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-ink-secondary uppercase tracking-wider font-bold mb-1">
            <span>Identity Governance</span>
            <span className="opacity-40">/</span>
            <span className="text-burgundy">Delegated Access</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl text-burgundy tracking-tight font-medium">
            Client User Provisioning
          </h1>
          <p className="text-sm text-ink-secondary max-w-2xl mt-0.5">
            Create tenant accounts authorized for client-specific telemetry dashboards and token administration.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-card-surface px-4 py-2 rounded-lg border border-hairline/60 text-xs">
          <span className="uppercase text-[10px] font-bold text-ink-secondary">Operator:</span>
          <span className="font-semibold text-burgundy">
            {isSuperAdmin ? 'Super Admin' : 'Client Admin'}
          </span>
        </div>
      </div>

      {error && (
        <AlertMessage
          type="error"
          title="User Provisioning Error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {createdUser && (
        <div className="p-4 rounded-xl bg-[#E5EAE2] border border-[#C5D2C1] text-[#3B5738] flex items-start justify-between gap-3 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-start gap-2.5">
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm">
                User Account Successfully Provisioned
              </p>
              <p>
                Username: <strong className="font-mono">{createdUser.username}</strong> ({createdUser.role})
              </p>
              <p className="text-[11px] text-ink-secondary font-mono">
                Assigned Client Tenant: {createdUser.clientId}
              </p>
            </div>
          </div>
          <button
            onClick={() => setCreatedUser(null)}
            className="text-xs uppercase font-bold text-[#3B5738] hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Container (7 cols on lg) */}
        <div className="lg:col-span-7 bg-card-surface rounded-xl p-6 border border-hairline/60 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-hairline/40">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded bg-secondary text-white flex items-center justify-center font-serif text-sm font-bold">
                02
              </span>
              <div>
                <h3 className="font-serif text-lg font-medium text-burgundy">
                  Client User Creation
                </h3>
                <span className="text-[10px] uppercase tracking-wider text-ink-secondary font-mono">
                  POST /api/admin/client/:clientId/users
                </span>
              </div>
            </div>
            <UserPlus className="w-5 h-5 text-ink-secondary" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Target Client ID */}
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase font-semibold text-ink-primary" htmlFor="target-client-id">
                Target Client ID <span className="text-burgundy">*</span>
              </label>
              {isSuperAdmin ? (
                <input
                  id="target-client-id"
                  type="text"
                  required
                  value={targetClientId}
                  onChange={(e) => setTargetClientId(e.target.value)}
                  placeholder="e.g. 64f1c98e2b8a7..."
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-hairline/60 text-sm font-mono text-burgundy font-semibold outline-none focus:border-burgundy focus:bg-card-surface transition-all"
                />
              ) : (
                <input
                  id="target-client-id"
                  type="text"
                  disabled
                  value={targetClientId}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-hairline/60 text-sm font-mono text-ink-secondary cursor-not-allowed"
                />
              )}
              <span className="text-[11px] text-ink-secondary">
                {isSuperAdmin
                  ? 'Super Admin can associate user to any valid Client ID.'
                  : 'Locked to your authenticated tenant association.'}
              </span>
            </div>

            {/* Username & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase font-semibold text-ink-primary" htmlFor="user-username">
                  Username <span className="text-burgundy">*</span>
                </label>
                <input
                  id="user-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="acme_lead"
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-hairline/60 text-sm outline-none focus:border-burgundy focus:bg-card-surface transition-all font-sans"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase font-semibold text-ink-primary" htmlFor="user-email">
                  Work Email <span className="text-burgundy">*</span>
                </label>
                <input
                  id="user-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="lead@acme.io"
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-hairline/60 text-sm outline-none focus:border-burgundy focus:bg-card-surface transition-all font-sans"
                />
              </div>
            </div>

            {/* Initial Password with Toggle */}
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase font-semibold text-ink-primary" htmlFor="user-password">
                Initial Access Secret / Password <span className="text-burgundy">*</span>
              </label>
              <div className="relative">
                <input
                  id="user-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full px-3 pr-10 py-2 rounded-lg bg-surface-container-low border border-hairline/60 text-sm outline-none focus:border-burgundy focus:bg-card-surface transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-secondary hover:text-ink-primary cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role Selection */}
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase font-semibold text-ink-primary">
                Tenant Authorization Role
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole('client-admin')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                    selectedRole === 'client-admin'
                      ? 'bg-burgundy text-white border-burgundy shadow-sm'
                      : 'bg-surface-container-low text-ink-primary border-hairline/60 hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider">client-admin</span>
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <span className={`text-[11px] ${selectedRole === 'client-admin' ? 'text-white/80' : 'text-ink-secondary'}`}>
                    Manage keys &amp; telemetry
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('client-viewer')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                    selectedRole === 'client-viewer'
                      ? 'bg-burgundy text-white border-burgundy shadow-sm'
                      : 'bg-surface-container-low text-ink-primary border-hairline/60 hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider">client-viewer</span>
                    <Eye className="w-3.5 h-3.5" />
                  </div>
                  <span className={`text-[11px] ${selectedRole === 'client-viewer' ? 'text-white/80' : 'text-ink-secondary'}`}>
                    Read-only dashboard access
                  </span>
                </button>
              </div>

              {/* Dynamic Role Summary Box */}
              <div className="p-3 rounded-lg bg-surface-container border border-hairline/60 text-xs text-ink-secondary">
                {selectedRole === 'client-admin' ? (
                  <p>
                    <strong className="text-burgundy">client-admin:</strong> Granted full read/write access to live streams, API key generation, and client-user onboarding.
                  </p>
                ) : (
                  <p>
                    <strong className="text-burgundy">client-viewer:</strong> Restricted to observing sanitized telemetry traces, service metrics, and system status. Cannot generate API keys.
                  </p>
                )}
              </div>
            </div>

            {/* Explicit Backend Delivery Notice */}
            <div className="p-3 rounded-lg bg-surface-container-high border border-hairline/60 flex items-start gap-2.5 text-xs text-ink-primary">
              <MailCheck className="w-4 h-4 text-burgundy shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <span className="font-semibold text-burgundy">Manual Dispatch Mandatory:</span> The backend does not send automated emails or invitations. Share credentials securely with the user via your vault or encrypted channel.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !targetClientId}
              className="w-full mt-1 py-3 px-4 bg-burgundy hover:bg-burgundy-dark text-white font-semibold text-xs uppercase tracking-wider rounded-lg shadow-sm hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Provisioning Account...' : 'Provision User Account'}</span>
            </button>
          </form>
        </div>

        {/* Governance & Architectural Protocols Note (5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-card-surface rounded-xl p-6 border border-hairline/60 shadow-sm flex flex-col gap-3 text-xs text-ink-secondary">
            <h4 className="font-serif text-base font-medium text-burgundy">
              Governance Protocols
            </h4>
            <ul className="space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-burgundy mt-1.5 shrink-0" />
                <span>The backend enforces tenant association for all client users. Ordinary users cannot see global metrics.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-burgundy mt-1.5 shrink-0" />
                <span>The backend does not expose a user listing endpoint; user accounts are isolated partitions.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-burgundy mt-1.5 shrink-0" />
                <span>Initial passwords should be communicated privately and rotated during security review.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateUserPage;
