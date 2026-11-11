import React, { useEffect, useState } from 'react';
import { Webhook, Plus, Trash2, Key, CheckCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { apiClient } from '../../api/client.js';
import { Card, CardTitle, CardDescription } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Badge } from '../../components/ui/Badge.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { EmptyState } from '../../components/ui/EmptyState.js';

export function WebhooksPage() {
  const { currentOrg } = useAuth();
  const { success, error } = useToast();

  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchWebhooks = async () => {
    if (!currentOrg) return;
    try {
      const res = await apiClient.get(`/api/v1/organizations/${currentOrg.id}/webhooks`);
      if (res.data?.success) setWebhooks(res.data.data);
    } catch (e) {
      console.error('Error fetching webhooks:', e);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, [currentOrg]);

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;

    setIsSubmitting(true);
    try {
      const res = await apiClient.post(`/api/v1/organizations/${currentOrg.id}/webhooks`, {
        url,
        events: ['api.created', 'key.revoked', 'quota.warning'],
      });
      if (res.data?.success) {
        success('Webhook Registered', 'Signature secret generated.');
        setIsModalOpen(false);
        setUrl('');
        fetchWebhooks();
      }
    } catch (err: any) {
      error('Registration Failed', err.response?.data?.error?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Delete this webhook endpoint?')) return;
    try {
      await apiClient.delete(`/api/v1/organizations/${currentOrg!.id}/webhooks/${id}`);
      success('Webhook Deleted');
      fetchWebhooks();
    } catch (e: any) {
      error('Delete failed', e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Webhooks & Event Dispatches</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Deliver signed asynchronous notifications for key lifecycle events and quota boundaries.
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Register Webhook</span>
        </Button>
      </div>

      {webhooks.length === 0 ? (
        <EmptyState
          icon={Webhook}
          title="No Webhooks Configured"
          description="Register HTTP endpoint listeners to receive events like quota threshold breaches."
          actionLabel="Register Webhook"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {webhooks.map((wh) => (
            <Card key={wh.id} className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-foreground">{wh.url}</span>
                  <Badge variant="success">{wh.status}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-mono text-[11px]">Secret: {wh.secret.substring(0, 12)}••••</span>
                  <span>Events: {(wh.events as string[]).join(', ')}</span>
                </div>
              </div>

              <Button variant="ghost" size="sm" onClick={() => handleDeleteWebhook(wh.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register Webhook Endpoint"
        description="Payloads are signed with an HMAC-SHA256 signature header."
      >
        <form onSubmit={handleCreateWebhook} className="space-y-4">
          <Input
            label="Target Webhook URL"
            type="url"
            placeholder="https://your-domain.com/api/webhook"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />

          <div className="pt-3 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Register Endpoint
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
