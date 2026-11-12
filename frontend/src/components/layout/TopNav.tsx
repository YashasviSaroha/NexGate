import { ThemeToggle } from '../shared/ThemeToggle.js';
import { useAuth } from '../../context/AuthContext.js';
import { Link } from 'react-router-dom';

export function TopNav() {
  const { currentOrg, user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-border bg-card/60 backdrop-blur-md px-4 md:px-6 flex items-center justify-between gap-3 z-10">
      <div className="flex items-center gap-3 min-w-0">
        {user?.demo && (
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
            Demo
          </span>
        )}
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-success/10 text-success border border-success/20">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span>Gateway Active</span>
        </div>
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground font-mono min-w-0">
          <span>Tenant:</span>
          <span className="text-foreground font-semibold px-2 py-0.5 rounded bg-muted truncate">
            {currentOrg?.name || 'Default Org'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {user?.demo && (
          <>
            <p className="hidden xl:block text-[11px] text-muted-foreground max-w-[220px]">
              Sample data is read-only. Gateway tests use the sandbox key.
            </p>
            <Link to="/auth/register" className="text-xs font-semibold text-primary hover:underline">
              Create account
            </Link>
            <button
              type="button"
              onClick={() => logout().then(() => window.location.assign('/'))}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Exit
            </button>
          </>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
