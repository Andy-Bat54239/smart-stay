import { cn } from '@/lib/utils';

/** Auberge Le Philo badge — redrawn from the prototype's SVG, simplified for small sizes. */
export function LogoBadge({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden>
      <circle cx="50" cy="50" r="48" fill="#1B3A28" />
      <circle cx="50" cy="50" r="46" fill="none" stroke="#C9A227" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#C9A227" strokeWidth="0.8" opacity="0.45" />
      <g transform="translate(50 50)">
        <polygon points="-20,-2 0,-19 20,-2" fill="#C9A227" />
        <rect x="-15" y="-2" width="30" height="18" fill="#C9A227" />
        <rect x="-4" y="5" width="8" height="11" fill="#1B3A28" />
        <rect x="-12" y="2" width="5" height="5" fill="#1B3A28" opacity="0.75" />
        <rect x="7" y="2" width="5" height="5" fill="#1B3A28" opacity="0.75" />
        <path d="M-30 16 Q0 24 30 16" stroke="#C9A227" strokeWidth="1.4" fill="none" opacity="0.7" />
        <g fill="#C9A227" opacity="0.85">
          <path d="M-27 15 L-26 -2" stroke="#C9A227" strokeWidth="1.4" />
          <ellipse cx="-30" cy="-3" rx="6" ry="2.2" transform="rotate(-20 -30 -3)" />
          <ellipse cx="-22" cy="-4" rx="6" ry="2.2" transform="rotate(18 -22 -4)" />
        </g>
      </g>
    </svg>
  );
}

export function Wordmark({ light, className, compact }: { light?: boolean; className?: string; compact?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <LogoBadge size={compact ? 34 : 42} />
      <div className="leading-none">
        <div className={cn('font-display text-[15px] font-bold tracking-wide', light ? 'text-cream-50' : 'text-ink')}>AUBERGE</div>
        <div className="font-display text-[15px] font-bold tracking-[0.18em] text-gold-500">LE PHILO</div>
        {!compact && (
          <div className={cn('mt-1 text-[9px] font-semibold uppercase tracking-[0.2em]', light ? 'text-gold-300/70' : 'text-muted')}>
            Ozouri · Port-Gentil
          </div>
        )}
      </div>
    </div>
  );
}
