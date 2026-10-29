import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import {
  Building2,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Globe,
  FileText,
  KeyRound,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import authService from '../services/authService';

export const RegisterTenantPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isRestoring, registerTenant } = useAuthStore();

  // Organization state
  const [orgName, setOrgName] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [orgDescription, setOrgDescription] = useState('');

  // Initial Administrator state
  const [username, setUsername] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isRestoring && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Client-side validations
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (!orgName.trim() || !username.trim() || !orgEmail.trim()) {
      setError('Please provide all required organization and administrator details.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Attempt tenant registration
      const payload = {
        name: orgName.trim(),
        email: orgEmail.trim(),
        website: orgWebsite.trim(),
        description: orgDescription.trim(),
        username: username.trim(),
        adminEmail: adminEmail.trim() || orgEmail.trim(),
        password,
      };

      await registerTenant(payload);

      setSuccess(true);
      setTimeout(() => {
      navigate('/dashboard');
    }, 1000);
  } catch (err) {
    const serverMessage =
      err.response?.data?.message ||
      err.message ||
      'Registration could not be completed. The backend currently requires Super Admin authorization for tenant provisioning.';
    setError(serverMessage);
  } finally {
    setIsSubmitting(false);
  }
};

return (
  <div className="min-h-screen bg-cream-base flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
    {/* Background Radial Glow */}
    <div className="absolute -top-32 -left-20 w-96 h-96 bg-burgundy/5 rounded-full blur-3xl pointer-events-none" />
    <div className="absolute -bottom-32 -right-20 w-96 h-96 bg-[#154620]/5 rounded-full blur-3xl pointer-events-none" />

    <div className="w-full max-w-xl mx-auto flex flex-col items-center relative z-10">
      {/* Navigation link */}
      <div className="w-full mb-4 flex justify-between items-center">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-ink-secondary hover:text-burgundy transition-colors font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
        <Link
          to="/login"
          className="text-xs text-ink-secondary hover:text-burgundy transition-colors font-semibold"
        >
          Already have an account? Sign In
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
          Register Tenant Workspace
        </h1>
        <p className="text-sm text-ink-secondary mt-1">
          Provision an isolated organization and initial administrator
        </p>
      </header>

      {/* Main Card Container */}
      <div className="w-full bg-card-surface rounded-xl shadow-xl p-6 sm:p-8 border border-hairline/60 relative">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-error-container text-on-error-container text-xs flex items-start gap-2.5 border border-[#E8C4C4]">
            <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-error uppercase tracking-wider text-[11px]">
                Registration Notice
              </p>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-lg bg-[#E5EAE2] text-[#154620] text-xs flex items-center gap-2.5 border border-[#C5D2C1]">
            <CheckCircle2 className="w-4 h-4 text-[#154620] shrink-0" />
            <span>
              Tenant registered successfully! Redirecting to login session...
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Organization Details */}
          <div className="space-y-4">
            <div className="border-b border-hairline/40 pb-2">
              <h3 className="font-serif text-sm font-semibold text-burgundy flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>Organization &amp; Tenant Profile</span>
              </h3>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="org-name"
                className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
              >
                Organization Name *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink-secondary pointer-events-none">
                  <Building2 className="w-4 h-4" />
                </span>
                <input
                  id="org-name"
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Acme Financial Services"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="org-email"
                  className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
                >
                  Organization Email *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink-secondary pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    id="org-email"
                    type="email"
                    required
                    value={orgEmail}
                    onChange={(e) => setOrgEmail(e.target.value)}
                    placeholder="ops@acmefinancial.com"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="org-website"
                  className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
                >
                  Website (Optional)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink-secondary pointer-events-none">
                    <Globe className="w-4 h-4" />
                  </span>
                  <input
                    id="org-website"
                    type="text"
                    value={orgWebsite}
                    onChange={(e) => setOrgWebsite(e.target.value)}
                    placeholder="https://acmefinancial.com"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="org-desc"
                className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
              >
                Description (Optional)
              </label>
              <div className="relative">
                <span className="absolute top-2.5 left-3 text-ink-secondary pointer-events-none">
                  <FileText className="w-4 h-4" />
                </span>
                <textarea
                  id="org-desc"
                  rows={2}
                  value={orgDescription}
                  onChange={(e) => setOrgDescription(e.target.value)}
                  placeholder="High-throughput payment gateway settlement cluster..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Initial Administrator Account */}
          <div className="space-y-4 pt-2">
            <div className="border-b border-hairline/40 pb-2">
              <h3 className="font-serif text-sm font-semibold text-burgundy flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>Initial Tenant Administrator</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="admin-username"
                  className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
                >
                  Admin Username *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink-secondary pointer-events-none">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    id="admin-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="acme_admin"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="admin-email"
                  className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
                >
                  Admin Personal Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink-secondary pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    id="admin-email"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="lead@acmefinancial.com"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
                >
                  Password *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink-secondary pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="admin-confirm-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
                >
                  Confirm Password *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink-secondary pointer-events-none">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    id="admin-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-ink-secondary hover:text-burgundy flex items-center gap-1 cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                <span>{showPassword ? 'Hide Passwords' : 'Show Passwords'}</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-lg bg-burgundy hover:bg-burgundy-dark text-white font-semibold text-sm shadow-md hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Provisioning Tenant Workspace...' : 'Register Organization & Tenant'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  </div>
);
};

export default RegisterTenantPage;

