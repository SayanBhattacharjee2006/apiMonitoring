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
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import apiKeyService from '../services/apiKeyService';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import AlertMessage from '../components/common/AlertMessage';

export const ApiKeysPage = () => {
  const { user, role } = useAuthStore();
  const [searchParams] = useSearchParams();
  const isSuperAdmin = role === 'super-admin';

  // Client ID scoping:
  // For Client Admin: always user.clientId
  // For Super Admin: from URL search param, or typed into input
  const defaultClientId =
    (!isSuperAdmin && user?.clientId) ? user.clientId : (searchParams.get('clientId') || '');

  const [targetClientId, setTargetClientId] = useState(defaultClientId);
  const [activeClientContext, setActiveClientContext] = useState(defaultClientId);

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

  const handleApplyClientContext = (e) => {
    e.preventDefault();
    setActiveClientContext(targetClientId.trim());
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!activeClientContext) {
      setError('Please provide a Client ID to issue an API key.');
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
    setTimeout(() => setCopiedSecret(false), 2500);
  };

  const curlCommand = `curl -X POST http://localhost:5000/api/hit \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${newlyCreatedKey?.keyValue || 'YOUR_API_KEY'}" \\
  -d '{"serviceName":"checkout-api","endpoint":"/v2/cart/checkout","method":"POST","statusCode":200,"latencyMs":42.18}'`;

  const copyCurlSnippet = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="flex flex-col w-full pb-12 gap-6">
      {/* Top Utility Context Bar & Scoping */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-container-low px-6 py-3 rounded-xl border border-hairline/60 shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-ink-secondary text-xs font-semibold">
              <Building className="w-4 h-4 text-burgundy" />
              <span>TENANT CLIENT CONTEXT:</span>
            </div>

            {isSuperAdmin ? (
              <form onSubmit={handleApplyClientContext} className="flex items-center gap-2">
                <input
                  type="text"
                  value={targetClientId}
                  onChange={(e) => setTargetClientId(e.target.value)}
                  placeholder="Enter Target Client ID"
                  className="px-2.5 py-1 text-xs rounded border border-hairline bg-card-surface font-mono text-burgundy font-semibold outline-none focus:border-burgundy w-56 sm:w-64"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-burgundy text-white text-xs font-semibold rounded hover:opacity-90 cursor-pointer"
                >
                  Load
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2 bg-card-surface px-3 py-1 rounded border border-hairline/60">
                <span className="w-2 h-2 rounded-full bg-tertiary-container"></span>
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
              <RefreshCw className={`w-3.5 h-3.5 text-secondary ${isLoadingKeys ? 'animate-spin' : ''}`} />
              <span>Refresh Keys</span>
            </button>
          </div>
        </div>

        {/* Page Header */}
        <div>
          <div className="flex items-center gap-1.5 mb-1 text-xs text-ink-secondary uppercase tracking-wider font-bold">
            <span className="text-burgundy">Credential Registry</span>
            <span>•</span>
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
        <div className="relative overflow-hidden bg-surface-container-high rounded-xl p-5 border-2 border-burgundy shadow-md animate-in fade-in duration-300">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-burgundy text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-error-container text-on-error-container font-bold">
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
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-burgundy text-white rounded hover:bg-burgundy-dark transition-colors text-xs font-semibold shrink-0 cursor-pointer shadow-sm"
              >
                {copiedSecret ? (
                  <>
                    <Check className="w-4 h-4 text-[#81b483]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Secret</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Dismiss Strip */}
          <div className="mt-4 pt-3 border-t border-hairline/60 flex items-center justify-between text-xs text-ink-secondary">
            <div className="flex items-center gap-1.5 text-error">
              <AlertTriangle className="w-4 h-4" />
              <span>Once dismissed, this token string will be irrevocably unrecoverable from the registry.</span>
            </div>
            <button
              onClick={() => setNewlyCreatedKey(null)}
              className="text-xs uppercase font-bold tracking-wider text-burgundy hover:underline cursor-pointer"
            >
              Acknowledge &amp; Close
            </button>
          </div>
        </div>
      )}

      {/* Primary Layout: Key Generation Console + Integration Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Key Generation Console (7 cols) */}
        <div className="lg:col-span-7 bg-card-surface rounded-xl p-6 border border-hairline/60 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-hairline/40">
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-5 h-5 text-burgundy" />
              <div>
                <h3 className="font-serif text-lg font-medium text-burgundy">
                  Issue New Token
                </h3>
                <span className="text-[10px] uppercase tracking-wider text-ink-secondary">
                  Generates Ingestion Credential
                </span>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold text-ink-secondary px-2 py-0.5 rounded bg-surface-container">
              Entropy: 256-bit
            </span>
          </div>

          <form onSubmit={handleCreateKey} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase font-semibold text-ink-primary" htmlFor="key-name">
                Key Identifier / Name <span className="text-burgundy">*</span>
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
                Description &amp; Service Scope
              </label>
              <textarea
                id="key-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Upstream proxy telemetry feed..."
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-hairline/60 text-sm outline-none focus:border-burgundy focus:bg-card-surface transition-all resize-none font-sans"
              />
            </div>

            {/* Target Environment Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase font-semibold text-ink-primary">
                Target Environment
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['production', 'staging', 'development', 'testing'].map((env) => {
                  const isSelected = environment === env;
                  return (
                    <button
                      key={env}
                      type="button"
                      onClick={() => setEnvironment(env)}
                      className={`p-2 rounded border text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-burgundy text-white border-burgundy shadow-sm'
                          : 'bg-surface-container text-ink-secondary border-hairline/60 hover:bg-surface-container-high'
                      }`}
                    >
                      {env}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-hairline/40">
              <span className="text-[11px] text-ink-secondary">
                Generated tokens are permanently immutable
              </span>
              <button
                type="submit"
                disabled={isSubmitting || !activeClientContext}
                className="px-5 py-2.5 bg-burgundy hover:bg-burgundy-dark text-white text-xs font-semibold uppercase tracking-wider rounded-lg shadow-sm hover:opacity-95 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Issuing...' : 'Generate API Key'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Ingress Integration Spec (5 cols) */}
        <div className="lg:col-span-5 bg-inverse-surface text-inverse-on-surface rounded-xl p-5 border border-hairline/60 shadow-md flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-burgundy-light" />
              <span className="text-[11px] uppercase font-bold tracking-wider text-outline-variant">
                Ingress Integration Spec
              </span>
            </div>
            <button
              onClick={copyCurlSnippet}
              className="flex items-center gap-1 text-[11px] text-white/80 hover:text-white bg-white/10 px-2 py-0.5 rounded cursor-pointer transition-colors"
            >
              {copiedSnippet ? <Check className="w-3 h-3 text-[#81b483]" /> : <Copy className="w-3 h-3" />}
              <span>{copiedSnippet ? 'Copied' : 'Copy curl'}</span>
            </button>
          </div>

          <p className="text-xs text-inverse-on-surface/80 leading-relaxed">
            Send telemetry trace hits via an authenticated HTTP POST payload to the global ingestion cluster. Include the raw token in the <code className="text-white font-mono font-bold">x-api-key</code> header.
          </p>

          {/* Snippet Block */}
          <div className="bg-black/50 rounded-lg p-3 text-[11px] font-mono leading-relaxed text-inverse-on-surface/90 overflow-x-auto border border-white/10">
            <div className="text-[#81b483] font-bold">POST /api/hit</div>
            <div className="text-white/60">Content-Type: application/json</div>
            <div className="text-burgundy-light font-bold">
              x-api-key: {newlyCreatedKey?.keyValue ? newlyCreatedKey.keyValue : 'apim_live_9f83a...'}
            </div>
            <div className="mt-2 text-white/60">Body Payload:</div>
            <pre className="text-white text-[10px] leading-snug">
{`{
  "serviceName": "checkout-api",
  "endpoint": "/v2/cart/checkout",
  "method": "POST",
  "statusCode": 200,
  "latencyMs": 42.18
}`}
            </pre>
          </div>

          <div className="pt-2 flex items-center justify-between text-[11px] text-white/60">
            <span>Latency Target: &lt; 2ms Ingest</span>
            <span>JSON Envelope</span>
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

          <div className="p-2 rounded bg-surface-container text-xs text-ink-secondary max-w-md border border-hairline/40">
            Backend does not support key revocation or rotation endpoints; generated keys remain permanently immutable.
          </div>
        </div>

        {/* Table Content */}
        {!activeClientContext ? (
          <div className="p-8">
            <EmptyState
              icon={Building}
              title="No Client ID Selected"
              description="Enter a Client ID above to view its registered API ingestion keys."
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
                  <th className="py-3 px-4">Fingerprint</th>
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
                            {key.keyId ? `${key.keyId.substring(0, 10)}...` : 'apim_masked'}
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

