import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Building2,
} from 'lucide-react';
import useAuthStore from '../store/authStore';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isRestoring, login } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isRestoring && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username.trim(), password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (err) {
      const serverMessage =
        err.response?.data?.message ||
        err.message ||
        'Authentication failed. Please verify your credentials.';
      setError(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-base flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Editorial Parchment Radial Accents */}
      <div className="absolute -top-32 -left-20 w-96 h-96 bg-burgundy/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-20 w-96 h-96 bg-tertiary-container/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md mx-auto flex flex-col items-center relative z-10 py-8">
        {/* Navigation link */}
        <div className="w-full mb-6 flex justify-between items-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-ink-secondary hover:text-burgundy transition-colors font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
          <Link
            to="/register"
            className="text-xs text-ink-secondary hover:text-burgundy transition-colors font-semibold"
          >
            Create your workspace
          </Link>
        </div>

        {/* Branding Header */}
        <header className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-surface-container flex items-center justify-center p-3 shadow-sm mb-4 border border-hairline/60">
            <div className="w-10 h-10 rounded-lg bg-burgundy flex items-center justify-center text-white font-serif font-bold text-2xl shadow-inner">
              P
            </div>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-burgundy tracking-tight font-semibold">
            Welcome back
          </h1>
          <p className="text-sm text-ink-secondary mt-1.5">
            Sign in to access your monitoring workspace.
          </p>
        </header>

        {/* Main Card Container */}
        <div className="w-full bg-card-surface rounded-xl shadow-xl p-6 sm:p-8 border border-hairline/80 relative">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-error-container text-on-error-container text-xs flex items-start gap-2.5 border border-[#E8C4C4]">
              <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-error uppercase tracking-wider text-[11px]">
                  Sign In Error
                </p>
                <p className="leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-lg bg-[#E5EAE2] text-[#154620] text-xs flex items-center gap-2.5 border border-[#C5D2C1]">
              <CheckCircle className="w-4 h-4 text-[#154620]" />
              <span>Authentication successful. Opening your workspace...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="login-username"
                className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
              >
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-secondary pointer-events-none">
                  <User className="w-4 h-4" />
                </span>
                <input
                  id="login-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin or username"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
              >
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-secondary pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-ink-secondary hover:text-ink-primary cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-lg bg-burgundy hover:bg-burgundy-dark text-white font-semibold text-sm shadow-md hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Signing In...' : 'Sign in'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-hairline/60 flex flex-col items-center gap-3 text-center text-xs text-ink-secondary">
            <div>
              <span>New to the platform? </span>
              <Link
                to="/register"
                className="font-semibold text-burgundy hover:underline inline-flex items-center gap-1"
              >
                <span>Create your workspace</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="pt-2">
              <Link
                to="/setup-admin"
                className="text-[11px] text-ink-secondary/70 hover:text-burgundy transition-colors underline"
              >
                Platform administrator setup
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
