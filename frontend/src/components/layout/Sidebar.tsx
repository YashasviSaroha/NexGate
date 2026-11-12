import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Globe,
  AppWindow,
  Key,
  BarChart3,
  ScrollText,
  BookOpen,
  Sparkles,
  Terminal,
  CreditCard,
  Webhook,
  Settings,
  LogOut,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { cn } from '../../lib/cn.js';

const NAV_ITEMS = [
  { name: 'Overview', path: '/', icon: LayoutDashboard },
  { name: 'APIs', path: '/apis', icon: Globe },
  { name: 'Applications', path: '/apps', icon: AppWindow },
  { name: 'API Keys', path: '/api-keys', icon: Key },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Request Logs', path: '/request-logs', icon: ScrollText },
  { name: 'API Docs', path: '/docs', icon: BookOpen },
  { name: 'AI Assistant', path: '/assistant', icon: Sparkles },
  { name: 'Playground', path: '/playground', icon: Terminal },
  { name: 'Subscriptions', path: '/subscriptions', icon: CreditCard },
  { name: 'Webhooks', path: '/webhooks', icon: Webhook },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export function Sidebar({ className }: { className?: string }) {
  const { user, currentOrg, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate(user?.demo ? '/' : '/login');
  };

  return (
    <aside
      className={cn(
        'w-64 border-r border-sidebar-border bg-sidebar flex flex-col justify-between shrink-0 select-none transition-colors duration-200',
        className
      )}
    >
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-sidebar-border gap-3">
          <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 shadow-sm border border-border/40">
            <img src="/logo-icon.jpg" alt="NexGate" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base leading-none tracking-tight text-foreground flex items-center gap-1.5">
              NexGate
              <span className="text-[10px] px-1.5 py-0.2 font-mono font-semibold text-primary bg-primary/10 rounded">
                v1.0
              </span>
            </span>
            <span className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate max-w-[130px]">
              {user?.demo ? 'DEMO workspace' : currentOrg?.name || 'API Platform'}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150',
                    isActive
                      ? 'bg-primary/10 text-primary font-bold dark:bg-primary/15 dark:shadow-neon-purple/20 border-l-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        'w-4 h-4 shrink-0 transition-transform group-hover:scale-105',
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                    <span className="flex-1 truncate">{item.name}</span>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-primary opacity-80" />}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* User / Org Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="flex items-center justify-between p-2 rounded-lg bg-card/60 border border-border/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center text-xs shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user?.name || 'Developer'}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email || 'admin@nexgate.dev'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
