import React, { useEffect, useState } from 'react';
import {
  Globe,
  Plus,
  Search,
  ExternalLink,
  Layers,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  Trash2,
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

export function ApisPage() {
  const { currentOrg } = useAuth();
  const { success, error } = useToast();

  const [apis, setApis] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [upstreamBaseUrl, setUpstreamBaseUrl] = useState('http://localhost:3000/mock-upstream/weather');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchApis = async () => {
    if (!currentOrg) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/api/v1/organizations/${currentOrg.id}/apis`);
      if (res.data?.success) {
        setApis(res.data.data);
      }
    } catch (e: any) {
      error('Failed to load APIs', e.response?.data?.error?.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApis();
  }, [currentOrg]);

  const handleCreateApi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;

    setIsSubmitting(true);
    try {
      const res = await apiClient.post(`/api/v1/organizations/${currentOrg.id}/apis`, {
        name,
        slug: slug || undefined,
        description,
        upstreamBaseUrl,
      });

      if (res.data?.success) {
        success('API Published', `API '${name}' registered successfully.`);
        setIsModalOpen(false);
        setName('');
        setSlug('');
        setDescription('');
        fetchApis();
      }
    } catch (err: any) {
      error('Publishing Failed', err.response?.data?.error?.message || 'Error creating API');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteApi = async (apiId: string, apiName: string) => {
    if (!confirm(`Are you sure you want to deactivate and remove API '${apiName}'?`)) return;
    try {
      await apiClient.delete(`/api/v1/organizations/${currentOrg!.id}/apis/${apiId}`);
      success('API Removed', `API '${apiName}' has been deleted.`);
      fetchApis();
    } catch (err: any) {
      error('Deletion Failed', err.response?.data?.error?.message);
    }
  };

  const filteredApis = apis.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">API Registry</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Register and manage upstream services, versioning, routing, and subscription plans.
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Register New API</span>
        </Button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search APIs by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* APIs Grid */}
      {filteredApis.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No APIs Found"
          description={
            search ? 'No APIs match your filter query.' : 'Register your first API to start serving traffic through NexGate.'
          }
          actionLabel={search ? undefined : 'Register New API'}
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredApis.map((api) => (
            <Card key={api.id} className="p-5 flex flex-col justify-between hover:border-primary/40 transition-all">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                      {api.name}
                      <Badge variant="success" className="text-[10px]">
                        {api.status}
                      </Badge>
                    </h3>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">/gateway/{api.slug}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteApi(api.id, api.name)}
                    className="text-muted-foreground hover:text-destructive p-1 rounded"
                    title="Delete API"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">
                  {api.description || 'No description provided.'}
                </p>

                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Upstream Destination:</span>
                    <span className="font-mono text-foreground font-semibold truncate max-w-[150px]">
                      {api.upstreamBaseUrl}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Gateway Versions:</span>
                    <span className="font-mono text-primary font-semibold">
                      {api.versions?.map((v: any) => v.version).join(', ') || 'v1'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{api._count?.subscriptions || 0} subscriptions</span>
                <span>Created {formatDate(api.createdAt)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Register API Modal Dialog */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register Upstream API"
        description="Configure your backend service URL and exposure slug."
      >
        <form onSubmit={handleCreateApi} className="space-y-4">
          <Input
            label="API Display Name"
            placeholder="e.g. Weather Service, Payment Gateway"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slug) {
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '')
                );
              }
            }}
            required
          />

          <Input
            label="Gateway Slug (Identifier)"
            placeholder="e.g. weather-service"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            hint="Requests will be routed via /gateway/{slug}/v1/*"
            required
          />

          <Input
            label="Upstream Base URL"
            placeholder="http://api.internal:8080 or https://api.service.com"
            value={upstreamBaseUrl}
            onChange={(e) => setUpstreamBaseUrl(e.target.value)}
            hint="NexGate applies SSRF inspection on every destination"
            required
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/85">Description (optional)</label>
            <textarea
              className="w-full rounded-lg border border-border bg-card p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              placeholder="Provide context and capabilities of this API..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Publish API
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
