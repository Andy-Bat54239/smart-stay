import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { addDays, differenceInCalendarDays, isSameDay, isWeekend } from 'date-fns';
import { motion } from 'motion/react';
import { CalendarPlus, ChevronLeft, ChevronRight, Download, GanttChart, List, Search, Sparkles, BedDouble, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { useAI } from '@/components/ai/AIContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, Segmented } from '@/components/ui/misc';
import { RES_STATUS, ResStatusBadge } from '@/components/ui/status';
import { useLanguage } from '@/context/LanguageContext';
import { useSession } from '@/context/SessionContext';
import { quote, resTotal, suggestRooms, useStore } from '@/data/store';
import { ADD_ONS, type Reservation, type ResStatus } from '@/data/seed';
import { cn, fcfa, fmtDate, nights, today } from '@/lib/utils';

const DAYS = 14;
const COL = 64; // px per day
const CHANNEL: Record<string, { en: string; fr: string }> = {
  direct: { en: 'Direct', fr: 'Direct' },
  'walk-in': { en: 'Walk-in', fr: 'Sans réservation' },
  phone: { en: 'Phone', fr: 'Téléphone' },
  ota: { en: 'OTA', fr: 'OTA' },
};

const barCls: Record<ResStatus, string> = {
  pending: 'border-warn/50 bg-warn-soft text-foreground border-dashed',
  confirmed: 'border-gold-500/60 bg-accent-soft text-foreground',
  'checked-in': 'border-info/50 bg-info text-white',
  'checked-out': 'border-line-strong bg-surface-2 text-muted',
  cancelled: 'border-bad/40 bg-bad-soft text-bad line-through',
};

function Detail({ res, onClose }: { res: Reservation | null; onClose: () => void }) {
  const { t, lang } = useLanguage();
  const { session } = useSession();
  const store = useStore();
  const staff = session?.role !== 'guest';
  const r = res ? store.reservations.find((x) => x.id === res.id) ?? res : null;
  const g = r ? store.guest(r.guestId) : undefined;
  const room = r ? store.room(r.roomId) : undefined;
  const n = r ? nights(r.checkIn, r.checkOut) : 0;
  const q = r ? quote(room?.price ?? store.rooms.find((x) => x.type === r.roomType)!.price, n, r.adults, r.addOns) : null;
  const sugg = r && !r.roomId ? suggestRooms(store.rooms, store.reservations, r, g).slice(0, 3) : [];
  const set = (status: ResStatus) => {
    store.dispatch({ type: 'status', resId: r!.id, status });
    toast.success(t(`${r!.ref} → ${RES_STATUS[status].en}`, `${r!.ref} → ${RES_STATUS[status].fr}`));
  };

  return (
    <Dialog open={!!r} onOpenChange={(o) => !o && onClose()}>
      {r && q && (
        <DialogContent side="right" title={r.ref} description={`${CHANNEL[r.channel][lang]} · ${t('created', 'créée')} ${fmtDate(addDays(r.checkIn, -6), lang)}`}>
          <div className="space-y-5 p-6">
            <div className="flex items-center gap-3">
              <Avatar name={g?.name ?? '?'} size={48} />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground">{g?.name} {g?.vip && <Badge tone="gold">VIP</Badge>}</p>
                <p className="flex items-center gap-3 text-xs text-muted"><span className="flex items-center gap-1"><Phone className="size-3" />{g?.phone}</span></p>
                <p className="flex items-center gap-1 text-xs text-muted"><Mail className="size-3" />{g?.email}</p>
              </div>
              <ResStatusBadge status={r.status} />
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-2xl border bg-surface-2 p-4 text-center">
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted">{t('In', 'Arrivée')}</p><p className="mt-1 text-sm font-semibold text-foreground">{fmtDate(r.checkIn, lang, 'EEE d MMM')}</p></div>
              <div className="border-x"><p className="text-[10px] font-bold uppercase tracking-wider text-muted">{t('Nights', 'Nuits')}</p><p className="mt-1 text-sm font-semibold text-foreground">{n}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted">{t('Out', 'Départ')}</p><p className="mt-1 text-sm font-semibold text-foreground">{fmtDate(r.checkOut, lang, 'EEE d MMM')}</p></div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-ink"><BedDouble className="size-5" /></span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{room ? `${t('Room', 'Chambre')} ${room.number}` : t('No room assigned', 'Aucune chambre')}</p>
                  <p className="text-xs text-muted">{r.roomType} · {r.adults} {t('guest(s)', 'pers.')}</p>
                </div>
              </div>
            </div>

            {staff && sugg.length > 0 && (
              <div className="rounded-2xl border border-ai/25 bg-ai-soft/60 p-4">
                <p className="flex items-center gap-1.5 text-xs font-bold text-ai"><Sparkles className="size-3.5" /> {t('Best rooms for this guest', 'Meilleures chambres pour ce client')}</p>
                <div className="mt-3 space-y-2">
                  {sugg.map((s) => (
                    <div key={s.room.id} className="flex items-center gap-3 rounded-xl bg-surface p-2.5">
                      <span className="grid size-9 place-items-center rounded-lg bg-surface-2 text-sm font-bold text-foreground">{s.room.number}</span>
                      <div className="min-w-0 flex-1 text-[11px] text-muted">{s.reasons.slice(0, 2).map((x) => t(x.en, x.fr)).join(' · ')}</div>
                      <Badge tone="ai">{s.score}%</Badge>
                      <Button size="sm" onClick={() => { store.dispatch({ type: 'assign', resId: r.id, roomId: s.room.id }); toast.success(t(`Assigned to ${s.room.number}`, `Attribuée à la ${s.room.number}`)); }}>{t('Assign', 'Attribuer')}</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {r.addOns.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-muted">{t('Add-ons', 'Options')}</p>
                <div className="flex flex-wrap gap-1.5">{r.addOns.map((a) => { const x = ADD_ONS.find((y) => y.id === a)!; return <Badge key={a} tone="neutral">{t(x.en, x.fr)}</Badge>; })}</div>
              </div>
            )}
            {r.note && <p className="rounded-xl bg-warn-soft px-3 py-2 text-xs text-foreground">📝 {r.note}</p>}

            <div className="rounded-2xl border p-4 text-sm">
              {[[t('Room', 'Chambre'), q.room], [t('Add-ons', 'Options'), q.extras], [t('Tax 10%', 'TVA 10 %'), q.tax]].map(([l, v]) => (
                <div key={l as string} className="flex justify-between py-0.5 text-muted"><span>{l}</span><span className="tabular text-foreground">{fcfa(v as number)}</span></div>
              ))}
              <div className="my-2 border-t" />
              <div className="flex justify-between font-bold text-ink"><span>{t('Total', 'Total')}</span><span className="tabular">{fcfa(q.total)}</span></div>
              <div className="mt-1 flex justify-between text-xs text-muted"><span>{t('Paid', 'Payé')}</span><span className="tabular">{fcfa(r.paid)}</span></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-ok" style={{ width: `${Math.min(100, (r.paid / q.total) * 100)}%` }} /></div>
            </div>
          </div>
          {staff && (
            <div className="sticky bottom-0 flex flex-wrap gap-2 border-t bg-surface px-6 py-4">
              {r.status === 'pending' && <Button onClick={() => set('confirmed')}>{t('Confirm', 'Confirmer')}</Button>}
              {(r.status === 'confirmed' || r.status === 'pending') && r.roomId && isSameDay(r.checkIn, today()) && <Button onClick={() => set('checked-in')}>{t('Check in', 'Enregistrer l’arrivée')}</Button>}
              {r.status === 'checked-in' && <Button onClick={() => set('checked-out')}>{t('Check out', 'Départ')}</Button>}
              {r.status !== 'cancelled' && r.status !== 'checked-out' && r.status !== 'checked-in' && <Button variant="outline" className="text-bad" onClick={() => set('cancelled')}>{t('Cancel booking', 'Annuler')}</Button>}
              <Button variant="ghost" onClick={() => toast.success(t('Confirmation re-sent by email & SMS', 'Confirmation renvoyée par email et SMS'))}>{t('Resend confirmation', 'Renvoyer')}</Button>
            </div>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}

function Timeline({ start, list, onOpen }: { start: Date; list: Reservation[]; onOpen: (r: Reservation) => void }) {
  const { t, lang } = useLanguage();
  const store = useStore();
  const days = Array.from({ length: DAYS }, (_, i) => addDays(start, i));
  const unassigned = list.filter((r) => !r.roomId);
  const rows = [
    ...(unassigned.length ? [{ key: 'un', label: t('Unassigned', 'Sans chambre'), sub: `${unassigned.length}`, items: unassigned, warn: true }] : []),
    ...store.rooms.map((room) => ({ key: room.id, label: room.number, sub: room.type, items: list.filter((r) => r.roomId === room.id), warn: false })),
  ];
  const occByDay = days.map((d) => store.reservations.filter((r) => r.roomId && r.status !== 'cancelled' && r.checkIn <= d && r.checkOut > d).length);

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <div style={{ minWidth: 120 + DAYS * COL }}>
          {/* header */}
          <div className="sticky top-0 z-10 flex border-b bg-surface">
            <div className="w-[120px] shrink-0 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted">{t('Room', 'Chambre')}</div>
            {days.map((d, i) => (
              <div key={i} className={cn('shrink-0 border-l px-1 py-2 text-center', isSameDay(d, today()) && 'bg-accent-soft', isWeekend(d) && !isSameDay(d, today()) && 'bg-surface-2')} style={{ width: COL }}>
                <p className="text-[10px] font-semibold uppercase text-muted">{fmtDate(d, lang, 'EEE')}</p>
                <p className={cn('text-sm font-bold tabular', isSameDay(d, today()) ? 'text-ink' : 'text-foreground')}>{fmtDate(d, lang, 'd')}</p>
                <div className="mx-auto mt-1 h-1 w-8 overflow-hidden rounded-full bg-line-strong" title={`${Math.round((occByDay[i] / store.rooms.length) * 100)}%`}>
                  <div className="h-full bg-[var(--series-1)]" style={{ width: `${(occByDay[i] / store.rooms.length) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          {/* rows */}
          {rows.map((row) => (
            <div key={row.key} className={cn('relative flex border-b last:border-b-0', row.warn && 'bg-warn-soft/40')} style={{ height: row.key === 'un' ? Math.max(52, row.items.length * 36 + 16) : 52 }}>
              <div className="flex w-[120px] shrink-0 flex-col justify-center px-4">
                <span className={cn('text-sm font-bold tabular', row.warn ? 'text-warn' : 'text-foreground')}>{row.label}</span>
                <span className="text-[11px] text-muted">{row.sub}</span>
              </div>
              {days.map((d, i) => <div key={i} className={cn('shrink-0 border-l', isSameDay(d, today()) && 'bg-accent-soft/60', isWeekend(d) && 'bg-surface-2/50')} style={{ width: COL }} />)}
              {row.items.map((r, idx) => {
                const off = differenceInCalendarDays(r.checkIn, start);
                const len = nights(r.checkIn, r.checkOut);
                const x0 = Math.max(120, 120 + (off + 0.5) * COL);
                const x1 = Math.min(120 + DAYS * COL, 120 + (off + len + 0.5) * COL);
                if (x1 - x0 < 8) return null;
                const g = store.guest(r.guestId);
                return (
                  <motion.button
                    key={r.id}
                    layout
                    initial={{ opacity: 0, scaleX: 0.8 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    whileHover={{ y: -2 }}
                    onClick={() => onOpen(r)}
                    className={cn('absolute flex items-center gap-1.5 overflow-hidden rounded-lg border px-2 text-left text-[11px] font-semibold shadow-sm', barCls[r.status])}
                    style={{
                      left: x0 + 2,
                      width: x1 - x0 - 4,
                      top: row.key === 'un' ? 8 + idx * 36 : 10,
                      height: 32,
                      transformOrigin: 'left',
                    }}
                    title={`${g?.name} · ${r.ref}`}
                  >
                    <span className="truncate">{g?.name}</span>
                    {r.addOns.length > 0 && <span className="shrink-0 opacity-60">+{r.addOns.length}</span>}
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default function ReservationsPage() {
  const { t, lang } = useLanguage();
  const { session } = useSession();
  const store = useStore();
  const { setBookingOpen } = useAI();
  const [params, setParams] = useSearchParams();
  const isGuest = session?.role === 'guest';
  const [view, setView] = useState<'timeline' | 'list'>(isGuest ? 'list' : 'timeline');
  const [start, setStart] = useState(addDays(today(), -2));
  const [status, setStatus] = useState<ResStatus | 'all'>('all');
  const [q, setQ] = useState('');

  const open = store.reservations.find((r) => r.id === params.get('res')) ?? null;
  const setOpen = (r: Reservation | null) => setParams(r ? { res: r.id } : {}, { replace: true });

  const list = useMemo(
    () =>
      store.reservations
        .filter((r) => !isGuest || r.guestId === session?.guestId)
        .filter((r) => status === 'all' || r.status === status)
        .filter((r) => {
          if (!q) return true;
          const g = store.guest(r.guestId);
          return `${g?.name} ${r.ref} ${store.room(r.roomId)?.number ?? ''}`.toLowerCase().includes(q.toLowerCase());
        })
        .sort((a, b) => +a.checkIn - +b.checkIn),
    [store, status, q, isGuest, session],
  );

  const counts = (Object.keys(RES_STATUS) as ResStatus[]).map((s) => ({ s, n: store.reservations.filter((r) => (!isGuest || r.guestId === session?.guestId) && r.status === s).length }));

  const exportCsv = () => {
    const rows = [['Ref', 'Guest', 'Room', 'Type', 'Check-in', 'Check-out', 'Nights', 'Total FCFA', 'Paid FCFA', 'Status', 'Channel']];
    list.forEach((r) => rows.push([r.ref, store.guest(r.guestId)?.name ?? '', store.room(r.roomId)?.number ?? '', r.roomType, fmtDate(r.checkIn, 'en', 'yyyy-MM-dd'), fmtDate(r.checkOut, 'en', 'yyyy-MM-dd'), `${nights(r.checkIn, r.checkOut)}`, `${resTotal(r, store.rooms)}`, `${r.paid}`, r.status, r.channel]));
    const blob = new Blob([rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reservations-${fmtDate(today(), 'en', 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(t('Report exported', 'Rapport exporté'));
  };

  return (
    <AppShell
      title={isGuest ? t('My reservations', 'Mes réservations') : t('Reservations', 'Réservations')}
      subtitle={t(`${list.length} booking(s) · click any booking for details`, `${list.length} réservation(s) · cliquez pour le détail`)}
      actions={
        <>
          {!isGuest && <Button variant="outline" size="sm" onClick={exportCsv}><Download /> CSV</Button>}
          <Button size="sm" onClick={() => setBookingOpen(true)}><CalendarPlus /> {t('New booking', 'Réserver')}</Button>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {!isGuest && (
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'timeline', label: <span className="flex items-center gap-1.5"><GanttChart className="size-3.5" /> {t('Timeline', 'Planning')}</span> },
              { value: 'list', label: <span className="flex items-center gap-1.5"><List className="size-3.5" /> {t('List', 'Liste')}</span> },
            ]}
          />
        )}
        <div className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-xl border bg-surface px-3 sm:max-w-xs">
          <Search className="size-4 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Guest, ref or room…', 'Client, réf. ou chambre…')} className="flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setStatus('all')} className={cn('rounded-full border px-3 py-1 text-xs font-semibold', status === 'all' ? 'border-gold-500 bg-accent-soft text-ink' : 'text-muted')}>{t('All', 'Toutes')}</button>
          {counts.map(({ s, n }) => (
            <button key={s} onClick={() => setStatus(s)} className={cn('rounded-full border px-3 py-1 text-xs font-semibold', status === s ? 'border-gold-500 bg-accent-soft text-ink' : 'text-muted hover:text-foreground')}>
              {t(RES_STATUS[s].en, RES_STATUS[s].fr)} <span className="opacity-60 tabular">{n}</span>
            </button>
          ))}
        </div>
        {view === 'timeline' && !isGuest && (
          <div className="ml-auto flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setStart(addDays(start, -7))} aria-label="Previous week"><ChevronLeft /></Button>
            <Button variant="outline" size="sm" onClick={() => setStart(addDays(today(), -2))}>{t('Today', 'Aujourd’hui')}</Button>
            <Button variant="outline" size="icon" onClick={() => setStart(addDays(start, 7))} aria-label="Next week"><ChevronRight /></Button>
          </div>
        )}
      </div>

      {view === 'timeline' && !isGuest ? (
        <>
          <Timeline start={start} list={list} onOpen={setOpen} />
          <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted">
            {(Object.keys(RES_STATUS) as ResStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5"><span className={cn('h-3 w-5 rounded border', barCls[s])} /> {t(RES_STATUS[s].en, RES_STATUS[s].fr)}</span>
            ))}
            <span className="flex items-center gap-1.5"><span className="h-1 w-5 rounded bg-[var(--series-1)]" /> {t('Daily occupancy', 'Occupation du jour')}</span>
          </div>
        </>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead className="border-b bg-surface-2 text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">{t('Guest', 'Client')}</th>
                  <th className="px-4 py-3">{t('Stay', 'Séjour')}</th>
                  <th className="px-4 py-3">{t('Room', 'Chambre')}</th>
                  <th className="px-4 py-3">{t('Channel', 'Canal')}</th>
                  <th className="px-4 py-3 text-right">{t('Total', 'Total')}</th>
                  <th className="px-4 py-3">{t('Status', 'Statut')}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const g = store.guest(r.guestId);
                  const total = resTotal(r, store.rooms);
                  return (
                    <tr key={r.id} onClick={() => setOpen(r)} className="cursor-pointer border-b last:border-0 hover:bg-surface-2">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={g?.name ?? '?'} size={32} />
                          <div><p className="font-semibold text-foreground">{g?.name}</p><p className="font-mono text-[11px] text-muted">{r.ref}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground">{fmtDate(r.checkIn, lang)} → {fmtDate(r.checkOut, lang)} <span className="text-muted">· {nights(r.checkIn, r.checkOut)}n</span></td>
                      <td className="px-4 py-3">{store.room(r.roomId)?.number ?? <Badge tone="warn">{t('Unassigned', 'Sans chambre')}</Badge>} <span className="text-muted">{r.roomType}</span></td>
                      <td className="px-4 py-3 text-muted">{CHANNEL[r.channel][lang]}</td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold text-foreground tabular">{fcfa(total)}</p>
                        <p className={cn('text-[11px] tabular', r.paid >= total ? 'text-ok' : 'text-muted')}>{r.paid >= total ? t('Paid', 'Payé') : `${Math.round((r.paid / total) * 100)}% ${t('paid', 'payé')}`}</p>
                      </td>
                      <td className="px-4 py-3"><ResStatusBadge status={r.status} /></td>
                    </tr>
                  );
                })}
                {!list.length && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted">{t('No reservations match.', 'Aucune réservation.')}</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Detail res={open} onClose={() => setOpen(null)} />
    </AppShell>
  );
}
