import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { addDays } from 'date-fns';
import { AnimatePresence, motion } from 'motion/react';
import { BedDouble, Box, Flame, GripVertical, Hand, Layers, MousePointerClick, Sparkles, Sprout, Wrench, User, Check } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, Segmented } from '@/components/ui/misc';
import { ROOM_STATUS, ResStatusBadge, RoomStatusBadge } from '@/components/ui/status';
import { useLanguage } from '@/context/LanguageContext';
import { useSession } from '@/context/SessionContext';
import { suggestRooms, useStore } from '@/data/store';
import type { Reservation, Room, RoomStatus } from '@/data/seed';
import { cn, fcfa, fmtDate, initials, nights, today } from '@/lib/utils';

const FLOORS = [4, 3, 2, 1];
const FLOOR_NAME: Record<number, { en: string; fr: string }> = {
  1: { en: 'Ground floor · garden', fr: 'Rez-de-chaussée · jardin' },
  2: { en: 'Floor 2 · courtyard & estuary', fr: 'Niveau 2 · cour & estuaire' },
  3: { en: 'Floor 3 · sea view', fr: 'Niveau 3 · vue mer' },
  4: { en: 'Floor 4 · panoramic suites', fr: 'Niveau 4 · suites panoramiques' },
};

/** 30-day forward occupancy per room (0–1) for the heat map. */
function useHeat() {
  const { rooms, reservations } = useStore();
  return useMemo(() => {
    const out: Record<string, number> = {};
    const start = today();
    const end = addDays(start, 30);
    rooms.forEach((room) => {
      let booked = 0;
      reservations
        .filter((r) => r.roomId === room.id && r.status !== 'cancelled')
        .forEach((r) => {
          const a = r.checkIn > start ? r.checkIn : start;
          const b = r.checkOut < end ? r.checkOut : end;
          booked += Math.max(0, nights(a, b));
        });
      out[room.id] = Math.min(1, booked / 30);
    });
    return out;
  }, [rooms, reservations]);
}

// Sequential single-hue ramp (gold), light → dark
const heatColor = (v: number) => `color-mix(in oklab, var(--gold-600) ${Math.round(12 + v * 88)}%, var(--surface))`;

function RoomTile({
  room,
  mode,
  heat,
  dragging,
  match,
  onOpen,
  onDrop,
}: {
  room: Room;
  mode: 'live' | 'heat';
  heat: number;
  dragging: Reservation | null;
  match?: { score: number; best: boolean };
  onOpen: () => void;
  onDrop: () => void;
}) {
  const { t } = useLanguage();
  const store = useStore();
  const [over, setOver] = useState(false);
  const occupant = store.reservations.find((r) => r.roomId === room.id && r.status === 'checked-in');
  const g = occupant ? store.guest(occupant.guestId) : undefined;
  const st = ROOM_STATUS[room.status];
  const dropOk = !!dragging && !!match;
  const wide = room.type === 'VIP' || room.type === 'Standard';

  return (
    <motion.button
      layout
      onClick={() => (dragging && match ? onDrop() : onOpen())}
      onDragOver={(e) => { if (dropOk) { e.preventDefault(); setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (dropOk) onDrop(); }}
      whileHover={{ y: -3 }}
      animate={{ opacity: dragging && !match ? 0.35 : 1, scale: over ? 1.05 : 1 }}
      className={cn(
        'relative flex h-[104px] flex-col justify-between overflow-hidden rounded-xl border-2 p-2.5 text-left shadow-sm transition-colors',
        wide ? 'w-[148px]' : 'w-[112px]',
        match?.best && 'pulse-ring',
        over && 'ring-4 ring-ai/30',
      )}
      style={{
        borderColor: dropOk ? (match!.best ? 'var(--ai)' : 'var(--border-strong)') : mode === 'live' ? st.color : 'var(--border)',
        background: mode === 'heat' ? heatColor(heat) : `color-mix(in oklab, ${st.color} 9%, var(--surface))`,
      }}
      aria-label={`${t('Room', 'Chambre')} ${room.number}, ${room.type}, ${t(st.en, st.fr)}`}
    >
      <div className="flex items-start justify-between">
        <span className="font-mono text-base font-bold text-foreground">{room.number}</span>
        {mode === 'live' ? (
          room.status === 'maintenance' ? <Wrench className="size-3.5" style={{ color: st.color }} /> : room.status === 'dirty' ? <Sprout className="size-3.5" style={{ color: st.color }} /> : <span className="size-2 rounded-full" style={{ background: st.color }} />
        ) : (
          <span className="rounded bg-surface/80 px-1 text-[10px] font-bold text-foreground tabular">{Math.round(heat * 100)}%</span>
        )}
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{room.type} · {room.capacity}p</p>
        {g ? (
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-semibold text-foreground"><User className="size-3" />{g.name.split(' ')[0]}</p>
        ) : (
          <p className="mt-0.5 text-[11px] font-semibold" style={{ color: mode === 'live' ? st.color : 'var(--muted-foreground)' }}>{t(st.en, st.fr)}</p>
        )}
      </div>
      {dropOk && (
        <span className={cn('absolute right-1.5 top-7 rounded-md px-1.5 py-0.5 text-[10px] font-bold', match!.best ? 'ai-gradient text-white' : 'bg-surface text-muted')}>
          {match!.best && '★ '}{match!.score}%
        </span>
      )}
    </motion.button>
  );
}

function RoomDrawer({ room, onClose }: { room: Room | null; onClose: () => void }) {
  const { t, lang } = useLanguage();
  const { session } = useSession();
  const store = useStore();
  const r = room ? store.rooms.find((x) => x.id === room.id)! : null;
  if (!r) return <Dialog open={false} />;
  const history = store.reservations.filter((x) => x.roomId === r.id && x.status !== 'cancelled').sort((a, b) => +b.checkIn - +a.checkIn);
  const statuses: RoomStatus[] = ['available', 'dirty', 'maintenance'];
  const canEdit = session?.role !== 'finance';
  return (
    <Dialog open={!!room} onOpenChange={(o) => !o && onClose()}>
      <DialogContent side="right" title={`${t('Room', 'Chambre')} ${r.number}`} description={`${r.type} · ${t(FLOOR_NAME[r.floor].en, FLOOR_NAME[r.floor].fr)}`}>
        <div className="space-y-5 p-6">
          <div className="flex items-center justify-between rounded-2xl border bg-surface-2 p-4">
            <div>
              <p className="text-[11px] text-muted">{t('Rate', 'Tarif')}</p>
              <p className="text-xl font-bold text-foreground tabular">{fcfa(r.price)}<span className="text-xs font-medium text-muted"> / {t('night', 'nuit')}</span></p>
            </div>
            <RoomStatusBadge status={r.status} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-muted">{t('Amenities', 'Équipements')}</p>
            <div className="flex flex-wrap gap-1.5">{r.amenities.map((a) => <Badge key={a} tone="neutral">{a}</Badge>)}<Badge tone="gold">{t(r.view!.en, r.view!.fr)}</Badge></div>
          </div>
          {canEdit && (
            <div>
              <p className="mb-2 text-xs font-semibold text-muted">{t('Set status', 'Changer le statut')}</p>
              <div className="flex flex-wrap gap-2">
                {statuses.map((s) => (
                  <Button key={s} size="sm" variant={r.status === s ? 'primary' : 'outline'} disabled={r.status === 'occupied'} onClick={() => { store.dispatch({ type: 'room', roomId: r.id, status: s }); toast.success(t(`Room ${r.number}: ${ROOM_STATUS[s].en}`, `Chambre ${r.number} : ${ROOM_STATUS[s].fr}`)); }}>
                    {s === 'available' ? <Check /> : s === 'dirty' ? <Sprout /> : <Wrench />} {t(ROOM_STATUS[s].en, ROOM_STATUS[s].fr)}
                  </Button>
                ))}
              </div>
              {r.status === 'occupied' && <p className="mt-2 text-[11px] text-muted">{t('Check the guest out to change status.', 'Enregistrez le départ pour changer le statut.')}</p>}
            </div>
          )}
          <div>
            <p className="mb-2 text-xs font-semibold text-muted">{t('Stays', 'Séjours')}</p>
            <div className="space-y-2">
              {history.map((h) => {
                const g = store.guest(h.guestId);
                return (
                  <div key={h.id} className="flex items-center gap-3 rounded-xl border p-3">
                    <Avatar name={g?.name ?? '?'} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-foreground">{g?.name}</p>
                      <p className="text-[11px] text-muted">{fmtDate(h.checkIn, lang)} → {fmtDate(h.checkOut, lang)}</p>
                    </div>
                    <ResStatusBadge status={h.status} />
                  </div>
                );
              })}
              {!history.length && <p className="text-sm text-muted">{t('No stays scheduled.', 'Aucun séjour prévu.')}</p>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function RoomsPage() {
  const { t, lang } = useLanguage();
  const { session } = useSession();
  const store = useStore();
  const heat = useHeat();
  const [params, setParams] = useSearchParams();
  const [mode, setMode] = useState<'live' | 'heat'>('live');
  const [view3d, setView3d] = useState(false);
  const [filter, setFilter] = useState<RoomStatus | 'all'>('all');
  const [dragging, setDragging] = useState<Reservation | null>(null);

  const canAssign = session?.role === 'receptionist' || session?.role === 'manager' || session?.role === 'admin';
  const tray = store.reservations.filter((r) => !r.roomId && r.status !== 'cancelled').sort((a, b) => +a.checkIn - +b.checkIn);
  const selected = store.rooms.find((r) => r.id === params.get('room')) ?? null;

  const matches = useMemo(() => {
    if (!dragging) return {} as Record<string, { score: number; best: boolean }>;
    const list = suggestRooms(store.rooms, store.reservations, dragging, store.guest(dragging.guestId)).filter((s) => s.room.capacity >= dragging.adults);
    const m: Record<string, { score: number; best: boolean }> = {};
    list.forEach((s, i) => (m[s.room.id] = { score: s.score, best: i === 0 }));
    return m;
  }, [dragging, store]);

  const assign = (roomId: string) => {
    if (!dragging) return;
    const room = store.room(roomId)!;
    const g = store.guest(dragging.guestId);
    store.dispatch({ type: 'assign', resId: dragging.id, roomId });
    toast.success(t(`${g?.name} → room ${room.number}`, `${g?.name} → chambre ${room.number}`), { description: matches[roomId]?.best ? t('AI top match ★', 'Meilleur choix IA ★') : undefined });
    setDragging(null);
  };

  const counts = (Object.keys(ROOM_STATUS) as RoomStatus[]).map((s) => ({ s, n: store.rooms.filter((r) => r.status === s).length }));
  const occupancy = Math.round((store.rooms.filter((r) => r.status === 'occupied').length / store.rooms.length) * 100);

  return (
    <AppShell
      title={t('Rooms & occupancy', 'Chambres & occupation')}
      subtitle={t(`${occupancy}% occupied right now · ${store.rooms.length} rooms on 4 floors`, `${occupancy} % occupées · ${store.rooms.length} chambres sur 4 niveaux`)}
      actions={
        <>
          <Segmented value={mode} onChange={setMode} options={[{ value: 'live', label: <span className="flex items-center gap-1.5"><BedDouble className="size-3.5" /> {t('Live status', 'Statut')}</span> }, { value: 'heat', label: <span className="flex items-center gap-1.5"><Flame className="size-3.5" /> {t('30-day heat map', 'Carte 30 j')}</span> }]} />
          <Button variant="outline" size="sm" onClick={() => setView3d(!view3d)} aria-pressed={view3d}>{view3d ? <Layers /> : <Box />} {view3d ? t('Flat plan', 'Plan à plat') : t('3D stack', 'Vue 3D')}</Button>
        </>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <div>
          {/* status filters */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            <button onClick={() => setFilter('all')} className={cn('rounded-full border px-3 py-1 text-xs font-semibold', filter === 'all' ? 'border-gold-500 bg-accent-soft text-ink' : 'text-muted')}>{t('All', 'Toutes')} <span className="opacity-60">{store.rooms.length}</span></button>
            {counts.map(({ s, n }) => (
              <button key={s} onClick={() => setFilter(filter === s ? 'all' : s)} className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold', filter === s ? 'border-gold-500 bg-accent-soft text-ink' : 'text-muted hover:text-foreground')}>
                <span className="size-2 rounded-full" style={{ background: ROOM_STATUS[s].color }} /> {t(ROOM_STATUS[s].en, ROOM_STATUS[s].fr)} <span className="opacity-60 tabular">{n}</span>
              </button>
            ))}
          </div>

          <div className={cn('space-y-4', view3d && '[perspective:1600px]')}>
            {FLOORS.map((f, i) => {
              const rooms = store.rooms.filter((r) => r.floor === f && (filter === 'all' || r.status === filter));
              const all = store.rooms.filter((r) => r.floor === f);
              const occ = all.filter((r) => r.status === 'occupied').length;
              return (
                <motion.div
                  key={f}
                  layout
                  animate={view3d ? { rotateX: 48, rotateZ: -8, y: -i * 70, scale: 0.92 } : { rotateX: 0, rotateZ: 0, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20, delay: view3d ? (3 - i) * 0.04 : 0 }}
                  style={{ transformStyle: 'preserve-3d', zIndex: 10 - i }}
                >
                  <Card className={cn('overflow-hidden', view3d && 'shadow-pop')}>
                    <div className="flex items-center justify-between border-b bg-surface-2 px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="grid size-7 place-items-center rounded-lg bg-forest-800 font-mono text-xs font-bold text-gold-300">{f}</span>
                        <span className="text-[13px] font-semibold text-foreground">{t(FLOOR_NAME[f].en, FLOOR_NAME[f].fr)}</span>
                      </div>
                      <span className="text-[11px] text-muted tabular">{occ}/{all.length} {t('occupied', 'occupées')}</span>
                    </div>
                    <div className="relative p-4">
                      {/* corridor */}
                      <div className="pointer-events-none absolute inset-x-4 bottom-4 h-3 rounded-full bg-[repeating-linear-gradient(90deg,var(--border-strong)_0_8px,transparent_8px_16px)] opacity-60" />
                      <div className="flex flex-wrap items-end gap-3 pb-6">
                        {rooms.map((room) => (
                          <RoomTile
                            key={room.id}
                            room={room}
                            mode={mode}
                            heat={heat[room.id]}
                            dragging={dragging}
                            match={matches[room.id]}
                            onOpen={() => setParams({ room: room.id }, { replace: true })}
                            onDrop={() => assign(room.id)}
                          />
                        ))}
                        {!rooms.length && <p className="py-6 text-xs text-muted">{t('No rooms match this filter.', 'Aucune chambre pour ce filtre.')}</p>}
                        <div className="ml-auto hidden h-[104px] w-14 flex-col items-center justify-center rounded-xl border border-dashed text-[10px] font-semibold uppercase tracking-wider text-muted sm:flex">
                          <Layers className="mb-1 size-4" />{t('Stairs', 'Escalier')}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {mode === 'heat' && (
            <div className="mt-4 flex items-center gap-3 text-[11px] text-muted">
              <span>{t('Booked nights, next 30 days', 'Nuits réservées, 30 prochains jours')}</span>
              <span>0%</span>
              <span className="h-2.5 w-40 rounded-full" style={{ background: `linear-gradient(90deg, ${heatColor(0)}, ${heatColor(0.5)}, ${heatColor(1)})` }} />
              <span>100%</span>
            </div>
          )}
        </div>

        {/* Assignment tray */}
        <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <Card>
            <CardHeader
              icon={<Hand />}
              title={t('Needs a room', 'À attribuer')}
              subtitle={canAssign ? t('Drag onto the map — or tap, then tap a room', 'Glissez sur le plan — ou touchez puis choisissez') : t('Read-only for your role', 'Lecture seule pour votre rôle')}
              action={<Badge tone={tray.length ? 'warn' : 'ok'}>{tray.length}</Badge>}
            />
            <div className="space-y-2 p-4">
              <AnimatePresence>
                {tray.map((r) => {
                  const g = store.guest(r.guestId);
                  const active = dragging?.id === r.id;
                  return (
                    <motion.div key={r.id} layout exit={{ opacity: 0, x: -40, height: 0 }}>
                    <div
                      draggable={canAssign}
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', r.id); e.dataTransfer.effectAllowed = 'move'; setDragging(r); }}
                      onDragEnd={() => setTimeout(() => setDragging((d) => (d?.id === r.id ? null : d)), 50)}
                      onClick={() => canAssign && setDragging(active ? null : r)}
                      className={cn('flex items-center gap-3 rounded-2xl border bg-surface p-3', canAssign && 'cursor-grab active:cursor-grabbing', active && 'border-ai ring-2 ring-ai/25')}
                    >
                      {canAssign && <GripVertical className="size-4 shrink-0 text-muted" />}
                      <Avatar name={g?.name ?? '?'} size={34} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-foreground">{g?.name}</p>
                        <p className="text-[11px] text-muted">{r.roomType} · {r.adults}p · {fmtDate(r.checkIn, lang)}–{fmtDate(r.checkOut, lang)}</p>
                      </div>
                    </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {!tray.length && <p className="flex items-center justify-center gap-2 py-6 text-sm text-ok"><Check className="size-4" /> {t('All bookings assigned', 'Tout est attribué')}</p>}
            </div>
            {dragging && (
              <div className="border-t bg-ai-soft/50 px-4 py-3 text-xs text-foreground">
                <p className="flex items-center gap-1.5 font-bold text-ai"><Sparkles className="size-3.5" /> {t('AI is ranking rooms…', 'L’IA classe les chambres…')}</p>
                <p className="mt-1 text-muted">{t('★ marks the best match for', '★ indique le meilleur choix pour')} {store.guest(dragging.guestId)?.name} ({initials(store.guest(dragging.guestId)?.name ?? '')}). {t('Greyed rooms are unavailable for these dates.', 'Les chambres grisées ne sont pas libres à ces dates.')}</p>
                <button onClick={() => setDragging(null)} className="mt-2 font-semibold text-muted hover:text-foreground">{t('Cancel', 'Annuler')}</button>
              </div>
            )}
          </Card>

          <Card className="p-4 text-[11px] text-muted">
            <p className="mb-2 flex items-center gap-1.5 font-semibold text-foreground"><MousePointerClick className="size-3.5" /> {t('Tips', 'Astuces')}</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>{t('Click a room for details and to change its status.', 'Cliquez une chambre pour le détail et le statut.')}</li>
              <li>{t('Switch to the heat map to see which rooms sell best.', 'La carte de chaleur montre les chambres les plus vendues.')}</li>
              <li>{t('Try “3D stack” for the building view.', 'Essayez la « vue 3D » du bâtiment.')}</li>
            </ul>
          </Card>
        </div>
      </div>

      <RoomDrawer room={selected} onClose={() => setParams({}, { replace: true })} />
    </AppShell>
  );
}
