import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Mail,
  Globe,
  FileText,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  UserPlus,
  KeyRound,
  BarChart3,
  RefreshCw,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';
import clientService from '../services/clientService';
import useAuthStore from '../store/authStore';
import AlertMessage from '../components/common/AlertMessage';
import StatusBadge from '../components/common/StatusBadge';

export const ClientsPage = () => {
  const navigate = useNavigate();
  const { role, setActiveScopeClientId } = useAuthStore();
  const isSuperAdmin = role === 'super-admin';

  // Clients List State
  const [clients, setClients] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [clientsError, setClientsError] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [createdClient, setCreatedClient] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [showOnboardForm, setShowOnboardForm] = useState(false);

  // Fetch all clients
  const fetchClients = useCallback(async () => {
    setIsClientsLoading(true);
    setClientsError(null);
    try {
      const response = await clientService.getClients();
      if (response && response.data) {
        setClients(response.data);
      } else {
        setClients([]);
      }
    } catch (err) {
      setClientsError(err.message || 'Failed to retrieve registered client tenants.');
    } finally {
      setIsClientsLoading(false);
    }
  }, []);

  const setIsClientsLoading = (val) => setIsLoadingClients(val);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const response = await clientService.onboardClient({
        name,
        email,
        description,
        website,
      });

      if (response && response.data) {
        setCreatedClient(response.data);
        setName('');
        setEmail('');
        setDescription('');
        setWebsite('');
        // Refresh client list
        fetchClients();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to onboard client tenant.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleViewAnalytics = (clientId) => {
    setActiveScopeClientId(clientId);
    navigate(`/analytics?clientId=${clientId}`);
  };

  return (
    <div className="flex flex-col w-full pb-12 gap-6">
      {/* Editorial Masthead Sub-bar */}
      <div className="w-full py-4 bg-surface-container-low px-6 rounded-xl border border-hairline/60 shadow-sm flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-ink-secondary uppercase tracking-wider font-bold">
            <span>Registry Governance</span>
            <span className="opacity-40">/</span>
            <span className="text-burgundy">Tenant Provisioning Engine</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl text-burgundy tracking-tight font-medium">
            Client Tenants &amp; Organizations
          </h1>
          <p className="text-sm text-ink-secondary max-w-2xl">
            Provision and manage monitored tenant organizations. Issue ingestion credentials, delegate user access, and scope telemetry telemetry pipelines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchClients()}
            disabled={isLoadingClients}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card-surface border border-hairline/60 text-xs font-semibold text-ink-primary hover:bg-surface-container transition-colors cursor-pointer"
            title="Refresh Client Registry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingClients ? 'animate-spin text-burgundy' : 'text-ink-secondary'}`} />
            <span>Refresh</span>
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => setShowOnboardForm(!showOnboardForm)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-burgundy text-white text-xs font-bold uppercase tracking-wider hover:bg-burgundy-hover transition-colors shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{showOnboardForm ? 'Close Form' : 'Onboard Tenant'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Alerts */}
      {clientsError && (
        <AlertMessage
          type="error"
          title="Registry Retrieval Error"
          message={clientsError}
          onDismiss={() => setClientsError(null)}
        />
      )}

      {/* Newly Created Client Success Banner */}
      {createdClient && (
        <div className="w-full bg-surface-container-high rounded-xl p-5 border border-hairline/60 flex flex-col gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-hairline/40">
            <div className="flex items-center gap-2 text-burgundy">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="font-serif text-base font-semibold">
                Client Tenant Successfully Registered
              </h3>
            </div>
            <button
              onClick={() => setCreatedClient(null)}
              className="text-xs text-ink-secondary hover:text-ink-primary font-semibold"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-card-surface p-3 rounded-lg border border-hairline/40">
              <span className="text-[10px] uppercase font-bold text-ink-secondary block mb-1">
                Client Name &amp; Slug
              </span>
              <span className="font-semibold text-ink-primary block text-sm">
                {createdClient.name}
              </span>
              <span className="font-mono text-ink-secondary text-[11px]">
                {createdClient.slug}
              </span>
            </div>

            <div className="bg-card-surface p-3 rounded-lg border border-hairline/40">
              <span className="text-[10px] uppercase font-bold text-ink-secondary block mb-1">
                Client ID
              </span>
              <div className="flex items-center justify-between gap-2">
                <code className="font-mono text-xs font-bold text-burgundy truncate">
                  {createdClient._id}
                </code>
                <button
                  onClick={() => copyToClipboard(createdClient._id, 'new-client')}
                  className="p-1 hover:bg-surface-container rounded text-burgundy shrink-0 cursor-pointer"
                  title="Copy Client ID"
                >
                  {copiedId === 'new-client' ? (
                    <Check className="w-3.5 h-3.5 text-[#3B5738]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="bg-card-surface p-3 rounded-lg border border-hairline/40 flex flex-col justify-center gap-2">
              <span className="text-[10px] uppercase font-bold text-ink-secondary">
                Immediate Next Steps
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/api-keys?clientId=${createdClient._id}`)}
                  className="flex-1 py-1.5 px-2 bg-burgundy text-white rounded text-[11px] font-bold text-center hover:bg-burgundy-hover transition-colors"
                >
                  Issue API Key
                </button>
                <button
                  onClick={() => navigate(`/create-user?clientId=${createdClient._id}`)}
                  className="flex-1 py-1.5 px-2 bg-surface-container text-burgundy rounded text-[11px] font-bold text-center hover:bg-surface-container-high transition-colors"
                >
                  Create User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Onboard New Client Form */}
      {showOnboardForm && isSuperAdmin && (
        <div className="w-full bg-card-surface rounded-xl p-6 border border-hairline/60 shadow-sm flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-hairline/40">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded bg-burgundy text-white flex items-center justify-center font-serif text-sm font-bold">
                +
              </span>
              <div>
                <h3 className="font-serif text-lg font-medium text-burgundy">
                  Onboard New Tenant Client
                </h3>
                <span className="text-[10px] uppercase tracking-wider text-ink-secondary font-mono">
                  POST /api/admin/client/onboard
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowOnboardForm(false)}
              className="text-xs text-ink-secondary hover:text-ink-primary font-semibold"
            >
              Cancel
            </button>
          </div>

          {formError && (
            <AlertMessage
              type="error"
              title="Onboarding Error"
              message={formError}
              onDismiss={() => setFormError(null)}
            />
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase font-semibold text-ink-primary" htmlFor="client-name">
                  Client Legal Name <span className="text-burgundy">*</span>
                </label>
                <input
                  id="client-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Fintech Cloud"
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-hairline/60 text-sm outline-none focus:border-burgundy focus:bg-card-surface transition-all font-sans"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase font-semibold text-ink-primary" htmlFor="client-email">
                  Operations Email <span className="text-burgundy">*</span>
                </label>
                <input
                  id="client-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ops@acmecloud.io"
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-hairline/60 text-sm outline-none focus:border-burgundy focus:bg-card-surface transition-all font-sans"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase font-semibold text-ink-primary" htmlFor="client-website">
                  Website URL <span className="text-ink-secondary font-normal">(Optional)</span>
                </label>
                <input
                  id="client-website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://acmecloud.io"
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-hairline/60 text-sm outline-none focus:border-burgundy focus:bg-card-surface transition-all font-sans"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase font-semibold text-ink-primary" htmlFor="client-desc">
                  Description / Operational Scope <span className="text-ink-secondary font-normal">(Optional)</span>
                </label>
                <input
                  id="client-desc"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Core banking payment ingest gateway"
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-hairline/60 text-sm outline-none focus:border-burgundy focus:bg-card-surface transition-all font-sans"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowOnboardForm(false)}
                className="px-4 py-2 rounded-lg border border-hairline/60 text-xs font-semibold text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-burgundy hover:bg-burgundy-hover text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isSubmitting ? 'Provisioning...' : 'Provision Client Tenant'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Registered Clients Registry Table */}
      <div className="p-5 sm:p-6 rounded-xl bg-card-surface border border-hairline/60 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-hairline/40 gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
              Tenant Directory
            </span>
            <h3 className="font-serif text-lg font-medium text-burgundy">
              Registered Monitored Clients ({clients.length})
            </h3>
          </div>
          <span className="text-xs text-ink-secondary">
            Telemetry metrics and API credentials are isolated strictly by Client ID.
          </span>
        </div>

        {isLoadingClients ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-ink-secondary">
            <RefreshCw className="w-6 h-6 animate-spin text-burgundy" />
            <span className="text-xs">Loading registered clients...</span>
          </div>
        ) : clients.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <Building2 className="w-10 h-10 text-ink-secondary opacity-40" />
            <div className="text-sm font-semibold text-ink-primary">No Client Tenants Registered</div>
            <p className="text-xs text-ink-secondary max-w-md">
              There are currently no monitored client tenants in the registry. Onboard your first organization above to start ingesting telemetry.
            </p>
            {isSuperAdmin && (
              <button
                onClick={() => setShowOnboardForm(true)}
                className="mt-2 px-4 py-2 bg-burgundy text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-burgundy-hover transition-colors shadow-sm cursor-pointer"
              >
                Onboard First Client
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low text-ink-secondary font-semibold border-b border-hairline/60">
                  <th className="py-2.5 px-3">Client Name</th>
                  <th className="py-2.5 px-3">Client ID</th>
                  <th className="py-2.5 px-3">Operations Email</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Registered</th>
                  <th className="py-2.5 px-3 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline/40 text-ink-primary">
                {clients.map((client) => (
                  <tr key={client._id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-ink-primary text-sm">
                          {client.name}
                        </span>
                        <span className="font-mono text-ink-secondary text-[11px]">
                          {client.slug}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-mono text-burgundy font-semibold">
                        <span>{client._id}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(client._id, client._id)}
                          className="p-1 hover:bg-surface-container rounded text-ink-secondary hover:text-burgundy transition-colors cursor-pointer"
                          title="Copy Client ID"
                        >
                          {copiedId === client._id ? (
                            <Check className="w-3.5 h-3.5 text-[#3B5738]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-ink-secondary font-sans">
                      {client.email}
                    </td>

                    <td className="py-3 px-3">
                      <StatusBadge
                        type={client.isActive ? 'active' : 'inactive'}
                        label={client.isActive ? 'Active' : 'Suspended'}
                      />
                    </td>

                    <td className="py-3 px-3 text-ink-secondary font-mono text-[11px]">
                      {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/api-keys?clientId=${client._id}`)}
                          className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high text-burgundy font-semibold text-[11px] rounded flex items-center gap-1 transition-colors cursor-pointer"
                          title="View / Issue API Keys"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>API Keys</span>
                        </button>

                        <button
                          onClick={() => handleViewAnalytics(client._id)}
                          className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high text-ink-primary font-semibold text-[11px] rounded flex items-center gap-1 transition-colors cursor-pointer"
                          title="View Scoped Analytics"
                        >
                          <BarChart3 className="w-3 h-3" />
                          <span>Analytics</span>
                        </button>

                        <button
                          onClick={() => navigate(`/create-user?clientId=${client._id}`)}
                          className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high text-ink-secondary hover:text-ink-primary font-semibold text-[11px] rounded flex items-center gap-1 transition-colors cursor-pointer"
                          title="Create Client User"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>User</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientsPage;
