import React from 'react';
import { cn } from '../../lib/cn.js';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'neon';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold transition-colors',
        variant === 'default' && 'bg-primary/10 text-primary border border-primary/20',
        variant === 'success' && 'bg-success/10 text-success border border-success/20 dark:shadow-neon-green/20',
        variant === 'warning' && 'bg-warning/10 text-warning border border-warning/20',
        variant === 'destructive' && 'bg-destructive/10 text-destructive border border-destructive/20',
        variant === 'outline' && 'text-foreground border border-border bg-transparent',
        variant === 'neon' && 'bg-neon-purple/15 text-neon-purple border border-neon-purple/40 shadow-neon-purple',
        className
      )}
      {...props}
    />
  );
}
