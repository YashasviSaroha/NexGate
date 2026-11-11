import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Terminal,
  Globe,
  ArrowUpRight,
  TrendingUp,
  Key,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { apiClient } from '../../api/client.js';
import { KpiCard } from '../../components/shared/KpiCard.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { formatNumber, formatLatency, formatDate } from '../../lib/formatters.js';

export function DashboardPage() {
  const { currentOrg } = useAuth();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgLatencyMs: 0,
    successRate: 100,
  });
  const [timeseries, setTimeseries] = useState<any[]>([]);
  const [apiBreakdown, setApiBreakdown] = useState<any[]>([]);
  const [appBreakdown, setAppBreakdown] = useState<any[]>([]);
  const [errorDist, setErrorDist] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!currentOrg) return;

    const orgId = currentOrg.id;
    async function fetchDashboardData() {
      setIsLoading(true);
      try {
        const [kpiRes, tsRes, apiRes, appRes, errRes, logsRes] = await Promise.all([
          apiClient.get(`/api/v1/organizations/${orgId}/analytics/overview?hours=24`),
          apiClient.get(`/api/v1/organizations/${orgId}/analytics/timeseries?hours=24`),
          apiClient.get(`/api/v1/organizations/${orgId}/analytics/apis`),
          apiClient.get(`/api/v1/organizations/${orgId}/analytics/applications`),
          apiClient.get(`/api/v1/organizations/${orgId}/analytics/errors`),
          apiClient.get(`/api/v1/organizations/${orgId}/request-logs?limit=5`),
        ]);

        if (kpiRes.data?.success) setKpis(kpiRes.data.data);
        if (tsRes.data?.success) setTimeseries(tsRes.data.data);
        if (apiRes.data?.success) setApiBreakdown(apiRes.data.data);
        if (appRes.data?.success) setAppBreakdown(appRes.data.data);
        if (errRes.data?.success) setErrorDist(errRes.data.data);
        if (logsRes.data?.success) setRecentLogs(logsRes.data.data);
      } catch (e) {
        console.error('Error loading dashboard analytics:', e);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, [currentOrg]);

  const isDark = resolvedTheme === 'dark';
  const primaryStroke = isDark ? '#a855f7' : '#6366f1';
  const neonBlue = isDark ? '#38bdf8' : '#0284c7';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Operations & Gateway Overview
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time traffic, rate limit enforcement, and developer consumption for {currentOrg?.name}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={() => navigate('/playground')}>
            <Terminal className="w-3.5 h-3.5" />
            <span>Test in Playground</span>
          </Button>
          <Button size="sm" onClick={() => navigate('/apis')}>
            <Plus className="w-3.5 h-3.5" />
            <span>Publish API</span>
          </Button>
        </div>
      </div>

      {/* Bento Grid: Row 1 - KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Requests"
          value={formatNumber(kpis.totalRequests)}
          change={{ value: 14.2, isPositive: true, label: 'past 24h' }}
          icon={Activity}
          glowColor="purple"
        />
        <KpiCard
          title="Successful Requests"
          value={formatNumber(kpis.successfulRequests)}
          change={{ value: kpis.successRate, isPositive: kpis.successRate >= 99, label: `${kpis.successRate}% rate` }}
          icon={CheckCircle2}
          glowColor="green"
        />
        <KpiCard
          title="Failed / Blocked"
          value={formatNumber(kpis.failedRequests)}
          change={{ value: kpis.failedRequests, isPositive: false, label: '4xx / 5xx / 429' }}
          icon={AlertTriangle}
          glowColor="amber"
        />
        <KpiCard
          title="Average Latency"
          value={formatLatency(kpis.avgLatencyMs)}
          icon={Clock}
          subtext="p50 response time"
          glowColor="blue"
        />
      </div>

      {/* Bento Grid: Row 2 - Traffic Chart (Wide) & API Distribution (Compact) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Traffic Over Time */}
        <Card className="lg:col-span-2 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <span>Request Traffic Over Time</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  Live Gateway
                </span>
              </CardTitle>
              <CardDescription>Aggregate HTTP throughput per hourly bucket (past 24 hours)</CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Requests</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
                <span className="text-muted-foreground">Errors</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            {timeseries.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No traffic recorded yet"
                description="Make your first request through the NexGate Gateway or try the Request Playground."
                actionLabel="Open Playground"
                onAction={() => navigate('/playground')}
                className="h-full border-none"
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reqGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={primaryStroke} stopOpacity={isDark ? 0.4 : 0.25} />
                      <stop offset="95%" stopColor={primaryStroke} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="timestamp" stroke={textColor} fontSize={10} tickFormatter={(val) => formatDate(val)} />
                  <YAxis stroke={textColor} fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#141420' : '#ffffff',
                      borderColor: isDark ? '#2e2e42' : '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke={primaryStroke}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#reqGradient)"
                  />
                  <Area type="monotone" dataKey="errors" stroke="#f43f5e" strokeWidth={1.5} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* API Usage Breakdown */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="mb-4">
            <CardTitle className="text-sm font-bold">API Volume Breakdown</CardTitle>
            <CardDescription>Top active registered APIs</CardDescription>
          </div>

          <div className="h-64 w-full">
            {apiBreakdown.length === 0 ? (
              <EmptyState
                icon={Globe}
                title="No APIs registered"
                description="Register your first upstream API to start serving requests."
                actionLabel="Create API"
                onAction={() => navigate('/apis')}
                className="h-full border-none"
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={apiBreakdown} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis type="number" stroke={textColor} fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke={textColor} fontSize={10} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#141420' : '#ffffff',
                      borderColor: isDark ? '#2e2e42' : '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="requestCount" fill={neonBlue} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Bento Grid: Row 3 - Recent Activity Table & Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent API Requests Table */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-sm font-bold">Recent Gateway Activity</CardTitle>
              <CardDescription>Inspected live requests passing through /gateway</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/request-logs')}>
              <span>View all logs</span>
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          {recentLogs.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground border rounded-lg border-dashed">
              No recent requests recorded. Send a request to see live logs.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-2 font-semibold">Method</th>
                    <th className="pb-2 font-semibold">Route</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">Latency</th>
                    <th className="pb-2 font-semibold text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {recentLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 font-mono font-bold text-foreground">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            log.method === 'GET'
                              ? 'bg-blue-500/10 text-blue-500'
                              : log.method === 'POST'
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-amber-500/10 text-amber-500'
                          }`}
                        >
                          {log.method}
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-muted-foreground max-w-[200px] truncate">{log.path}</td>
                      <td className="py-2.5">
                        <Badge
                          variant={
                            log.statusCode >= 200 && log.statusCode < 300
                              ? 'success'
                              : log.statusCode === 429
                              ? 'warning'
                              : 'destructive'
                          }
                        >
                          {log.statusCode}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-muted-foreground font-mono">{log.latencyMs}ms</td>
                      <td className="py-2.5 text-muted-foreground text-right">{formatDate(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Most Active Applications & Quota */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <CardTitle className="text-sm font-bold mb-1">Active Consumer Apps</CardTitle>
            <CardDescription className="mb-4">Developer applications generating traffic</CardDescription>

            {appBreakdown.length === 0 ? (
              <EmptyState
                icon={Key}
                title="No Applications Yet"
                description="Create developer applications and API keys to consume APIs."
                actionLabel="Create Application"
                onAction={() => navigate('/apps')}
                className="py-6 border-none"
              />
            ) : (
              <div className="space-y-3">
                {appBreakdown.map((app: any) => (
                  <div key={app.appId} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{app.name}</p>
                      <p className="text-[10px] text-muted-foreground">App ID: {app.appId.slice(0, 8)}...</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-[11px]">
                      {app.requestCount} reqs
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border mt-4">
            <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/apps')}>
              <span>Manage Applications & Keys</span>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
