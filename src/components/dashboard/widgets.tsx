import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { isSameDay, formatDistanceToNowStrict } from 'date-fns';
import { enGB, fr } from 'date-fns/locale';
import { animate, motion } from 'motion/react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from 'recharts';
import { ArrowDownRight, ArrowUpRight, BedDouble, CircleDollarSign, DoorOpen, LogIn, LogOut, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/context/LanguageContext';
import { useStore } from '@/data/store';
import { paymentMix, revenueByMonth, type Reservation } from '@/data/seed';
import { Card, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Avatar } from '../ui/misc';
import { ROOM_STATUS, ResStatusBadge } from '../ui/status';
import { PAY_METHODS } from '../BookingWizard';
import { cn, compact, fcfa, fmtDate, today } from '@/lib/utils';

export function CountUp({ value, format = (n) => Math.round(n).toString() }: { value: number; format?: (n: number) => string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const c = animate(0, value, { duration: 0.9, ease: 'easeOut', onUpdate: setV });
    return () => c.stop();
  }, [value]);
  return <>{format(v)}</>;
}

export function Kpi({
  label,
  value,
  format,
  delta,
  icon,
  hint,
  spark,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  delta?: number;
  icon: ReactNode;
  hint?: string;
  spark?: number[];
}) {
  const max = spark ? Math.max(...spark) : 1;
  const min = spark ? Math.min(...spark) : 0;
  const pts = spark?.map((v, i) => `${(i / (spark.length - 1)) * 100},${28 - ((v - min) / (max - min || 1)) * 24}`).join(' ');
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted">{label}</span>
        <span className="grid size-8 place-items-center rounded-lg bg-accent-soft text-ink [&_svg]:size-4">{icon}</span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <p className="text-[28px] font-bold leading-none text-foreground tabular">
            <CountUp value={value} format={format} />
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px]">
            {delta !== undefined && (
              <span className={cn('flex items-center font-bold', delta >= 0 ? 'text-ok' : 'text-bad')}>
                {delta >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                {Math.abs(delta).toFixed(1)}%
              </span>
            )}
            {hint && <span className="text-muted">{hint}</span>}
          </div>
        </div>
        {pts && (
          <svg viewBox="0 0 100 30" className="h-8 w-24 overflow-visible" preserveAspectRatio="none" aria-hidden>
            <polyline points={pts} fill="none" stroke="var(--series-1)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        )}
      </div>
    </Card>
  );
}

export function RevenueChart() {
  const { t, lang } = useLanguage();
  const data = revenueByMonth.map((m) => ({ ...m, label: fmtDate(m.month, lang, 'MMM') }));
  const total = data[data.length - 1].rooms + data[data.length - 1].services;
  return (
    <Card>
      <CardHeader
        icon={<CircleDollarSign />}
        title={t('Revenue · last 6 months', 'Chiffre d’affaires · 6 mois')}
        subtitle={t(`This month ${fcfa(total)}`, `Ce mois ${fcfa(total)}`)}
      />
      <div className="flex gap-4 px-5 pt-3 text-[11px] font-semibold text-muted">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[var(--series-1)]" /> {t('Rooms', 'Chambres')}</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[var(--series-2)]" /> {t('Services & F&B', 'Services & restauration')}</span>
      </div>
      <div className="h-[240px] px-2 pb-3 pt-2">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 18, right: 12, left: -6, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={compact} />
            <Tooltip
              cursor={{ fill: 'var(--accent-soft)' }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="rounded-xl border bg-surface px-3 py-2 text-xs shadow-pop">
                    <p className="mb-1 font-bold text-foreground">{fmtDate((payload[0].payload as (typeof data)[number]).month, lang, 'MMMM yyyy')}</p>
                    <p className="text-muted">{t('Rooms', 'Chambres')}: <b className="text-foreground tabular">{fcfa(payload[0].payload.rooms)}</b></p>
                    <p className="text-muted">{t('Services', 'Services')}: <b className="text-foreground tabular">{fcfa(payload[0].payload.services)}</b></p>
                  </div>
                ) : null
              }
            />
            <Bar dataKey="rooms" stackId="a" fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} maxBarSize={36} />
            <Bar dataKey="services" stackId="a" fill="var(--series-2)" stroke="var(--surface)" strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={36}>
              <LabelList
                position="top"
                content={(p) => {
                  const { x, y, width, index } = p as { x: number; y: number; width: number; index: number };
                  if (index !== data.length - 1) return null;
                  return <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--foreground)">{compact(total)}</text>;
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function PaymentMixCard() {
  const { t } = useLanguage();
  return (
    <Card>
      <CardHeader icon={<CircleDollarSign />} title={t('How guests pay', 'Moyens de paiement')} subtitle={t('Share of payments, last 30 days', 'Part des paiements, 30 derniers jours')} />
      <div className="space-y-3 p-5">
        {paymentMix.map((p, i) => {
          const m = PAY_METHODS.find((x) => x.id === p.method)!;
          return (
            <div key={p.method}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="flex items-center gap-2 font-semibold text-foreground"><m.icon className="size-3.5 text-muted" /> {t(m.en, m.fr)}</span>
                <span className="font-bold text-foreground tabular">{p.share}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <motion.div initial={{ width: 0 }} animate={{ width: `${p.share}%` }} transition={{ delay: i * 0.06, duration: 0.6 }} className="h-full rounded-full bg-[var(--series-1)]" />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function ActivityFeed() {
  const { t, lang } = useLanguage();
  const { activity } = useStore();
  const color = { checkin: 'bg-info', checkout: 'bg-muted', booking: 'bg-gold-500', room: 'bg-warn', payment: 'bg-ok', ai: 'bg-ai' } as const;
  return (
    <Card>
      <CardHeader icon={<Sparkles />} title={t('Live activity', 'Activité en direct')} action={<span className="flex items-center gap-1.5 text-[11px] font-semibold text-ok"><span className="size-1.5 animate-pulse rounded-full bg-ok" /> Live</span>} />
      <div className="relative space-y-0.5 p-3">
        {activity.slice(0, 7).map((a) => (
          <motion.div key={a.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3 rounded-xl px-2 py-2">
            <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', color[a.kind])} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-foreground">{t(a.en, a.fr)}</p>
              <p className="text-[11px] text-muted">{formatDistanceToNowStrict(a.at, { addSuffix: true, locale: lang === 'fr' ? fr : enGB })}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

function DeskRow({ r, kind }: { r: Reservation; kind: 'in' | 'out' }) {
  const { t } = useLanguage();
  const store = useStore();
  const g = store.guest(r.guestId);
  const room = store.room(r.roomId);
  const done = kind === 'in' ? r.status === 'checked-in' : r.status === 'checked-out';
  const roomNotReady = kind === 'in' && room && (room.status === 'dirty' || room.status === 'maintenance');
  return (
    <motion.div layout className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-2">
      <Avatar name={g?.name ?? '?'} size={34} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-foreground">{g?.name} {g?.vip && <span className="text-gold-500">★</span>}</p>
        <p className="truncate text-[11px] text-muted">
          {room ? `${t('Room', 'Ch.')} ${room.number}` : <span className="font-semibold text-warn">{t('No room yet', 'Sans chambre')}</span>} · {r.roomType} · {r.adults} {t('pax', 'pers.')}
          {r.note && ` · ${r.note}`}
        </p>
      </div>
      {done ? (
        <ResStatusBadge status={r.status} />
      ) : !room ? (
        <Button size="sm" variant="outline" asChild><Link to="/rooms">{t('Assign', 'Attribuer')}</Link></Button>
      ) : (
        <Button
          size="sm"
          variant={kind === 'in' ? 'primary' : 'outline'}
          disabled={!!roomNotReady}
          title={roomNotReady ? t('Room not ready', 'Chambre non prête') : undefined}
          onClick={() => {
            store.dispatch({ type: 'status', resId: r.id, status: kind === 'in' ? 'checked-in' : 'checked-out' });
            toast.success(kind === 'in' ? t(`${g?.name} checked in to ${room.number}`, `${g?.name} installé(e) en ${room.number}`) : t(`${g?.name} checked out — room ${room.number} sent to housekeeping`, `${g?.name} parti(e) — chambre ${room.number} envoyée au ménage`));
          }}
        >
          {kind === 'in' ? <LogIn /> : <LogOut />} {kind === 'in' ? t('Check in', 'Arrivée') : t('Check out', 'Départ')}
        </Button>
      )}
    </motion.div>
  );
}

export function FrontDesk() {
  const { t } = useLanguage();
  const { reservations } = useStore();
  const [tab, setTab] = useState<'in' | 'out'>('in');
  const active = reservations.filter((r) => r.status !== 'cancelled');
  const ins = active.filter((r) => isSameDay(r.checkIn, today()) || (r.status === 'checked-in' && isSameDay(r.checkIn, today())));
  const outs = active.filter((r) => isSameDay(r.checkOut, today()));
  const list = tab === 'in' ? ins : outs;
  return (
    <Card>
      <CardHeader
        icon={<DoorOpen />}
        title={t('Front desk · today', 'Accueil · aujourd’hui')}
        action={
          <div className="flex rounded-xl border bg-surface-2 p-1 text-xs font-semibold">
            {(['in', 'out'] as const).map((k) => (
              <button key={k} onClick={() => setTab(k)} className={cn('rounded-lg px-3 py-1', tab === k ? 'bg-surface text-ink shadow-card' : 'text-muted')}>
                {k === 'in' ? t('Arrivals', 'Arrivées') : t('Departures', 'Départs')} <span className="tabular opacity-60">{k === 'in' ? ins.length : outs.length}</span>
              </button>
            ))}
          </div>
        }
      />
      <div className="p-3">
        {list.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-muted">{t('Nothing scheduled.', 'Rien de prévu.')}</p>
        ) : (
          list.map((r) => <DeskRow key={r.id} r={r} kind={tab} />)
        )}
      </div>
    </Card>
  );
}

export function RoomStrip() {
  const { t } = useLanguage();
  const { rooms } = useStore();
  const counts = Object.entries(ROOM_STATUS).map(([k, v]) => ({ k, v, n: rooms.filter((r) => r.status === k).length }));
  return (
    <Card>
      <CardHeader icon={<BedDouble />} title={t('Rooms right now', 'Chambres en ce moment')} action={<Link to="/rooms" className="text-xs font-semibold text-gold-600 hover:underline dark:text-gold-300">{t('Open map →', 'Voir le plan →')}</Link>} />
      <div className="p-5">
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
          {counts.filter((c) => c.n).map((c) => (
            <motion.div key={c.k} layout className="h-full first:rounded-l-full last:rounded-r-full" style={{ flex: c.n, background: c.v.color }} />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-6 gap-1.5">
          {rooms.map((r) => (
            <Link key={r.id} to={`/rooms?room=${r.id}`} className="group rounded-lg border p-1.5 text-center transition-transform hover:-translate-y-0.5" style={{ borderColor: ROOM_STATUS[r.status].color }}>
              <span className="text-[11px] font-bold text-foreground tabular">{r.number}</span>
              <span className="mx-auto mt-1 block h-1 w-4 rounded-full" style={{ background: ROOM_STATUS[r.status].color }} />
            </Link>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted">
          {counts.map((c) => (
            <span key={c.k} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: c.v.color }} /> {t(c.v.en, c.v.fr)} <b className="text-foreground tabular">{c.n}</b></span>
          ))}
        </div>
      </div>
    </Card>
  );
}
