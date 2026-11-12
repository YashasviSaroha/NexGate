import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { apiClient } from '../../api/client.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';

export function SubscriptionsPage() {
  const { currentOrg, user } = useAuth();
  const { success, error } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [appId, setAppId] = useState('');
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    if (!currentOrg) return;
    apiClient
      .get(`/api/v1/organizations/${currentOrg.id}/apis`)
      .then((res) => {
        const rows = res.data?.data || [];
        const flattened = rows.flatMap((api: any) =>
          (api.plans || []).map((plan: any) => ({ ...plan, apiName: api.name, apiId: api.id }))
        );
        setPlans(flattened);
      })
      .catch(() => setPlans([]));
    apiClient
      .get(`/api/v1/organizations/${currentOrg.id}/applications`)
      .then((res) => {
        const rows = res.data?.data || [];
        setApps(rows);
        if (rows[0]) setAppId(rows[0].id);
      })
      .catch(() => setApps([]));
  }, [currentOrg]);

  const subscribe = async (plan: any) => {
    if (!currentOrg || !appId) {
      error('Application required', 'Create an application before subscribing to a plan.');
      return;
    }
    setBusyId(plan.id);
    try {
      await apiClient.post(`/api/v1/organizations/${currentOrg.id}/applications/${appId}/subscriptions`, {
        apiId: plan.apiId,
        apiPlanId: plan.id,
      });
      success('Subscribed', `${plan.apiName} is now on ${plan.name}.`);
    } catch (err: any) {
      error('Subscribe failed', err.response?.data?.error?.message || 'The plan was not applied.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">API Subscription Plans & Quotas</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Plans saved for this organization. Subscribing attaches one plan to an application.
          </p>
        </div>
        <label className="text-xs text-muted-foreground space-y-1">
          <span className="block font-semibold">Application</span>
          <select
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            className="h-10 min-w-48 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
          >
            {apps.length === 0 && <option value="">No applications yet</option>}
            {apps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {plans.length === 0 ? (
        <Card className="p-8 text-center text-xs text-muted-foreground">
          No plans are stored for this organization yet.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {plans.map((plan) => (
            <Card key={plan.id} className="p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <Badge variant="outline">{plan.apiName}</Badge>
                  <h3 className="font-bold text-lg text-foreground mt-2">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-foreground">${Number(plan.price || 0)}</span>
                    <span className="text-xs text-muted-foreground">/ month</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate Limit:</span>
                    <span className="font-bold text-foreground">{plan.requestsPerMinute} req/min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Daily Quota:</span>
                    <span className="font-bold text-foreground">{Number(plan.dailyQuota || 0).toLocaleString()} reqs</span>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-success shrink-0" />
                    <span>{plan.tier} tier</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-success shrink-0" />
                    <span>{Number(plan.monthlyQuota || 0).toLocaleString()} requests each month</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6 mt-4 border-t border-border/60">
                <Button
                  type="button"
                  className="w-full"
                  isLoading={busyId === plan.id}
                  disabled={user?.demo || !appId}
                  onClick={() => subscribe(plan)}
                >
                  {user?.demo ? 'Demo is read-only' : 'Subscribe'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
