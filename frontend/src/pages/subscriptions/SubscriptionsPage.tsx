import React, { useEffect, useState } from 'react';
import { CreditCard, Check, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { apiClient } from '../../api/client.js';
import { Card, CardTitle, CardDescription } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';

export function SubscriptionsPage() {
  const { currentOrg } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    // Standard plans overview
    setPlans([
      {
        id: 'plan_starter',
        name: 'Starter Plan',
        tier: 'FREE',
        price: 0,
        requestsPerMinute: 60,
        dailyQuota: 1000,
        monthlyQuota: 30000,
        features: ['Up to 60 req/min', '1,000 daily requests', 'Community Discord support', 'Standard Gateway Routing'],
      },
      {
        id: 'plan_pro',
        name: 'Developer Pro',
        tier: 'PRO',
        price: 49,
        requestsPerMinute: 600,
        dailyQuota: 50000,
        monthlyQuota: 1500000,
        features: ['Up to 600 req/min', '50,000 daily requests', 'Priority routing & Redis sliding window', 'Email support < 4hr SLA'],
        popular: true,
      },
      {
        id: 'plan_enterprise',
        name: 'Enterprise Dedicated',
        tier: 'ENTERPRISE',
        price: 299,
        requestsPerMinute: 5000,
        dailyQuota: 500000,
        monthlyQuota: 15000000,
        features: ['5,000+ req/min', 'Custom SLA & 99.99% uptime', 'Dedicated private upstream VPC tunnel', '24/7 Phone & Incident Escalation'],
      },
    ]);
  }, [currentOrg]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">API Subscription Plans & Quotas</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tiered throughput limits and volume controls enforced automatically by the NexGate rate limiter.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`p-6 flex flex-col justify-between relative ${
              plan.popular ? 'border-primary shadow-lg dark:shadow-neon-purple/20' : ''
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="neon">Most Popular</Badge>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-foreground">${plan.price}</span>
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
                  <span className="font-bold text-foreground">{plan.dailyQuota.toLocaleString()} reqs</span>
                </div>
              </div>

              <ul className="space-y-2 text-xs text-muted-foreground">
                {plan.features.map((feat: string, i: number) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-success shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-6 mt-4 border-t border-border/60">
              <Button variant={plan.popular ? 'primary' : 'outline'} className="w-full">
                {plan.tier === 'FREE' ? 'Active Default' : 'Upgrade Plan'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
