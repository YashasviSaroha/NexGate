import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Calendar,
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
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
import { Card, CardTitle, CardDescription } from '../../components/ui/Card.js';
import { KpiCard } from '../../components/shared/KpiCard.js';
import { formatNumber, formatLatency, formatDate } from '../../lib/formatters.js';

export function AnalyticsPage() {
  const { currentOrg, user } = useAuth();
  const { resolvedTheme } = useTheme();

  const [timeRange, setTimeRange] = useState('24');
  const [kpis, setKpis] = useState<any>({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgLatencyMs: 0,
    successRate: 100,
  });
  const [timeseries, setTimeseries] = useState<any[]>([]);
  const [apiBreakdown, setApiBreakdown] = useState<any[]>([]);
  const [errorDist, setErrorDist] = useState<any[]>([]);

  useEffect(() => {
    if (!currentOrg) return;

    async function fetchAnalytics() {
      try {
        const [kpiRes, tsRes, apiRes, errRes] = await Promise.all([
          apiClient.get(`/api/v1/organizations/${currentOrg!.id}/analytics/overview?hours=${timeRange}`),
          apiClient.get(`/api/v1/organizations/${currentOrg!.id}/analytics/timeseries?hours=${timeRange}`),
          apiClient.get(`/api/v1/organizations/${currentOrg!.id}/analytics/apis`),
          apiClient.get(`/api/v1/organizations/${currentOrg!.id}/analytics/errors`),
        ]);

        if (kpiRes.data?.success) setKpis(kpiRes.data.data);
        if (tsRes.data?.success) setTimeseries(tsRes.data.data);
        if (apiRes.data?.success) setApiBreakdown(apiRes.data.data);
        if (errRes.data?.success) setErrorDist(errRes.data.data);
      } catch (e) {
        console.error('Analytics load error:', e);
      }
    }

    fetchAnalytics();
  }, [currentOrg, timeRange]);

  const isDark = resolvedTheme === 'dark';
  const primaryStroke = isDark ? '#a855f7' : '#6366f1';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Traffic & Performance Analytics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {user?.demo
              ? 'Includes labeled sample history. Live playground calls are stored separately and can be cleared from the demo session.'
              : 'Deep dive into gateway throughput, latency percentiles, and error categorizations.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="h-8 px-3 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="6">Past 6 Hours</option>
            <option value="24">Past 24 Hours</option>
            <option value="168">Past 7 Days</option>
            <option value="720">Past 30 Days</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Throughput" value={formatNumber(kpis.totalRequests)} icon={Activity} glowColor="purple" />
        <KpiCard title="Success Ratio" value={`${kpis.successRate}%`} icon={CheckCircle} glowColor="green" />
        <KpiCard title="Total Failures" value={formatNumber(kpis.failedRequests)} icon={AlertTriangle} glowColor="amber" />
        <KpiCard title="Mean Latency" value={formatLatency(kpis.avgLatencyMs)} icon={Clock} glowColor="blue" />
      </div>

      {/* Primary Area Chart */}
      <Card className="p-5">
        <CardTitle className="text-sm font-bold mb-1">Live Gateway Traffic</CardTitle>
        <CardDescription className="mb-4">Total requests vs. HTTP/Gateway failure rates</CardDescription>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
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
              <Area type="monotone" dataKey="requests" stroke={primaryStroke} strokeWidth={2} fill="url(#areaGradient)" />
              <Area type="monotone" dataKey="errors" stroke="#f43f5e" strokeWidth={1.5} fillOpacity={0} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
