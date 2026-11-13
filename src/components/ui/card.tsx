import * as React from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('rounded-2xl border bg-surface shadow-card', className)} {...props} />;
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-5 pt-5', className)}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-ink [&_svg]:size-4">{icon}</div>}
        <div className="min-w-0">
          <h3 className="font-sans text-[15px] font-bold text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
