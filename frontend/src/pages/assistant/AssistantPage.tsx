import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { apiClient } from '../../api/client.js';
import { Card, CardTitle, CardDescription } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';

export function AssistantPage() {
  const { currentOrg, user } = useAuth();
  const { success, error } = useToast();
  const [params] = useSearchParams();

  const [apis, setApis] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [apiId, setApiId] = useState('');
  const [logId, setLogId] = useState(params.get('log') || '');
  const [usage, setUsage] = useState<any>(null);
  const [docs, setDocs] = useState<any>(null);
  const [summary, setSummary] = useState('');
  const [explanation, setExplanation] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [examples, setExamples] = useState<any>(null);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    if (!currentOrg) return;
    apiClient
      .get('/api/v1/ai/usage')
      .then((res) => setUsage(res.data?.data))
      .catch(() => setUsage(null));
    apiClient
      .get(`/api/v1/organizations/${currentOrg.id}/apis`)
      .then((res) => {
        const rows = res.data?.data || [];
        setApis(rows);
        if (rows[0] && !apiId) setApiId(rows[0].id);
      })
      .catch(() => setApis([]));
    apiClient
      .get(`/api/v1/organizations/${currentOrg.id}/request-logs?statusCategory=error&limit=10`)
      .then((res) => setLogs(res.data?.data || []))
      .catch(() => setLogs([]));
  }, [currentOrg]);

  const run = async (name: string, request: () => Promise<any>) => {
    setBusy(name);
    try {
      const res = await request();
      if (res.data?.data?.quota) setUsage((prev: any) => ({ ...prev, ...res.data.data.quota, remaining: undefined }));
      return res.data?.data;
    } catch (err: any) {
      error('Assistant unavailable', err.response?.data?.error?.message || 'The assistant could not complete that request.');
      return null;
    } finally {
      setBusy('');
    }
  };

  const generateDocs = async () => {
    const data = await run('docs', () => apiClient.post('/api/v1/ai/documentation', { apiId }));
    if (!data) return;
    setDocs(data);
    setSummary(data.summary || '');
  };

  const saveDocs = async () => {
    if (!currentOrg || !apiId) return;
    setBusy('save');
    try {
      await apiClient.put(`/api/v1/organizations/${currentOrg.id}/apis/${apiId}`, { description: summary });
      success('Documentation saved', 'The API description was updated.');
    } catch (err: any) {
      error('Save failed', err.response?.data?.error?.message || 'The description was not saved.');
    } finally {
      setBusy('');
    }
  };

  const explain = async () => {
    const data = await run('explain', () => apiClient.post('/api/v1/ai/explain', { requestLogId: logId }));
    if (data) setExplanation(data);
  };

  const loadInsights = async () => {
    if (!currentOrg) return;
    const data = await run('insights', () =>
      apiClient.post('/api/v1/ai/insights', { organizationId: currentOrg.id })
    );
    if (data) setInsights(data);
  };

  const loadExamples = async () => {
    const data = await run('examples', () => apiClient.post('/api/v1/ai/examples', { apiId }));
    if (data) setExamples(data);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Assistant
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Gemini runs on the server. Confirmed figures stay separate from generated suggestions.
          {usage ? ` ${usage.remaining ?? Math.max(0, (usage.limit || 0) - (usage.used || 0))} requests left today.` : ''}
          {user?.demo ? ' Demo usage is capped.' : ''}
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <CardTitle className="text-sm font-bold">Documentation</CardTitle>
        <CardDescription>Generate a description from the selected API, then edit it before saving.</CardDescription>
        <select
          value={apiId}
          onChange={(e) => setApiId(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
        >
          {apis.map((api) => (
            <option key={api.id} value={api.id}>
              {api.name}
            </option>
          ))}
        </select>
        <Button type="button" onClick={generateDocs} isLoading={busy === 'docs'} disabled={!apiId}>
          Generate documentation
        </Button>
        {docs && (
          <div className="space-y-3">
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full min-h-28 rounded-lg border border-border bg-background p-3 text-sm"
            />
            <ul className="space-y-2 text-xs text-muted-foreground">
              {docs.endpoints?.map((endpoint: any) => (
                <li key={`${endpoint.method}-${endpoint.path}`}>
                  <span className="font-mono text-foreground">
                    {endpoint.method} {endpoint.path}
                  </span>
                  {' — '}
                  {endpoint.description}
                </li>
              ))}
            </ul>
            <Button type="button" onClick={saveDocs} isLoading={busy === 'save'} disabled={user?.demo}>
              Save description
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <CardTitle className="text-sm font-bold">Error explanation</CardTitle>
        <CardDescription>Uses the stored method, path, status, and latency. Request bodies are not sent.</CardDescription>
        <select
          value={logId}
          onChange={(e) => setLogId(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
        >
          <option value="">Select a failed request</option>
          {logs.map((log) => (
            <option key={log.id} value={log.id}>
              {log.method} {log.path} · {log.statusCode}
            </option>
          ))}
        </select>
        <Button type="button" onClick={explain} isLoading={busy === 'explain'} disabled={!logId}>
          Explain request
        </Button>
        {explanation && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-semibold text-foreground mb-1">Confirmed</p>
              <ul className="space-y-1 text-muted-foreground">
                {explanation.confirmed?.map((fact: string) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">AI hypotheses</p>
              <ul className="space-y-1 text-muted-foreground">
                {explanation.hypotheses?.map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="font-semibold text-foreground mt-3 mb-1">Steps to try</p>
              <ul className="space-y-1 text-muted-foreground">
                {explanation.steps?.map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <CardTitle className="text-sm font-bold">Traffic insights</CardTitle>
        <CardDescription>Summarizes the last 24 hours of stored metrics. This does not run when the dashboard opens.</CardDescription>
        <Button type="button" onClick={loadInsights} isLoading={busy === 'insights'} disabled={!currentOrg}>
          Summarize traffic
        </Button>
        {insights && (
          <div className="text-xs space-y-2 text-muted-foreground">
            <p className="text-foreground">{insights.summary}</p>
            {insights.patterns?.map((item: string) => (
              <p key={item}>{item}</p>
            ))}
            {insights.suggestions?.map((item: string) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <CardTitle className="text-sm font-bold">Integration examples</CardTitle>
        <CardDescription>cURL, JavaScript, and Python use YOUR_API_KEY instead of a real credential.</CardDescription>
        <Button type="button" onClick={loadExamples} isLoading={busy === 'examples'} disabled={!apiId}>
          Build examples
        </Button>
        {examples && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{examples.notes}</p>
            {['curl', 'javascript', 'python'].map((language) => (
              <pre key={language} className="text-[11px] overflow-x-auto rounded-lg bg-muted/40 p-3 font-mono">
                {examples[language]}
              </pre>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
