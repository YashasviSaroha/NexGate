import { cn } from '../../lib/cn.js';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted/60 dark:bg-muted/30', className)}
      {...props}
    />
  );
}
