import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export type Tone = 'ok' | 'info' | 'warn' | 'bad' | 'ai' | 'neutral' | 'gold';

const tones: Record<Tone, string> = {
  ok: 'bg-ok-soft text-ok',
  info: 'bg-info-soft text-info',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
  ai: 'bg-ai-soft text-ai',
  neutral: 'bg-surface-2 text-muted border',
  gold: 'bg-accent-soft text-ink',
};

export function Badge({ tone = 'neutral', dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap', tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
