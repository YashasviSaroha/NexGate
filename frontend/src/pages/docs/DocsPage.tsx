import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { apiClient } from '../../api/client.js';
import { Card, CardTitle } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';

const gatewayOrigin = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');

export function DocsPage() {
  const { currentOrg } = useAuth();
  const [apis, setApis] = useState<any[]>([]);
  const [selectedApi, setSelectedApi] = useState<any | null>(null);

  useEffect(() => {
    if (!currentOrg) return;
    apiClient.get(`/api/v1/organizations/${currentOrg.id}/apis`).then((res) => {
      if (res.data?.success && res.data.data.length > 0) {
        setApis(res.data.data);
        setSelectedApi(res.data.data[0]);
      }
    });
  }, [currentOrg]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <span>API Documentation & OpenAPI Specifications</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Interactive developer reference, endpoint schemas, and authentication guidelines.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Navigation */}
        <Card className="p-4 space-y-2 lg:col-span-1">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase px-2">Published APIs</h4>
          <div className="space-y-1">
            {apis.map((api) => (
              <button
                key={api.id}
                onClick={() => setSelectedApi(api)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  selectedApi?.id === api.id
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {api.name}
              </button>
            ))}
          </div>
        </Card>

        {/* Documentation Content */}
        <div className="lg:col-span-3 space-y-6">
          {selectedApi ? (
            <>
              <Card className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                      {selectedApi.name}
                      <Badge variant="success">Active</Badge>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">{selectedApi.description}</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground font-semibold">Gateway Base URL:</span>
                    <span className="font-mono text-primary font-bold break-all text-right">
                      {gatewayOrigin}/gateway/{selectedApi.slug}/{selectedApi.versions?.[0]?.version || 'v1'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-semibold">Authentication Header:</span>
                    <span className="font-mono text-foreground">X-API-Key: YOUR_API_KEY</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 space-y-4">
                <CardTitle className="text-base font-bold">Exposed Endpoints</CardTitle>
                <div className="space-y-3">
                  {(selectedApi.endpoints || []).length === 0 && (
                    <p className="text-xs text-muted-foreground">This API has no endpoints yet.</p>
                  )}
                  {(selectedApi.endpoints || []).map((endpoint: any) => {
                    const version = selectedApi.versions?.[0]?.version || 'v1';
                    const path = String(endpoint.path || '/').replace(/^\//, '');
                    return (
                      <div key={endpoint.id} className="p-4 rounded-lg border border-border bg-card space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-500/10 text-blue-500">
                            {endpoint.method}
                          </span>
                          <span className="font-mono text-xs font-bold text-foreground">{endpoint.path}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {endpoint.description || 'No description saved for this endpoint.'}
                        </p>
                        <pre className="mt-1 p-2.5 rounded bg-muted/40 border border-border font-mono text-[11px] text-foreground overflow-x-auto">
{`curl -X ${endpoint.method} "${gatewayOrigin}/gateway/${selectedApi.slug}/${version}/${path}" \\
  -H "X-API-Key: YOUR_API_KEY"`}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </>
          ) : (
            <div className="text-center py-20 text-xs text-muted-foreground">Select an API from the catalog.</div>
          )}
        </div>
      </div>
    </div>
  );
}
