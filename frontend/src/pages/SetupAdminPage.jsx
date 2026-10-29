import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import {
  ShieldAlert,
  User,
  Mail,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Check,
  X,
  Key,
} from 'lucide-react';
import useAuthStore from '../store/authStore';

export const SetupAdminPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isRestoring, onboardSuperAdmin } = useAuthStore();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [bootstrapSecret, setBootstrapSecret] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isRestoring && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const passwordCriteria = [
    { id: 'length', label: 'At least 8 characters', valid: password.length >= 8 },
    { id: 'uppercase', label: 'One uppercase letter (A-Z)', valid: /[A-Z]/.test(password) },
    { id: 'lowercase', label: 'One lowercase letter (a-z)', valid: /[a-z]/.test(password) },
    { id: 'number', label: 'One number (0-9)', valid: /\d/.test(password) },
    {
      id: 'special',
      label: 'One special symbol (!@#$%^&*...)',
      valid: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    },
  ];

  const allCriteriaMet = passwordCriteria.every((c) => c.valid);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !email.trim()) {
      setError('Please provide username and emergency administrator email.');
      return;
    }

    if (!allCriteriaMet) {
      setError('Please satisfy all password complexity requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await onboardSuperAdmin({
        username: username.trim(),
        email: email.trim(),
        password,
        bootstrapSecret: bootstrapSecret.trim() || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      const serverMessage =
        err.response?.data?.message ||
        err.message ||
        'Super Admin initialization failed. Ensure cluster credentials and bootstrap secret are correct.';
      setError(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-base flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      <div className="absolute -top-32 -left-20 w-96 h-96 bg-burgundy/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-20 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl mx-auto flex flex-col items-center relative z-10 py-8">
        <div className="w-full mb-6 flex justify-between items-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-ink-secondary hover:text-burgundy transition-colors font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
          <Link
            to="/"
            className="text-xs text-ink-secondary hover:text-burgundy transition-colors font-semibold"
          >
            Home
          </Link>
        </div>

        <header className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-surface-container flex items-center justify-center p-3 shadow-sm mb-4 border border-hairline/60">
            <ShieldAlert className="w-8 h-8 text-burgundy" />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-burgundy tracking-tight font-semibold">
            Cluster Administrator Setup
          </h1>
          <p className="text-sm text-ink-secondary mt-1.5 max-w-md">
            Initialize the primary Super Administrator account for this monitoring instance.
          </p>
        </header>

        <div className="w-full bg-card-surface rounded-xl shadow-xl p-6 sm:p-8 border border-hairline/80 relative">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-error-container text-on-error-container text-xs flex items-start gap-2.5 border border-[#E8C4C4]">
              <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-error uppercase tracking-wider text-[11px]">
                  Initialization Notice
                </p>
                <p className="leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-lg bg-[#E5EAE2] text-[#154620] text-xs flex items-center gap-2.5 border border-[#C5D2C1]">
              <CheckCircle className="w-4 h-4 text-[#154620] shrink-0" />
              <span>Super Administrator initialized! Redirecting to cluster dashboard...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="admin-username"
                className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
              >
                Super Admin Username *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-secondary pointer-events-none">
                  <User className="w-4 h-4" />
                </span>
                <input
                  id="admin-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="cluster_lead"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="admin-email"
                className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
              >
                Emergency Admin Email *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-secondary pointer-events-none">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@cluster.internal"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
                >
                  Password *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-secondary pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="admin-confirm-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
                >
                  Confirm Password *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-secondary pointer-events-none">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    id="admin-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-ink-secondary hover:text-burgundy flex items-center gap-1 cursor-pointer font-medium"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'Hide Passwords' : 'Show Passwords'}</span>
              </button>
            </div>

            {/* Bootstrap Secret Field */}
            <div className="space-y-1.5 pt-2 border-t border-hairline/60">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="bootstrap-secret"
                  className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
                >
                  Bootstrap Secret Token
                </label>
                <span className="text-[10px] text-ink-secondary font-medium">
                  Conditional
                </span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-secondary pointer-events-none">
                  <Key className="w-4 h-4" />
                </span>
                <input
                  id="bootstrap-secret"
                  type="password"
                  value={bootstrapSecret}
                  onChange={(e) => setBootstrapSecret(e.target.value)}
                  placeholder="Configured SUPER_ADMIN_BOOTSTRAP_SECRET"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                />
              </div>
              <p className="text-[11px] text-ink-secondary leading-normal">
                Required if tenant organizations have already been registered on this cluster before Super Admin onboarding.
              </p>
            </div>

            {/* Inline Password Policy Feedback */}
            <div className="bg-surface-container-low p-4 rounded-lg border border-hairline/60 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-secondary block">
                Password Policy Requirements
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {passwordCriteria.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-1.5 transition-colors ${
                      item.valid ? 'text-[#154620] font-medium' : 'text-ink-secondary/70'
                    }`}
                  >
                    {item.valid ? (
                      <Check className="w-3.5 h-3.5 text-[#154620] shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-hairline/80 shrink-0" />
                    )}
                    <span>{item.label}</span>
                  </div>
                ))}
                {confirmPassword.length > 0 && (
                  <div
                    className={`flex items-center gap-1.5 transition-colors ${
                      passwordsMatch ? 'text-[#154620] font-medium' : 'text-error'
                    }`}
                  >
                    {passwordsMatch ? (
                      <Check className="w-3.5 h-3.5 text-[#154620] shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-error shrink-0" />
                    )}
                    <span>{passwordsMatch ? 'Passwords match' : 'Passwords do not match'}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-lg bg-burgundy hover:bg-burgundy-dark text-white font-semibold text-sm shadow-md hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Initializing Super Admin...' : 'Initialize Super Admin'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SetupAdminPage;

