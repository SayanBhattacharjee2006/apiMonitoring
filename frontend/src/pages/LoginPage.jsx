import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import {
  Lock,
  User,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';
import useAuthStore from '../store/authStore';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isRestoring, login, onboardSuperAdmin } = useAuthStore();

  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'onboard'

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Onboard form state
  const [onboardUsername, setOnboardUsername] = useState('');
  const [onboardEmail, setOnboardEmail] = useState('');
  const [onboardPassword, setOnboardPassword] = useState('');
  const [onboardConfirmPassword, setOnboardConfirmPassword] = useState('');
  const [showOnboardPassword, setShowOnboardPassword] = useState(false);
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [onboardError, setOnboardError] = useState(null);
  const [onboardSuccess, setOnboardSuccess] = useState(false);

  if (!isRestoring && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      await login(loginUsername, loginPassword);
      setLoginSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (err) {
      setLoginError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    setOnboardError(null);

    if (onboardPassword !== onboardConfirmPassword) {
      setOnboardError('Master password and confirmation do not match.');
      return;
    }

    if (onboardPassword.length < 6) {
      setOnboardError('Master password must be at least 6 characters.');
      return;
    }

    setOnboardLoading(true);
    try {
      await onboardSuperAdmin({
        username: onboardUsername,
        password: onboardPassword,
        email: onboardEmail,
      });
      setOnboardSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (err) {
      setOnboardError(
        err.message ||
          'Initial onboarding failed. A Super Admin may already exist in this cluster.'
      );
    } finally {
      setOnboardLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-base flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Editorial Parchment Radial Accents */}
      <div className="absolute -top-32 -left-20 w-96 h-96 bg-burgundy/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-20 w-96 h-96 bg-tertiary-container/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl mx-auto flex flex-col items-center relative z-10">
        {/* Navigation back to Landing Page */}
        <div className="w-full mb-4 flex justify-between items-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-ink-secondary hover:text-burgundy transition-colors font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Branding Header */}
        <header className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-xl bg-surface-container flex items-center justify-center p-3 shadow-sm mb-4 border border-hairline/60">
            <div className="w-10 h-10 rounded-lg bg-burgundy flex items-center justify-center text-white font-serif font-bold text-2xl shadow-inner">
              P
            </div>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-burgundy tracking-tight font-medium">
            Pulse Observability
          </h1>
          <p className="text-sm text-ink-secondary mt-1">
            Enterprise API Telemetry &amp; Performance Monitoring
          </p>
        </header>

        {/* Main Card Container */}
        <div className="w-full bg-card-surface rounded-xl shadow-xl p-6 sm:p-8 border border-hairline/60 relative overflow-hidden">
          {/* Segmented Tab Controls */}
          <nav aria-label="Authentication Modes" className="flex p-1 bg-surface-container-high rounded-lg mb-6 border border-hairline/40">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setLoginError(null);
              }}
              className={`flex-1 py-2 text-center rounded-lg text-xs uppercase tracking-wider font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-card-surface text-burgundy shadow-sm'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('onboard');
                setOnboardError(null);
              }}
              className={`flex-1 py-2 text-center rounded-lg text-xs uppercase tracking-wider font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'onboard'
                  ? 'bg-card-surface text-burgundy shadow-sm'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Initial Setup (Super Admin)</span>
            </button>
          </nav>

          {/* TAB 1: SIGN IN */}
          {activeTab === 'login' && (
            <section aria-labelledby="tab-login" className="flex flex-col space-y-4">
              {loginError && (
                <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs flex items-start gap-2 border border-[#E8C4C4]">
                  <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-error">Authentication Failed</p>
                    <p>{loginError}</p>
                  </div>
                </div>
              )}

              {loginSuccess && (
                <div className="p-3 rounded-lg bg-[#E5EAE2] text-[#3B5738] text-xs flex items-center gap-2 border border-[#C5D2C1]">
                  <CheckCircle className="w-4 h-4 text-[#3B5738]" />
                  <span>Authentication successful. Initializing session telemetry...</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="login-username"
                      className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
                    >
                      Username
                    </label>
                    <span className="text-[10px] text-burgundy font-semibold">Required</span>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink-secondary pointer-events-none">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      id="login-username"
                      type="text"
                      required
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="sysadmin_core"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
                    >
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink-secondary pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-secondary hover:text-ink-primary cursor-pointer"
                      title={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3 px-4 rounded-lg bg-burgundy hover:bg-burgundy-dark text-white font-semibold text-sm shadow-sm hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{loginLoading ? 'Validating Credentials...' : 'Sign In to Dashboard'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="pt-2 text-center text-xs text-ink-secondary">
                  <span>Registering a new organization? </span>
                  <Link
                    to="/register"
                    className="font-semibold text-burgundy hover:underline inline-flex items-center gap-1"
                  >
                    <span>Register new tenant</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </form>
            </section>
          )}

          {/* TAB 2: INITIAL SETUP (SUPER ADMIN) */}
          {activeTab === 'onboard' && (
            <section aria-labelledby="tab-onboard" className="flex flex-col space-y-4">
              {onboardError && (
                <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs flex items-start gap-2 border border-[#E8C4C4]">
                  <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-error">403 Forbidden / Conflict</span>
                    </div>
                    <p>{onboardError}</p>
                  </div>
                </div>
              )}

              {onboardSuccess && (
                <div className="p-3 rounded-lg bg-[#E5EAE2] text-[#3B5738] text-xs flex items-center gap-2 border border-[#C5D2C1]">
                  <CheckCircle className="w-4 h-4 text-[#3B5738]" />
                  <span>Super Admin provisioned! Redirecting to dashboard...</span>
                </div>
              )}

              <form onSubmit={handleOnboardSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label
                    htmlFor="setup-username"
                    className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
                  >
                    Desired Username
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink-secondary pointer-events-none">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      id="setup-username"
                      type="text"
                      required
                      value={onboardUsername}
                      onChange={(e) => setOnboardUsername(e.target.value)}
                      placeholder="telemetry_lead"
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="setup-email"
                    className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
                  >
                    Emergency Admin Email
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink-secondary pointer-events-none">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      id="setup-email"
                      type="email"
                      required
                      value={onboardEmail}
                      onChange={(e) => setOnboardEmail(e.target.value)}
                      placeholder="admin@enterprise-cluster.local"
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label
                      htmlFor="setup-password"
                      className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
                    >
                      Master Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink-secondary pointer-events-none">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        id="setup-password"
                        type={showOnboardPassword ? 'text' : 'password'}
                        required
                        value={onboardPassword}
                        onChange={(e) => setOnboardPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="setup-confirm-password"
                      className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink-secondary pointer-events-none">
                        <KeyRound className="w-4 h-4" />
                      </span>
                      <input
                        id="setup-confirm-password"
                        type={showOnboardPassword ? 'text' : 'password'}
                        required
                        value={onboardConfirmPassword}
                        onChange={(e) => setOnboardConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowOnboardPassword(!showOnboardPassword)}
                    className="text-xs text-ink-secondary hover:text-burgundy flex items-center gap-1 cursor-pointer"
                  >
                    {showOnboardPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showOnboardPassword ? 'Hide Passwords' : 'Show Passwords'}</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={onboardLoading}
                  className="w-full py-3 px-4 rounded-lg bg-burgundy hover:bg-burgundy-dark text-white font-semibold text-sm shadow-sm hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{onboardLoading ? 'Provisioning...' : 'Complete Initial Setup'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
