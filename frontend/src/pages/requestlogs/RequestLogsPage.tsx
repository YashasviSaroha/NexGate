import React, { useEffect, useState } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  RefreshCw,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { apiClient } from '../../api/client.js';
import { Card, CardTitle, CardDescription } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { formatDate } from '../../lib/formatters.js';

export function RequestLogsPage() {
  const { currentOrg } = useAuth();

  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusCategory, setStatusCategory] = useState<'all' | 'success' | 'error'>('all');
  const [method, setMethod] = useState('');

  // Selected Log Drawer
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = async () => {
    if (!currentOrg) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (search) params.append('search', search);
      if (statusCategory !== 'all') params.append('statusCategory', statusCategory);
      if (method) params.append('method', method);

      const res = await apiClient.get(
        `/api/v1/organizations/${currentOrg.id}/request-logs?${params.toString()}`
      );

      if (res.data?.success) {
        setLogs(res.data.data);
        setTotal(res.data.pagination.total);
      }
    } catch (e) {
      console.error('Error fetching logs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentOrg, page, statusCategory, method]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Gateway Request Logs</span>
            <span className="text-xs font-mono font-normal text-muted-foreground">({total} events)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit trail of all requests routed through the distributed gateway proxy.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchLogs} isLoading={isLoading}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          <span>Refresh Logs</span>
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by path / URL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <select
            value={statusCategory}
            onChange={(e) => {
              setStatusCategory(e.target.value as any);
              setPage(1);
            }}
            className="h-8 px-2.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Status Codes</option>
            <option value="success">Success Only (2xx, 3xx)</option>
            <option value="error">Errors & Blocked (4xx, 5xx)</option>
          </select>

          <select
            value={method}
            onChange={(e) => {
              setMethod(e.target.value);
              setPage(1);
            }}
            className="h-8 px-2.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
          >
            <option value="">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {logs.length === 0 ? (
          <div className="text-center py-16 text-xs text-muted-foreground">
            No request logs found matching current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground">
                <tr>
                  <th className="p-3 font-semibold">Method</th>
                  <th className="p-3 font-semibold">Request Path</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Latency</th>
                  <th className="p-3 font-semibold">Target API</th>
                  <th className="p-3 font-semibold">Application</th>
                  <th className="p-3 font-semibold text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-mono font-bold">
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
                    <td className="p-3 font-mono text-foreground font-medium max-w-[220px] truncate">
                      {log.path}
                    </td>
                    <td className="p-3">
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
                    <td className="p-3 font-mono text-muted-foreground">{log.latencyMs}ms</td>
                    <td className="p-3 text-foreground">{log.api?.name || '—'}</td>
                    <td className="p-3 text-muted-foreground">{log.application?.name || '—'}</td>
                    <td className="p-3 text-right text-muted-foreground">{formatDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="font-mono text-foreground font-semibold">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Slide-over Log Detail Inspector */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border-l border-border h-full p-6 space-y-5 overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-bold text-sm text-foreground">Request Details</h3>
                <p className="text-[10px] font-mono text-muted-foreground">{selectedLog.requestId}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-muted/40 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">HTTP Method:</span>
                  <span className="font-mono font-bold text-foreground">{selectedLog.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status Code:</span>
                  <Badge
                    variant={
                      selectedLog.statusCode >= 200 && selectedLog.statusCode < 300
                        ? 'success'
                        : selectedLog.statusCode === 429
                        ? 'warning'
                        : 'destructive'
                    }
                  >
                    {selectedLog.statusCode}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Response Latency:</span>
                  <span className="font-mono text-foreground font-semibold">{selectedLog.latencyMs}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client IP:</span>
                  <span className="font-mono text-foreground">{selectedLog.ipAddress || '127.0.0.1'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground uppercase text-[10px]">Route Path</span>
                <p className="p-2.5 rounded bg-muted/30 font-mono text-xs break-all">{selectedLog.path}</p>
              </div>

              {selectedLog.errorCategory && (
                <div className="space-y-1">
                  <span className="font-semibold text-destructive uppercase text-[10px]">Error Category</span>
                  <p className="p-2.5 rounded bg-destructive/10 text-destructive font-mono text-xs">
                    {selectedLog.errorCategory}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
