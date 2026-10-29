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
  Check,
  X,
} from 'lucide-react';
import useAuthStore from '../store/authStore';

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

  // Password validation criteria
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

    // Client-side validations
    if (!orgName.trim() || !orgEmail.trim() || !username.trim()) {
      setError('Please provide all required organization and administrator details.');
      return;
    }

    if (!allCriteriaMet) {
      setError('Please ensure your password satisfies all security requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
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
      }, 1200);
    } catch (err) {
      const serverMessage =
        err.response?.data?.message ||
        err.message ||
        'Registration could not be completed. Please check your inputs and try again.';
      setError(serverMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-base flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Editorial Parchment Radial Accents */}
      <div className="absolute -top-32 -left-20 w-96 h-96 bg-burgundy/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-20 w-96 h-96 bg-[#154620]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl mx-auto flex flex-col items-center relative z-10 py-8">
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
            to="/login"
            className="text-xs text-ink-secondary hover:text-burgundy transition-colors font-semibold"
          >
            Already have an account? Sign In
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
            Create your workspace
          </h1>
          <p className="text-sm text-ink-secondary mt-1.5 max-w-md">
            Start monitoring your APIs with an isolated workspace for your organization.
          </p>
        </header>

        {/* Main Card Container */}
        <div className="w-full bg-card-surface rounded-xl shadow-xl p-6 sm:p-10 border border-hairline/80 relative">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-error-container text-on-error-container text-xs flex items-start gap-3 border border-[#E8C4C4]">
              <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-error uppercase tracking-wider text-[11px]">
                  Registration Error
                </p>
                <p className="leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-lg bg-[#E5EAE2] text-[#154620] text-xs flex items-center gap-3 border border-[#C5D2C1]">
              <CheckCircle2 className="w-5 h-5 text-[#154620] shrink-0" />
              <div>
                <p className="font-bold text-sm">Your workspace is ready.</p>
                <p className="text-xs opacity-90">Redirecting to your telemetry dashboard...</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: Organization Details */}
            <div className="space-y-4">
              <div className="border-b border-hairline/60 pb-2">
                <h2 className="font-serif text-base font-semibold text-burgundy flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>Organization Details</span>
                </h2>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Set up your tenant boundary and company profile
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="org-name"
                  className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
                >
                  Organization Name *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-secondary pointer-events-none">
                    <Building2 className="w-4 h-4" />
                  </span>
                  <input
                    id="org-name"
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Acme Payments Corp"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="org-email"
                    className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
                  >
                    Organization Contact Email *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-secondary pointer-events-none">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      id="org-email"
                      type="email"
                      required
                      value={orgEmail}
                      onChange={(e) => setOrgEmail(e.target.value)}
                      placeholder="ops@acmepayments.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="org-website"
                    className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
                  >
                    Website (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-secondary pointer-events-none">
                      <Globe className="w-4 h-4" />
                    </span>
                    <input
                      id="org-website"
                      type="text"
                      value={orgWebsite}
                      onChange={(e) => setOrgWebsite(e.target.value)}
                      placeholder="https://acmepayments.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="org-desc"
                  className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
                >
                  Description (Optional)
                </label>
                <div className="relative">
                  <span className="absolute top-3 left-3.5 text-ink-secondary pointer-events-none">
                    <FileText className="w-4 h-4" />
                  </span>
                  <textarea
                    id="org-desc"
                    rows={2}
                    value={orgDescription}
                    onChange={(e) => setOrgDescription(e.target.value)}
                    placeholder="Distributed settlement APIs and ledger services..."
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Administrator Account */}
            <div className="space-y-4 pt-2">
              <div className="border-b border-hairline/60 pb-2">
                <h2 className="font-serif text-base font-semibold text-burgundy flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Administrator Account</span>
                </h2>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Initial workspace administrator credentials (Client Admin)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-username"
                    className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
                  >
                    Admin Username *
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
                      placeholder="acme_admin"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-email"
                    className="block text-xs font-semibold uppercase tracking-wider text-ink-primary"
                  >
                    Admin Email (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-secondary pointer-events-none">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      id="admin-email"
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@acmepayments.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-surface-container-low text-ink-primary placeholder:text-ink-secondary/50 border border-hairline/60 focus:outline-none focus:bg-card-surface focus:border-burgundy transition-all text-sm font-sans"
                    />
                  </div>
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

              {/* Password visibility toggle */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-ink-secondary hover:text-burgundy flex items-center gap-1.5 cursor-pointer font-medium"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Hide Passwords' : 'Show Passwords'}</span>
                </button>
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
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-lg bg-burgundy hover:bg-burgundy-dark text-white font-semibold text-sm shadow-md hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Creating Workspace...' : 'Create Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterTenantPage;
