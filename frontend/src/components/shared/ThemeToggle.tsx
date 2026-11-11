import { useTheme } from '../../context/ThemeContext.js';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '../../lib/cn.js';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === 'system') {
      setTheme('light');
    } else if (theme === 'light') {
      setTheme('dark');
    } else {
      setTheme('system');
    }
  };

  return (
    <button
      onClick={cycleTheme}
      title={`Theme: ${theme} (Click to switch)`}
      aria-label="Toggle theme"
      className={cn(
        'relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-card/80 hover:bg-muted text-foreground transition-all duration-200 active:scale-95',
        resolvedTheme === 'dark' && 'dark:hover:border-primary/40 dark:hover:shadow-neon-purple',
        className
      )}
    >
      {theme === 'system' ? (
        <Monitor className="w-4 h-4 text-muted-foreground transition-transform" />
      ) : resolvedTheme === 'dark' ? (
        <Moon className="w-4 h-4 text-neon-purple transition-transform" />
      ) : (
        <Sun className="w-4 h-4 text-amber-500 transition-transform" />
      )}
    </button>
  );
}
