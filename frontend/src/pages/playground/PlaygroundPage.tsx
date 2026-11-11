import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Terminal,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  Copy,
  Check,
  Globe,
  Key,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { apiClient } from '../../api/client.js';
import { Card, CardTitle, CardDescription } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Badge } from '../../components/ui/Badge.js';

export function PlaygroundPage() {
  const { currentOrg } = useAuth();
  const { success, error } = useToast();

  const [apis, setApis] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [selectedApiSlug, setSelectedApiSlug] = useState('');
  const [apiVersion, setApiVersion] = useState('v1');
  const [subPath, setSubPath] = useState('current');
  const [method, setMethod] = useState('GET');
  const [apiKey, setApiKey] = useState('');
  const [queryParams, setQueryParams] = useState('city=San Francisco');
  const [requestBody, setRequestBody] = useState('{\n  "message": "Hello from NexGate Playground"\n}');

  // Response state
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!currentOrg) return;

    async function fetchData() {
      try {
        const [apisRes, appsRes] = await Promise.all([
          apiClient.get(`/api/v1/organizations/${currentOrg!.id}/apis`),
          apiClient.get(`/api/v1/organizations/${currentOrg!.id}/applications`),
        ]);

        if (apisRes.data?.success && apisRes.data.data.length > 0) {
          setApis(apisRes.data.data);
          setSelectedApiSlug(apisRes.data.data[0].slug);
        }

        if (appsRes.data?.success) {
          setApps(appsRes.data.data);
        }
      } catch (e) {
        console.error('Error fetching playground prerequisites:', e);
      }
    }

    fetchData();
  }, [currentOrg]);

  const handleSendRequest = async () => {
    if (!selectedApiSlug) {
      error('Selection Required', 'Select an API first.');
      return;
    }
    if (!apiKey) {
      error('API Key Required', 'Provide an API Key in the credentials field.');
      return;
    }

    setIsLoading(true);
    setResponse(null);

    const startTime = performance.now();

    // Construct the gateway URL
    let gatewayUrl = `/gateway/${selectedApiSlug}/${apiVersion}/${subPath.replace(/^\//, '')}`;
    if (queryParams.trim()) {
      gatewayUrl += `?${queryParams.trim()}`;
    }

    try {
      const res = await axios({
        url: gatewayUrl,
        method: method.toLowerCase(),
        headers: {
          'X-API-Key': apiKey.trim(),
          'Content-Type': 'application/json',
        },
        data: ['POST', 'PUT', 'PATCH'].includes(method) ? JSON.parse(requestBody || '{}') : undefined,
        validateStatus: () => true, // Don't throw on 4xx/5xx so we can inspect the gateway response!
      });

      const latencyMs = Math.round(performance.now() - startTime);

      setResponse({
        statusCode: res.status,
        statusText: res.statusText || (res.status === 200 ? 'OK' : 'Error'),
        headers: res.headers,
        data: res.data,
        latencyMs,
      });

      if (res.status >= 200 && res.status < 300) {
        success('Request Successful', `${res.status} OK in ${latencyMs}ms`);
      } else if (res.status === 429) {
        error('Rate Limit Exceeded (429)', 'Quota boundary reached.');
      } else {
        error(`Response Status: ${res.status}`);
      }
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      setResponse({
        statusCode: err.response?.status || 500,
        statusText: 'Gateway Error',
        headers: err.response?.headers || {},
        data: err.response?.data || { error: err.message },
        latencyMs,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyResponse = () => {
    if (!response) return;
    navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <span>API Request Playground</span>
          <Badge variant="neon">Live Gateway Proxy</Badge>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Execute real HTTP calls against upstream APIs through the NexGate distributed gateway.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Request Builder Panel */}
        <Card className="lg:col-span-6 p-5 space-y-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            <span>Request Builder</span>
          </CardTitle>

          {/* API and Method Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">HTTP Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full h-9 px-2 text-xs rounded-lg border border-border bg-card font-mono font-bold text-foreground focus:ring-1 focus:ring-primary"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Target API</label>
              <select
                value={selectedApiSlug}
                onChange={(e) => setSelectedApiSlug(e.target.value)}
                className="w-full h-9 px-2 text-xs rounded-lg border border-border bg-card text-foreground focus:ring-1 focus:ring-primary"
              >
                {apis.map((api) => (
                  <option key={api.id} value={api.slug}>
                    {api.name} ({api.slug})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Route path */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Version</label>
              <Input
                value={apiVersion}
                onChange={(e) => setApiVersion(e.target.value)}
                placeholder="v1"
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Sub-path / Resource</label>
              <Input
                value={subPath}
                onChange={(e) => setSubPath(e.target.value)}
                placeholder="current or users"
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          {/* API Key credential */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>Authentication (X-API-Key)</span>
              <span className="text-[10px] text-primary">Required for Gateway</span>
            </label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="ng_live_xxxxxxxx_xxxxxxxxxxxxxxxx"
              className="h-9 text-xs font-mono"
            />
          </div>

          {/* Query Parameters */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Query Parameters</label>
            <Input
              value={queryParams}
              onChange={(e) => setQueryParams(e.target.value)}
              placeholder="param1=value1&param2=value2"
              className="h-9 text-xs font-mono"
            />
          </div>

          {/* Request Body (if POST/PUT) */}
          {['POST', 'PUT', 'PATCH'].includes(method) && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Request Body (JSON)</label>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-border bg-card p-2 text-xs font-mono text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          {/* Execute Button */}
          <Button onClick={handleSendRequest} isLoading={isLoading} className="w-full">
            <Send className="w-4 h-4 mr-1.5" />
            <span>Send Request</span>
          </Button>

          {/* URL Preview */}
          <div className="p-2.5 rounded-lg bg-muted/40 text-[11px] font-mono text-muted-foreground truncate border border-border/50">
            <span className="text-foreground font-bold">{method}</span>{' '}
            /gateway/{selectedApiSlug || '{api}'}/{apiVersion}/{subPath}
            {queryParams ? `?${queryParams}` : ''}
          </div>
        </Card>

        {/* Response Inspector Panel */}
        <Card className="lg:col-span-6 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold">Response Inspector</CardTitle>
              {response && (
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      response.statusCode >= 200 && response.statusCode < 300
                        ? 'success'
                        : response.statusCode === 429
                        ? 'warning'
                        : 'destructive'
                    }
                  >
                    {response.statusCode} {response.statusText}
                  </Badge>

                  <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>{response.latencyMs}ms</span>
                  </div>

                  <button
                    onClick={copyResponse}
                    className="p-1 text-muted-foreground hover:text-foreground rounded"
                    title="Copy Body"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>

            {/* Response Output */}
            {!response && !isLoading ? (
              <div className="h-96 flex flex-col items-center justify-center text-center text-muted-foreground">
                <Terminal className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-xs">No request executed yet.</p>
                <p className="text-[11px] text-muted-foreground/70">
                  Select an API, enter your API key, and click "Send Request".
                </p>
              </div>
            ) : isLoading ? (
              <div className="h-96 flex flex-col items-center justify-center text-center text-primary">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs font-semibold">Forwarding via NexGate Gateway...</p>
              </div>
            ) : (
              <div className="space-y-4 pt-3">
                {/* Rate Limit Headers Inspection */}
                {response.headers['ratelimit-remaining'] !== undefined && (
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/60 text-center">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase">Rate Limit</span>
                      <p className="text-xs font-mono font-bold text-foreground">
                        {response.headers['ratelimit-limit']}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase">Remaining</span>
                      <p className="text-xs font-mono font-bold text-success">
                        {response.headers['ratelimit-remaining']}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase">Reset In</span>
                      <p className="text-xs font-mono font-bold text-foreground">
                        {response.headers['ratelimit-reset']}s
                      </p>
                    </div>
                  </div>
                )}

                {/* Body viewer */}
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Response Payload
                  </span>
                  <pre className="p-3 rounded-lg bg-muted/30 border border-border/70 font-mono text-[11px] text-foreground max-h-72 overflow-auto select-all leading-relaxed">
                    {typeof response.data === 'object'
                      ? JSON.stringify(response.data, null, 2)
                      : String(response.data)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
