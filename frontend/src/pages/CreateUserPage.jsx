import React, { useState, useEffect } from 'react';
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
  RefreshCw,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import clientService from '../services/clientService';
import AlertMessage from '../components/common/AlertMessage';

export const CreateUserPage = () => {
  const { user, role } = useAuthStore();
  const [searchParams] = useSearchParams();
  const isSuperAdmin = role === 'super-admin';

  const queryClientId = searchParams.get('clientId') || '';
  const defaultClientId =
    (!isSuperAdmin && user?.clientId) ? user.clientId : queryClientId;

  const [clients, setClients] = useState([]);
  const [targetClientId, setTargetClientId] = useState(defaultClientId);
  const [manualEntry, setManualEntry] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('client-admin');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [createdUser, setCreatedUser] = useState(null);

  useEffect(() => {
    if (isSuperAdmin) {
      clientService
        .getClients()
        .then((res) => {
          if (res?.data && Array.isArray(res.data)) {
            setClients(res.data);
            if (!targetClientId && res.data.length > 0) {
              setTargetClientId(queryClientId || res.data[0]._id);
            }
          }
        })
        .catch((err) => console.error('Failed to load clients:', err));
    }
  }, [isSuperAdmin, queryClientId]);

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

    // Username format check
    if (username.includes('@')) {
      setError('Username should not contain "@". Please use alphanumeric characters or underscore.');
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
        <div className="bg-[#3B5738]/10 border border-[#3B5738]/30 rounded-xl p-4 flex items-start justify-between gap-3 text-xs text-ink-primary animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-[#3B5738] shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-[#3B5738] uppercase tracking-wider text-[11px]">
                Client User Successfully Provisioned
              </span>
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
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase font-semibold text-ink-primary" htmlFor="target-client-id">
                  Target Client Tenant <span className="text-burgundy">*</span>
                </label>
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => setManualEntry(!manualEntry)}
                    className="text-[11px] text-ink-secondary hover:text-burgundy underline cursor-pointer"
                  >
                    {manualEntry ? 'Select from list' : 'Manual ID'}
                  </button>
                )}
              </div>

              {isSuperAdmin ? (
                !manualEntry && clients.length > 0 ? (
                  <select
                    id="target-client-id"
                    value={targetClientId}
                    onChange={(e) => setTargetClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-hairline/60 text-sm text-ink-primary font-semibold outline-none focus:border-burgundy focus:bg-card-surface transition-all font-sans"
                  >
                    <option value="">-- Select Client Organization --</option>
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.slug})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="target-client-id"
                    type="text"
                    required
                    value={targetClientId}
                    onChange={(e) => setTargetClientId(e.target.value)}
                    placeholder="e.g. 64f1c98e2b8a7..."
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-hairline/60 text-sm font-mono text-burgundy font-semibold outline-none focus:border-burgundy focus:bg-card-surface transition-all"
                  />
                )
              ) : (
                <input
                  id="target-client-id"
                  type="text"
                  disabled
                  value={targetClientId}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-hairline/60 text-sm font-mono text-ink-secondary cursor-not-allowed"
                />
              )}
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
                  placeholder="e.g. alex_ops"
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-hairline/60 text-sm outline-none focus:border-burgundy focus:bg-card-surface transition-all font-sans"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase font-semibold text-ink-primary" htmlFor="user-email">
                  Email Address <span className="text-burgundy">*</span>
                </label>
                <input
                  id="user-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@clientcorp.io"
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-hairline/60 text-sm outline-none focus:border-burgundy focus:bg-card-surface transition-all font-sans"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase font-semibold text-ink-primary" htmlFor="user-password">
                Initial Password <span className="text-burgundy">*</span>
              </label>
              <div className="relative">
                <input
                  id="user-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-hairline/60 text-sm outline-none focus:border-burgundy focus:bg-card-surface transition-all pr-10 font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-ink-secondary hover:text-ink-primary cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role Radio Picker */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-xs uppercase font-semibold text-ink-primary">
                Assigned Tenant Role
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                    selectedRole === 'client-admin'
                      ? 'border-burgundy bg-surface-container-low text-ink-primary'
                      : 'border-hairline/60 bg-card-surface text-ink-secondary hover:bg-surface-container-low'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-burgundy uppercase">Client Admin</span>
                    <input
                      type="radio"
                      name="role"
                      value="client-admin"
                      checked={selectedRole === 'client-admin'}
                      onChange={() => setSelectedRole('client-admin')}
                      className="accent-burgundy"
                    />
                  </div>
                  <span className="text-[11px] leading-snug">
                    Can issue API keys, provision users, and view telemetry metrics.
                  </span>
                </label>

                <label
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                    selectedRole === 'client-viewer'
                      ? 'border-burgundy bg-surface-container-low text-ink-primary'
                      : 'border-hairline/60 bg-card-surface text-ink-secondary hover:bg-surface-container-low'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink-primary uppercase">Client Viewer</span>
                    <input
                      type="radio"
                      name="role"
                      value="client-viewer"
                      checked={selectedRole === 'client-viewer'}
                      onChange={() => setSelectedRole('client-viewer')}
                      className="accent-burgundy"
                    />
                  </div>
                  <span className="text-[11px] leading-snug">
                    Read-only access to tenant metrics and telemetry charts.
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-lg bg-burgundy hover:bg-burgundy-hover text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isSubmitting ? 'Provisioning Account...' : 'Provision Tenant Account'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Info Box */}
        <div className="lg:col-span-5 bg-card-surface rounded-xl p-6 border border-hairline/60 shadow-sm flex flex-col gap-4 text-xs text-ink-secondary">
          <h4 className="font-serif text-base font-medium text-burgundy">
            Tenant Account Isolation
          </h4>
          <p className="leading-relaxed">
            Client accounts are pinned to the designated <strong className="text-ink-primary">Client ID</strong> upon creation. All subsequent queries, analytics dashboards, and API key lists are automatically scoped to that client.
          </p>
          <div className="p-3 bg-surface-container-low rounded-lg border border-hairline/40 flex flex-col gap-1.5">
            <span className="font-bold text-burgundy uppercase text-[10px] tracking-wider">
              Security Notice
            </span>
            <span className="text-[11px] leading-relaxed">
              Client Admins cannot view or manage metrics from other tenants or create Super Admin accounts.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateUserPage;
