import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Mail,
  Globe,
  FileText,
  Copy,
  Check,
  ArrowRight,
  ShieldAlert,
  UserPlus,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import clientService from '../services/clientService';
import AlertMessage from '../components/common/AlertMessage';

export const ClientsPage = () => {
  const navigate = useNavigate();

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdClient, setCreatedClient] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await clientService.onboardClient({
        name,
        email,
        description,
        website,
      });

      // The backend returns: { success: true, message: 'Client created successfully', data: client }
      if (response && response.data) {
        setCreatedClient(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to onboard client tenant.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyClientId = () => {
    if (!createdClient?._id) return;
    navigator.clipboard.writeText(createdClient._id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="flex flex-col w-full pb-12">
      {/* Editorial Masthead Sub-bar */}
      <div className="w-full py-4 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 bg-surface-container-low px-6 rounded-xl border border-hairline/60 shadow-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-ink-secondary uppercase tracking-wider font-bold">
            <span>Registry Management</span>
            <span className="opacity-40">/</span>
            <span className="text-burgundy">Tenant Provisioning Engine</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl text-burgundy tracking-tight font-medium">
            Client Ingestion &amp; Delegated Access
          </h1>
          <p className="text-sm text-ink-secondary max-w-2xl">
            Execute direct registration for enterprise telemetry clients. Mint tenant scopes, establish secure identifier handles, and delegate granular governance privileges.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-card-surface px-4 py-2 rounded-lg border border-hairline/60 text-xs">
          <span className="uppercase text-[10px] font-bold text-ink-secondary">Scope:</span>
          <span className="font-semibold text-burgundy">Super Admin Provisioner</span>
        </div>
      </div>

      {/* Honest Architectural Protocol Note */}
      <div className="w-full mb-6 bg-surface-container-high rounded-xl p-4 flex items-start gap-3.5 border border-hairline/60">
        <div className="p-1 rounded bg-burgundy text-white mt-0.5">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex flex-col">
            <span className="font-bold text-burgundy uppercase tracking-wider text-[11px]">
              Telemetry Architecture Protocol Note
            </span>
            <p className="text-ink-secondary leading-relaxed mt-0.5">
              Backend intentionally does not expose an unpaged <code className="bg-surface-container px-1.5 py-0.5 rounded text-burgundy font-mono font-semibold">GET /api/admin/clients</code> listing endpoint to guarantee zero-knowledge isolation. Retain the generated <strong className="text-ink-primary font-semibold">Client ID</strong> returned upon onboarding to orchestrate downstream credentials and telemetry pipelines.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded bg-tertiary-container text-white text-[10px] uppercase font-bold tracking-wider shrink-0 self-start sm:self-center">
            Zero-Knowledge Scope
          </span>
        </div>
      </div>

      {error && (
        <AlertMessage
          type="error"
          title="Client Onboarding Error"
          message={error}
          onDismiss={() => setError(null)}
          className="mb-6"
        />
      )}

      {/* Main Form & Success Canvas Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Onboarding Form (7 cols on lg) */}
        <div className="lg:col-span-7 bg-card-surface rounded-xl p-6 border border-hairline/60 shadow-sm flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-hairline/40">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded bg-burgundy text-white flex items-center justify-center font-serif text-sm font-bold">
                01
              </span>
              <div>
                <h3 className="font-serif text-lg font-medium text-burgundy">
                  Client Onboarding
                </h3>
                <span className="text-[10px] uppercase tracking-wider text-ink-secondary font-mono">
                  POST /api/admin/client/onboard
                </span>
              </div>
            </div>
            <Building2 className="w-5 h-5 text-ink-secondary" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase font-semibold text-ink-primary" htmlFor="client-name">
                  Client Legal Name <span className="text-burgundy">*</span>
                </label>
                <div className="relative">
                  <input
                    id="client-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Acme Fintech Cloud"
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-hairline/60 text-sm outline-none focus:border-burgundy focus:bg-card-surface transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase font-semibold text-ink-primary" htmlFor="client-email">
                  Operations Email <span className="text-burgundy">*</span>
                </label>
                <div className="relative">
                  <input
                    id="client-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ops@acme.io"
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-hairline/60 text-sm outline-none focus:border-burgundy focus:bg-card-surface transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase font-semibold text-ink-primary" htmlFor="client-desc">
                Tenant Operational Scope / Description
              </label>
              <textarea
                id="client-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="High-frequency payment processing telemetry cluster..."
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-hairline/60 text-sm outline-none focus:border-burgundy focus:bg-card-surface transition-all resize-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase font-semibold text-ink-primary" htmlFor="client-web">
                Client Origin Website / FQDN
              </label>
              <input
                id="client-web"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://acme.io"
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-hairline/60 text-sm outline-none focus:border-burgundy focus:bg-card-surface transition-all"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-hairline/40">
              <span className="text-[11px] text-ink-secondary">
                Generates immutable cryptographic client ID and slug
              </span>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2.5 bg-burgundy hover:bg-burgundy-dark text-white text-xs font-semibold uppercase tracking-wider rounded-lg shadow-sm hover:opacity-95 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? 'Onboarding...' : 'Onboard Client Tenant'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        {/* Success Card / Details Display (5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {createdClient ? (
            <div className="bg-surface-container-low rounded-xl p-6 border border-hairline/60 shadow-sm flex flex-col gap-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-tertiary-container">
                    Tenant Partition Provisioned
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container text-[10px] font-bold">
                  201 Created
                </span>
              </div>

              {/* Display Fields */}
              <div className="space-y-3 bg-card-surface p-4 rounded-lg border border-hairline/60">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-ink-secondary mb-1">
                    Cryptographic Client ID
                  </span>
                  <div className="flex items-center justify-between bg-surface-container-low px-3 py-1.5 rounded border border-hairline/40">
                    <code className="text-xs font-mono font-bold text-burgundy select-all">
                      {createdClient._id}
                    </code>
                    <button
                      type="button"
                      onClick={copyClientId}
                      className="flex items-center gap-1 text-[11px] text-burgundy hover:text-ink-primary font-semibold cursor-pointer"
                      title="Copy Client ID"
                    >
                      {copiedId ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#3B5738]" />
                          <span className="text-[#3B5738]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] uppercase font-bold text-ink-secondary mb-1">
                    Generated Tenant Slug
                  </span>
                  <div className="bg-surface-container-low px-3 py-1.5 rounded border border-hairline/40 text-xs font-semibold text-ink-primary">
                    {createdClient.slug}
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] uppercase font-bold text-ink-secondary mb-1">
                    Client Legal Name
                  </span>
                  <div className="text-xs font-semibold text-ink-primary">
                    {createdClient.name}
                  </div>
                </div>
              </div>

              {/* Quick Actions to Continue Workflow */}
              <div className="pt-2 border-t border-hairline/40 flex flex-col gap-2">
                <span className="text-xs font-semibold text-ink-secondary">
                  Downstream Provisioning Workflows:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => navigate(`/create-user?clientId=${createdClient._id}`)}
                    className="px-3 py-2 bg-surface-container hover:bg-surface-container-high text-burgundy text-xs font-bold uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Create User</span>
                  </button>
                  <button
                    onClick={() => navigate(`/api-keys?clientId=${createdClient._id}`)}
                    className="px-3 py-2 bg-surface-container hover:bg-surface-container-high text-burgundy text-xs font-bold uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Issue API Key</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card-surface rounded-xl p-6 border border-hairline/60 shadow-sm flex flex-col gap-3 text-xs text-ink-secondary">
              <h4 className="font-serif text-base font-medium text-burgundy">
                Onboarding Protocol Checklist
              </h4>
              <ul className="space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-burgundy mt-1.5 shrink-0" />
                  <span>The client slug is derived automatically from the client name.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-burgundy mt-1.5 shrink-0" />
                  <span>Client records are isolated tenants for all metrics and event aggregation.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-burgundy mt-1.5 shrink-0" />
                  <span>After creating a client, issue an API key and create a client-admin user to activate ingestion.</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientsPage;

