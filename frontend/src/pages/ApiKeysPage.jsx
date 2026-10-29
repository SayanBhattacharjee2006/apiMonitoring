import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  KeyRound,
  Shield,
  Copy,
  Check,
  AlertTriangle,
  FileCode,
  Lock,
  Building,
  RefreshCw,
  EyeOff,
  Server,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import apiKeyService from '../services/apiKeyService';
import clientService from '../services/clientService';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import AlertMessage from '../components/common/AlertMessage';

export const ApiKeysPage = () => {
  const { user, role } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const isSuperAdmin = role === 'super-admin';

  // Client ID scoping:
  const queryClientId = searchParams.get('clientId') || '';
  const defaultClientId = (!isSuperAdmin && user?.clientId) ? user.clientId : queryClientId;

  const [clients, setClients] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [activeClientContext, setActiveClientContext] = useState(defaultClientId);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualInput, setManualInput] = useState(defaultClientId);

  // Form State
  const [name, setName] = useState('Production Ingestion Gateway');
  const [description, setDescription] = useState('Primary API gateway telemetry feed');
  const [environment, setEnvironment] = useState('production');

  // Creation & Secret State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null); // holds raw keyValue
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Listing State
  const [keysList, setKeysList] = useState([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [error, setError] = useState(null);

  // Load clients list for Super Admin
  useEffect(() => {
    if (isSuperAdmin) {
      setIsLoadingClients(true);
      clientService
        .getClients()
        .then((res) => {
          if (res?.data && Array.isArray(res.data)) {
            setClients(res.data);
            if (!activeClientContext && res.data.length > 0) {
              const selected = queryClientId || res.data[0]._id;
              setActiveClientContext(selected);
              setManualInput(selected);
            }
          }
        })
        .catch((err) => {
          console.error('Error fetching clients for API keys:', err);
        })
        .finally(() => {
          setIsLoadingClients(false);
        });
    }
  }, [isSuperAdmin, queryClientId]);

  // Fetch keys list for active client
  const fetchKeys = useCallback(async () => {
    if (!activeClientContext) {
      setKeysList([]);
      return;
    }
    setIsLoadingKeys(true);
    setError(null);
    try {
      const response = await apiKeyService.getClientApiKeys(activeClientContext);
      if (response?.data) {
        setKeysList(response.data);
      } else {
        setKeysList([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve active API keys.');
      setKeysList([]);
    } finally {
      setIsLoadingKeys(false);
    }
  }, [activeClientContext]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleSelectClient = (clientId) => {
    setActiveClientContext(clientId);
    setManualInput(clientId);
    if (clientId) {
      setSearchParams({ clientId });
    } else {
      setSearchParams({});
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleSelectClient(manualInput.trim());
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!activeClientContext) {
      setError('Please select or specify a Client ID to issue an API key.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await apiKeyService.createApiKey(activeClientContext, {
        name,
        description,
        environment,
      });

      if (response?.data) {
        // Raw keyValue is included in creation response
        setNewlyCreatedKey(response.data);
        fetchKeys();
      }
    } catch (err) {
      setError(err.message || 'Failed to issue new API key.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copySecretToken = () => {
    if (!newlyCreatedKey?.keyValue) return;
    navigator.clipboard.writeText(newlyCreatedKey.keyValue);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const copySnippet = () => {
    const key = newlyCreatedKey?.keyValue || 'apim_your_secret_key_here';
    const snippet = `curl -X POST "http://127.0.0.1:5000/api/hit" \\
  -H "x-api-key: ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "serviceName": "payment-service",
    "endpoint": "/v1/checkout",
    "method": "POST",
    "statusCode": 200,
    "latencyMs": 45.2
  }'`;
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const activeClientObj = clients.find((c) => c._id === activeClientContext);

  return (
    <div className="flex flex-col w-full pb-12 gap-6">
      {/* Editorial Masthead Sub-bar */}
      <div className="w-full py-4 bg-surface-container-low px-6 rounded-xl border border-hairline/60 shadow-sm flex flex-col gap-4">
        {/* Scoping Context Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-hairline/60 gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
            <span className="uppercase text-[10px] font-bold text-ink-secondary tracking-wider">
              Target Tenant Scope:
            </span>

            {isSuperAdmin ? (
              <div className="flex items-center gap-2 flex-wrap">
                {!manualEntry ? (
                  <select
                    value={activeClientContext}
                    onChange={(e) => handleSelectClient(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-hairline bg-card-surface text-ink-primary font-semibold outline-none focus:border-burgundy min-w-[220px]"
                  >
                    <option value="">-- Choose Client Tenant --</option>
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.slug})
                      </option>
                    ))}
                  </select>
                ) : (
                  <form onSubmit={handleManualSubmit} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      placeholder="Enter 24-char hex Client ID..."
                      className="px-2.5 py-1 text-xs rounded border border-hairline bg-card-surface font-mono text-burgundy font-semibold outline-none focus:border-burgundy w-56 sm:w-64"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 bg-burgundy text-white text-xs font-semibold rounded hover:bg-burgundy-hover cursor-pointer"
                    >
                      Load
                    </button>
                  </form>
                )}

                <button
                  type="button"
                  onClick={() => setManualEntry(!manualEntry)}
                  className="text-[11px] text-ink-secondary hover:text-burgundy underline cursor-pointer"
                >
                  {manualEntry ? 'Select from list' : 'Manual ID'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-card-surface px-3 py-1 rounded border border-hairline/60">
                <span className="w-2 h-2 rounded-full bg-tertiary-container" />
                <span className="text-xs font-mono font-bold text-burgundy">
                  {user?.clientId || 'No Client Association'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchKeys}
              disabled={isLoadingKeys || !activeClientContext}
              className="flex items-center gap-1.5 px-3 py-1 bg-card-surface hover:bg-surface-container text-ink-primary rounded border border-hairline/60 shadow-sm text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingKeys ? 'animate-spin text-burgundy' : 'text-ink-secondary'}`} />
              <span>Refresh Keys</span>
            </button>
          </div>
        </div>

        {/* Page Header */}
        <div>
          <div className="flex items-center gap-1.5 mb-1 text-xs text-ink-secondary uppercase tracking-wider font-bold">
            <span className="text-burgundy">Credential Registry</span>
            <span>/</span>
            <span>Telemetry Node Auth</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl text-burgundy tracking-tight font-medium">
            API Keys &amp; Ingestion Credentials
          </h1>
          <p className="text-sm text-ink-secondary max-w-2xl mt-1">
            Generate immutable cryptographic ingestion tokens for monitored infrastructure piping telemetry packets directly into <code className="bg-surface-container px-1.5 py-0.5 rounded text-burgundy font-mono font-semibold text-xs">POST /api/hit</code>.
          </p>
        </div>
      </div>

      {error && (
        <AlertMessage
          type="error"
          title="API Key Management Error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* ONE-TIME SECRET KEY CREATION SUCCESS BANNER */}
      {newlyCreatedKey && (
        <div className="relative overflow-hidden bg-surface-container-high rounded-xl p-5 border-2 border-burgundy shadow-md animate-fadeIn">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-burgundy text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-error text-white font-bold">
                    Confidential • Generated Now
                  </span>
                  <span className="text-xs text-ink-secondary font-mono">
                    ID: {newlyCreatedKey.keyId}
                  </span>
                </div>
                <h3 className="font-serif text-lg font-semibold text-ink-primary">
                  One-Time Secret Key Created
                </h3>
                <p className="text-xs text-ink-secondary max-w-xl">
                  Raw secret key is only displayed once and is never stored unhashed or returned by listing endpoints. Copy and store securely in your vault or deployment manifest.
                </p>
              </div>
            </div>

            {/* Raw Token Copy Box */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto bg-card-surface p-1.5 rounded-lg border border-hairline shadow-sm">
              <div className="px-3 py-2 overflow-x-auto min-w-[260px] sm:min-w-[320px]">
                <code className="text-xs font-mono font-bold text-burgundy select-all">
                  {newlyCreatedKey.keyValue}
                </code>
              </div>
              <button
                onClick={copySecretToken}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-burgundy text-white rounded hover:bg-burgundy-hover transition-colors text-xs font-semibold shrink-0 cursor-pointer shadow-sm"
              >
                {copiedSecret ? (
                  <>
                    <Check className="w-4 h-4 text-[#81b483]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Token</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Key Generation & Usage Snippet */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Create Key Form (7 cols) */}
        <div className="lg:col-span-7 bg-card-surface rounded-xl p-6 border border-hairline/60 shadow-sm flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-hairline/40">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded bg-burgundy text-white flex items-center justify-center font-serif text-sm font-bold">
                01
              </span>
              <div>
                <h3 className="font-serif text-lg font-medium text-burgundy">
                  Generate Ingestion Key
                </h3>
                <span className="text-[10px] uppercase tracking-wider text-ink-secondary font-mono">
                  POST /api/admin/client/:clientId/api/keys
                </span>
              </div>
            </div>
            <KeyRound className="w-5 h-5 text-ink-secondary" />
          </div>

          <form onSubmit={handleCreateKey} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase font-semibold text-ink-primary" htmlFor="key-name">
                Key Name <span className="text-burgundy">*</span>
              </label>
              <input
                id="key-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Production Ingestion Gateway"
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-hairline/60 text-sm outline-none focus:border-burgundy focus:bg-card-surface transition-all font-sans"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase font-semibold text-ink-primary" htmlFor="key-desc">
                Description / Gateway Scope
              </label>
              <input
                id="key-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Primary API gateway telemetry feed"
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-hairline/60 text-sm outline-none focus:border-burgundy focus:bg-card-surface transition-all font-sans"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase font-semibold text-ink-primary" htmlFor="key-env">
                Deployment Environment
              </label>
              <select
                id="key-env"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-hairline/60 text-sm outline-none focus:border-burgundy focus:bg-card-surface transition-all font-sans"
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
                <option value="testing">Testing</option>
              </select>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs text-ink-secondary">
                Target Client: <strong className="font-mono text-burgundy">{activeClientContext ? (activeClientObj ? activeClientObj.name : activeClientContext.substring(0, 12) + '...') : 'None'}</strong>
              </span>

              <button
                type="submit"
                disabled={isSubmitting || !activeClientContext}
                className="px-5 py-2 rounded-lg bg-burgundy hover:bg-burgundy-hover text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isSubmitting ? 'Issuing Key...' : 'Issue API Key'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Usage & Integration Snippet (5 cols) */}
        <div className="lg:col-span-5 bg-[#1B1F24] text-white rounded-xl p-5 shadow-sm border border-hairline/60 flex flex-col gap-3 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-burgundy" />
              <span className="text-xs uppercase font-bold tracking-wider text-white/90">
                Telemetry Push Snippet
              </span>
            </div>
            <button
              onClick={copySnippet}
              className="text-xs text-white/70 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              {copiedSnippet ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSnippet ? 'Copied' : 'Copy cURL'}</span>
            </button>
          </div>

          <div className="text-xs text-white/80 overflow-x-auto p-3 bg-black/40 rounded-lg border border-white/5">
            <pre className="text-[11px] leading-relaxed">
{`curl -X POST "http://127.0.0.1:5000/api/hit" \\
  -H "x-api-key: ${newlyCreatedKey?.keyValue || 'apim_your_key_here'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "serviceName": "demo-api",
    "endpoint": "/api/posts",
    "method": "GET",
    "statusCode": 200,
    "latencyMs": 15.5
  }'`}
            </pre>
          </div>

          <div className="text-[11px] text-white/60 leading-relaxed font-sans">
            Hits are acknowledged in &lt; 2ms, queued onto RabbitMQ, and asynchronously processed into MongoDB and PostgreSQL time-bucketed metrics.
          </div>
        </div>
      </div>

      {/* Bottom Section: Active Keys Metadata Table */}
      <div className="bg-card-surface rounded-xl border border-hairline/60 shadow-sm overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="p-5 bg-surface-container-low border-b border-hairline/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg font-medium text-burgundy">
                Active Ingestion Key Directory
              </h3>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-burgundy text-white">
                {keysList.length} Keys
              </span>
            </div>
            <span className="text-[11px] text-ink-secondary font-mono">
              GET /api/admin/client/:clientId/api/keys
            </span>
          </div>

          <div className="text-xs text-ink-secondary">
            Keys scoped to client <strong className="font-mono text-burgundy">{activeClientObj?.name || activeClientContext || 'N/A'}</strong>
          </div>
        </div>

        {/* Table Content */}
        {!activeClientContext ? (
          <div className="p-8">
            <EmptyState
              icon={Building}
              title="No Client Tenant Selected"
              description="Choose a client tenant from the dropdown above to view or issue API keys."
            />
          </div>
        ) : isLoadingKeys ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2 text-ink-secondary">
            <RefreshCw className="w-6 h-6 text-burgundy animate-spin" />
            <span className="text-xs uppercase font-bold">Loading API Keys...</span>
          </div>
        ) : keysList.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={KeyRound}
              title="No Keys Registered For This Tenant"
              description="Issue a new API key using the console above to begin receiving traffic."
            />
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container text-ink-secondary font-semibold uppercase tracking-wider border-b border-hairline/60">
                  <th className="py-3 px-4">Key Identifier</th>
                  <th className="py-3 px-4">Fingerprint / ID</th>
                  <th className="py-3 px-4">Environment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline/40 text-ink-primary">
                {keysList.map((key) => {
                  const createdDate = key.createdAt ? new Date(key.createdAt).toLocaleDateString() : '—';
                  const createdTime = key.createdAt ? new Date(key.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                  return (
                    <tr key={key.keyId || key._id} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-ink-primary">{key.name || 'API Key'}</span>
                          <span className="text-ink-secondary text-[11px] line-clamp-1">{key.description || 'Ingestion Credential'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="px-2 py-0.5 rounded bg-surface-container-high text-burgundy font-semibold">
                            {key.keyId ? `${key.keyId.substring(0, 12)}...` : 'apim_masked'}
                          </span>
                          <EyeOff className="w-3.5 h-3.5 text-ink-secondary/70" title="Raw secret masked per backend security" />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge type={key.environment || 'production'} label={key.environment || 'production'} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse" />
                          <span className="text-[11px] uppercase font-bold text-tertiary-container">
                            {key.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-ink-secondary">
                        <div className="flex flex-col">
                          <span>{createdDate}</span>
                          <span className="text-[10px] text-ink-secondary/80 font-mono">{createdTime}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="px-2 py-0.5 rounded bg-surface-container text-ink-secondary text-[10px] font-semibold uppercase">
                          Immutable
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiKeysPage;
