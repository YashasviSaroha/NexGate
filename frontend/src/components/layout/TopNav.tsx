import { ThemeToggle } from '../shared/ThemeToggle.js';
import { useAuth } from '../../context/AuthContext.js';
import { ShieldCheck, Activity } from 'lucide-react';

export function TopNav() {
  const { currentOrg } = useAuth();

  return (
    <header className="h-16 border-b border-border bg-card/60 backdrop-blur-md px-6 flex items-center justify-between z-10">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-success/10 text-success border border-success/20">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span>Gateway Active</span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
          <span>Tenant:</span>
          <span className="text-foreground font-semibold px-2 py-0.5 rounded bg-muted">
            {currentOrg?.name || 'Default Org'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
      </div>
    </header>
  );
}
