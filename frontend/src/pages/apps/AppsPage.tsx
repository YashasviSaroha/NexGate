import React, { useEffect, useState } from 'react';
import {
  AppWindow,
  Key,
  Plus,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { apiClient } from '../../api/client.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Badge } from '../../components/ui/Badge.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { formatDate } from '../../lib/formatters.js';

export function AppsPage() {
  const { currentOrg } = useAuth();
  const { success, error, warning } = useToast();

  const [apps, setApps] = useState<any[]>([]);
  const [availableApis, setAvailableApis] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [appName, setAppName] = useState('');
  const [appDescription, setAppDescription] = useState('');
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);

  // New Key Generated Modal
  const [generatedKeyData, setGeneratedKeyData] = useState<{
    appName: string;
    apiKey: string;
    keyPrefix: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Subscribe Modal
  const [subscribeModalApp, setSubscribeModalApp] = useState<any | null>(null);
  const [selectedApiId, setSelectedApiId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  const fetchApps = async () => {
    if (!currentOrg) return;
    setIsLoading(true);
    try {
      const [appsRes, apisRes] = await Promise.all([
        apiClient.get(`/api/v1/organizations/${currentOrg.id}/applications`),
        apiClient.get(`/api/v1/organizations/${currentOrg.id}/apis`),
      ]);

      if (appsRes.data?.success) setApps(appsRes.data.data);
      if (apisRes.data?.success) setAvailableApis(apisRes.data.data);
    } catch (e: any) {
      error('Failed to load applications', e.response?.data?.error?.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, [currentOrg]);

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;

    setIsSubmittingApp(true);
    try {
      const res = await apiClient.post(`/api/v1/organizations/${currentOrg.id}/applications`, {
        name: appName,
        description: appDescription,
      });

      if (res.data?.success) {
        success('Application Created', `Application '${appName}' is ready.`);
        setIsAppModalOpen(false);
        setAppName('');
        setAppDescription('');
        fetchApps();
      }
    } catch (err: any) {
      error('Failed to create application', err.response?.data?.error?.message);
    } finally {
      setIsSubmittingApp(false);
    }
  };

  const handleGenerateKey = async (appId: string, appTitle: string) => {
    try {
      const res = await apiClient.post(
        `/api/v1/organizations/${currentOrg!.id}/applications/${appId}/keys`,
        { environment: 'LIVE' }
      );

      if (res.data?.success) {
        setGeneratedKeyData({
          appName: appTitle,
          apiKey: res.data.data.apiKey,
          keyPrefix: res.data.data.keyPrefix,
        });
        setIsCopied(false);
        fetchApps();
      }
    } catch (err: any) {
      error('Key Generation Failed', err.response?.data?.error?.message);
    }
  };

  const handleRevokeKey = async (appId: string, keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? Traffic using this key will immediately be blocked.')) return;
    try {
      await apiClient.post(
        `/api/v1/organizations/${currentOrg!.id}/applications/${appId}/keys/${keyId}/revoke`
      );
      warning('Key Revoked', 'API key has been permanently deactivated.');
      fetchApps();
    } catch (err: any) {
      error('Revocation Failed', err.response?.data?.error?.message);
    }
  };

  const handleRotateKey = async (appId: string, keyId: string, appTitle: string) => {
    if (!confirm('Rotate this key? The existing key will be revoked and a new active key will be generated.')) return;
    try {
      const res = await apiClient.post(
        `/api/v1/organizations/${currentOrg!.id}/applications/${appId}/keys/${keyId}/rotate`
      );
      if (res.data?.success) {
        setGeneratedKeyData({
          appName: appTitle,
          apiKey: res.data.data.apiKey,
          keyPrefix: res.data.data.keyPrefix,
        });
        setIsCopied(false);
        success('Key Rotated', 'New API key generated successfully.');
        fetchApps();
      }
    } catch (err: any) {
      error('Rotation Failed', err.response?.data?.error?.message);
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscribeModalApp || !selectedApiId || !selectedPlanId) return;

    setIsSubscribing(true);
    try {
      await apiClient.post(
        `/api/v1/organizations/${currentOrg!.id}/applications/${subscribeModalApp.id}/subscriptions`,
        {
          apiId: selectedApiId,
          apiPlanId: selectedPlanId,
        }
      );
      success('Subscribed', 'Application now has access to this API.');
      setSubscribeModalApp(null);
      fetchApps();
    } catch (err: any) {
      error('Subscription Failed', err.response?.data?.error?.message);
    } finally {
      setIsSubscribing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    success('Copied', 'API Key copied to clipboard.');
    setTimeout(() => setIsCopied(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Applications & API Keys</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage consumer applications, cryptographic API keys, permissions, and subscriptions.
          </p>
        </div>

        <Button onClick={() => setIsAppModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          <span>New Application</span>
        </Button>
      </div>

      {/* Applications List */}
      {apps.length === 0 ? (
        <EmptyState
          icon={AppWindow}
          title="No Applications"
          description="Create your first application to generate API keys and consume APIs."
          actionLabel="Create Application"
          onAction={() => setIsAppModalOpen(true)}
        />
      ) : (
        <div className="space-y-6">
          {apps.map((app) => (
            <Card key={app.id} className="p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    {app.name}
                    <Badge variant="success" className="text-[10px]">
                      {app.status}
                    </Badge>
                  </h3>
                  <p className="text-xs text-muted-foreground">{app.description || 'No description provided.'}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSubscribeModalApp(app);
                      if (availableApis.length > 0) {
                        setSelectedApiId(availableApis[0].id);
                        if (availableApis[0].plans?.length > 0) {
                          setSelectedPlanId(availableApis[0].plans[0].id);
                        }
                      }
                    }}
                  >
                    <span>Subscribe to API</span>
                  </Button>
                  <Button size="sm" onClick={() => handleGenerateKey(app.id, app.name)}>
                    <Key className="w-3.5 h-3.5 mr-1" />
                    <span>Generate Key</span>
                  </Button>
                </div>
              </div>

              {/* Subscribed APIs Section */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Subscribed APIs
                </h4>
                {app.subscriptions?.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Not subscribed to any APIs. Click "Subscribe to API" to grant gateway access.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {app.subscriptions.map((sub: any) => (
                      <div key={sub.id} className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-foreground">{sub.api?.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Plan: <span className="font-mono text-primary font-bold">{sub.apiPlan?.name}</span> ({sub.apiPlan?.requestsPerMinute} req/min)
                          </p>
                        </div>
                        <Badge variant="outline">{sub.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* API Keys Table */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Active Credentials ({app.apiKeys?.length || 0})
                </h4>
                {app.apiKeys?.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No keys generated yet. Click "Generate Key" to issue a live token.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 border-b border-border text-muted-foreground">
                        <tr>
                          <th className="p-3 font-semibold">Key Identifier</th>
                          <th className="p-3 font-semibold">Environment</th>
                          <th className="p-3 font-semibold">Status</th>
                          <th className="p-3 font-semibold">Last Used</th>
                          <th className="p-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {app.apiKeys.map((key: any) => (
                          <tr key={key.id} className="hover:bg-muted/20 transition-colors">
                            <td className="p-3 font-mono font-bold text-foreground">
                              {key.keyPrefix}••••••••••••
                            </td>
                            <td className="p-3">
                              <Badge variant={key.environment === 'LIVE' ? 'neon' : 'outline'}>
                                {key.environment}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <Badge variant={key.status === 'ACTIVE' ? 'success' : 'destructive'}>
                                {key.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Never'}
                            </td>
                            <td className="p-3 text-right space-x-2">
                              {key.status === 'ACTIVE' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRotateKey(app.id, key.id, app.name)}
                                    title="Rotate Key"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                                    <span>Rotate</span>
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRevokeKey(app.id, key.id)}
                                    title="Revoke Key"
                                  >
                                    <span>Revoke</span>
                                  </Button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Application Dialog */}
      <Dialog
        isOpen={isAppModalOpen}
        onClose={() => setIsAppModalOpen(false)}
        title="Create Developer Application"
        description="Applications represent external consumers and hold API keys and subscriptions."
      >
        <form onSubmit={handleCreateApp} className="space-y-4">
          <Input
            label="Application Name"
            placeholder="e.g. Mobile iOS Client, Production Sync Job"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/85">Description (optional)</label>
            <textarea
              className="w-full rounded-lg border border-border bg-card p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              placeholder="Intended purpose of this application..."
              value={appDescription}
              onChange={(e) => setAppDescription(e.target.value)}
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setIsAppModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmittingApp}>
              Create Application
            </Button>
          </div>
        </form>
      </Dialog>

      {/* KEY GENERATED: COPY ONCE MODAL DIALOG */}
      <Dialog
        isOpen={!!generatedKeyData}
        onClose={() => setGeneratedKeyData(null)}
        title="API Key Generated Successfully"
        description="This secret key will be shown only once. Please copy and store it securely."
      >
        {generatedKeyData && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                For security reasons, NexGate does not store plaintext API keys. You will not be able to view this full key again!
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">API Secret Key</label>
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-primary/40 bg-muted/60 font-mono text-xs">
                <span className="flex-1 break-all select-all font-bold text-foreground">
                  {generatedKeyData.apiKey}
                </span>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => copyToClipboard(generatedKeyData.apiKey)}
                >
                  {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </Button>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <Button onClick={() => setGeneratedKeyData(null)}>I have saved this key</Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Subscribe to API Dialog */}
      <Dialog
        isOpen={!!subscribeModalApp}
        onClose={() => setSubscribeModalApp(null)}
        title={`Subscribe ${subscribeModalApp?.name} to an API`}
        description="Select an available API and subscription plan."
      >
        <form onSubmit={handleSubscribe} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/85">Target API</label>
            <select
              value={selectedApiId}
              onChange={(e) => {
                setSelectedApiId(e.target.value);
                const matched = availableApis.find((a) => a.id === e.target.value);
                if (matched?.plans?.length > 0) {
                  setSelectedPlanId(matched.plans[0].id);
                }
              }}
              className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {availableApis.map((api) => (
                <option key={api.id} value={api.id}>
                  {api.name} (/gateway/{api.slug})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/85">Plan Tier</label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {availableApis
                .find((a) => a.id === selectedApiId)
                ?.plans?.map((plan: any) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({plan.requestsPerMinute} req/min · {plan.dailyQuota} daily)
                  </option>
                ))}
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setSubscribeModalApp(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubscribing}>
              Confirm Subscription
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
