import * as T from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';
import { cn, initials } from '@/lib/utils';

export function Tip({ label, children, side = 'top' }: { label: ReactNode; children: ReactNode; side?: 'top' | 'right' | 'bottom' | 'left' }) {
  return (
    <T.Root delayDuration={200}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content side={side} sideOffset={6} className="z-[60] rounded-lg bg-forest-900 px-2.5 py-1.5 text-xs font-medium text-cream-100 shadow-pop animate-in fade-in-0 zoom-in-95">
          {label}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}

export function Avatar({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  // Stable hue per name, kept inside the brand family
  const palette = ['#1b3a28', '#2d5a3d', '#4a8060', '#8b6914', '#a8851c', '#3e5c4a'];
  const idx = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % palette.length;
  return (
    <div
      className={cn('grid shrink-0 place-items-center rounded-full font-bold text-cream-100 ring-2 ring-surface', className)}
      style={{ width: size, height: size, background: palette[idx], fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn('inline-flex rounded-xl border bg-surface-2 p-1', className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
            value === o.value ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border bg-surface px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted">{children}</kbd>;
}

export function SectionTitle({ eyebrow, title, className, light }: { eyebrow: string; title: ReactNode; className?: string; light?: boolean }) {
  return (
    <div className={className}>
      <p className={cn('mb-2 text-[11px] font-bold uppercase tracking-[0.2em]', light ? 'text-gold-300' : 'text-gold-600 dark:text-gold-300')}>{eyebrow}</p>
      <h2 className={cn('font-display text-3xl font-semibold sm:text-4xl', light ? 'text-cream-50' : 'text-ink')}>{title}</h2>
    </div>
  );
}
