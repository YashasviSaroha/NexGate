import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background relative overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-neon-blue/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-3xl space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl overflow-hidden shadow-lg border border-border/50 mb-2">
            <img src="/logo-icon.jpg" alt="NexGate" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">NexGate</h1>
          <p className="text-sm text-muted-foreground">API infrastructure, simplified.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/demo"
            className="rounded-xl border border-border bg-card p-6 shadow-xl space-y-4 hover:border-primary/40 transition-colors"
          >
            <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-1">
              <Sparkles className="w-3 h-3" />
              Demo
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Instant Demo</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Open a labeled sample workspace with the Weather API, Product Catalog, documentation, playground, and a limited AI assistant. No registration.
              </p>
            </div>
            <span className="inline-flex items-center text-sm font-semibold text-primary">
              Explore the demo
              <ArrowRight className="w-4 h-4 ml-1" />
            </span>
          </Link>

          <Link
            to="/auth/register"
            className="rounded-xl border border-border bg-card p-6 shadow-xl space-y-4 hover:border-primary/40 transition-colors"
          >
            <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-foreground bg-muted border border-border rounded-full px-2 py-1">
              Account
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Full Registration</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Create your own organization. Publish APIs as a provider, or build applications and keys as a developer.
              </p>
            </div>
            <span className="inline-flex items-center text-sm font-semibold text-primary">
              Create an account
              <ArrowRight className="w-4 h-4 ml-1" />
            </span>
          </Link>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
