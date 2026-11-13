import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

const base =
  'h-10 w-full rounded-xl border bg-surface-2 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20';

export function Field({ label, hint, error, children, className }: { label: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="text-xs font-semibold text-muted">{label}</span>
      <div className="mt-1">{children}</div>
      {error ? <span className="mt-1 block text-[11px] text-bad">{error}</span> : hint ? <span className="mt-1 block text-[11px] text-muted">{hint}</span> : null}
    </label>
  );
}

export function Input({ className, ...p }: ComponentProps<'input'>) {
  return <input className={cn(base, className)} {...p} />;
}

export function Select({ className, ...p }: ComponentProps<'select'>) {
  return <select className={cn(base, 'pr-8', className)} {...p} />;
}

export function Textarea({ className, ...p }: ComponentProps<'textarea'>) {
  return <textarea className={cn(base, 'h-auto min-h-[88px] py-2.5', className)} {...p} />;
}

export function Switch({ on, onChange, label, tone = 'gold' }: { on: boolean; onChange: (v: boolean) => void; label: string; tone?: 'gold' | 'ai' | 'ok' }) {
  const bg = { gold: 'bg-gold-500', ai: 'bg-ai', ok: 'bg-ok' }[tone];
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cn('h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors', on ? bg : 'bg-line-strong')}>
      <span className={cn('block size-4 rounded-full bg-white shadow transition-transform', on && 'translate-x-4')} />
    </button>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors', active ? 'border-gold-500 bg-accent-soft text-ink' : 'text-muted hover:text-foreground')}>
      {children}
    </button>
  );
}

export function Stat({ label, value, sub, tone }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: 'ok' | 'bad' | 'warn' }) {
  return (
    <div className="rounded-2xl border bg-surface p-4 shadow-card">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className={cn('mt-1.5 text-2xl font-bold tabular', tone === 'ok' ? 'text-ok' : tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : 'text-foreground')}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

export const th = 'px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted';
export const td = 'px-4 py-3';
