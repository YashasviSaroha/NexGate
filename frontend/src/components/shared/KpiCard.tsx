import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '../ui/Card.js';
import { cn } from '../../lib/cn.js';

export interface KpiCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label?: string;
    isPositive?: boolean;
  };
  icon: LucideIcon;
  subtext?: string;
  glowColor?: 'purple' | 'blue' | 'green' | 'amber';
  className?: string;
}

export function KpiCard({
  title,
  value,
  change,
  icon: Icon,
  subtext,
  glowColor = 'purple',
  className,
}: KpiCardProps) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden p-5 flex flex-col justify-between transition-all duration-300 hover:border-border/80 group',
        glowColor === 'purple' && 'dark:hover:border-primary/40 dark:hover:shadow-neon-purple',
        glowColor === 'blue' && 'dark:hover:border-neon-blue/40 dark:hover:shadow-neon-blue',
        glowColor === 'green' && 'dark:hover:border-neon-green/40 dark:hover:shadow-neon-green',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <div
          className={cn(
            'p-2 rounded-lg bg-muted text-foreground transition-colors group-hover:scale-105',
            glowColor === 'purple' && 'dark:bg-primary/10 dark:text-primary',
            glowColor === 'blue' && 'dark:bg-neon-blue/10 dark:text-neon-blue',
            glowColor === 'green' && 'dark:bg-neon-green/10 dark:text-neon-green'
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-4">
        <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>

        <div className="flex items-center gap-2 mt-1.5">
          {change && (
            <div
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded',
                change.isPositive
                  ? 'text-success bg-success/10'
                  : 'text-destructive bg-destructive/10'
              )}
            >
              {change.isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{Math.abs(change.value)}%</span>
            </div>
          )}

          <span className="text-xs text-muted-foreground truncate">
            {change?.label || subtext || 'vs last period'}
          </span>
        </div>
      </div>
    </Card>
  );
}
