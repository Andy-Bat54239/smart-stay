import { useState } from 'react';
import { isSameDay } from 'date-fns';
import { motion } from 'motion/react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, Download, PackagePlus, Plus, Search, Sparkles, Sprout, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, Segmented } from '@/components/ui/misc';
import { Field, Input, Select, Stat, td, th } from '@/components/ui/form';
import { useLanguage } from '@/context/LanguageContext';
import { useSession } from '@/context/SessionContext';
import { useStore } from '@/data/store';
import { cleanerStats, type LostItem } from '@/data/seed2';
import type { Room } from '@/data/seed';
import { cn, downloadCsv, fmtDate, today } from '@/lib/utils';

type Stage = 'todo' | 'progress' | 'inspect' | 'ready' | 'maint';
const CLEANERS = cleanerStats.map((c) => c.name);

const COLS: { id: Stage; en: string; fr: string; color: string }[] = [
  { id: 'todo', en: 'To clean', fr: 'À nettoyer', color: 'var(--ai)' },
  { id: 'progress', en: 'In progress', fr: 'En cours', color: 'var(--info)' },
  { id: 'inspect', en: 'Inspection', fr: 'Inspection', color: 'var(--warn)' },
  { id: 'ready', en: 'Ready', fr: 'Prête', color: 'var(--ok)' },
  { id: 'maint', en: 'Maintenance', fr: 'Maintenance', color: 'var(--bad)' },
];

function Board() {
  const { t } = useLanguage();
  const store = useStore();
  const { session } = useSession();
  const supervisor = session?.role === 'manager' || session?.role === 'admin' || session?.role === 'housekeeping';
  // page-local workflow state layered on top of the shared room status
  const [stageOf, setStageOf] = useState<Record<string, Stage>>({});
  const [who, setWho] = useState<Record<string, string>>({ R102: 'Amina Mba' });
  const [drag, setDrag] = useState<string | null>(null);

  const arrivalsToday = store.reservations.filter((r) => r.status !== 'cancelled' && r.status !== 'checked-in' && isSameDay(r.checkIn, today()));
  const priority = (room: Room) => arrivalsToday.some((a) => a.roomId === room.id) ? 'high' : arrivalsToday.some((a) => !a.roomId && a.roomType === room.type) ? 'medium' : 'normal';

  const stage = (room: Room): Stage | null => {
    if (room.status === 'maintenance') return 'maint';
    if (room.status === 'dirty') return stageOf[room.id] && stageOf[room.id] !== 'ready' && stageOf[room.id] !== 'maint' ? stageOf[room.id] : 'todo';
    if (room.status === 'available') return 'ready';
    return null; // occupied / reserved rooms are not on the board
  };

  const move = (room: Room, to: Stage) => {
    if (to === 'ready') {
      store.dispatch({ type: 'room', roomId: room.id, status: 'available' });
      toast.success(t(`Room ${room.number} inspected & ready — front desk notified`, `Chambre ${room.number} inspectée et prête — accueil prévenu`));
    } else if (to === 'maint') {
      store.dispatch({ type: 'room', roomId: room.id, status: 'maintenance' });
    } else {
      if (room.status !== 'dirty') store.dispatch({ type: 'room', roomId: room.id, status: 'dirty' });
      if (to === 'progress' && !who[room.id]) setWho({ ...who, [room.id]: CLEANERS[0] });
    }
    setStageOf({ ...stageOf, [room.id]: to });
  };

  const next: Record<Stage, Stage | null> = { todo: 'progress', progress: 'inspect', inspect: 'ready', ready: null, maint: 'todo' };
  const nextLabel: Record<Stage, { en: string; fr: string }> = {
    todo: { en: 'Start', fr: 'Commencer' },
    progress: { en: 'Done', fr: 'Terminé' },
    inspect: { en: 'Pass inspection', fr: 'Valider' },
    ready: { en: '', fr: '' },
    maint: { en: 'Repaired', fr: 'Réparée' },
  };

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 scrollbar-thin sm:mx-0 sm:px-0">
      <div className="grid min-w-[1040px] grid-cols-5 gap-3">
        {COLS.map((col) => {
          const rooms = store.rooms.filter((r) => stage(r) === col.id).sort((a, b) => (priority(a) === 'high' ? -1 : 0) - (priority(b) === 'high' ? -1 : 0));
          return (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { const room = store.rooms.find((r) => r.id === drag); if (room && stage(room) !== col.id) move(room, col.id); setDrag(null); }}
              className={cn('flex min-h-[320px] flex-col rounded-2xl border bg-surface-2 p-2.5 transition-colors', drag && 'border-dashed border-line-strong')}
            >
              <div className="mb-2 flex items-center justify-between px-1.5">
                <span className="flex items-center gap-2 text-xs font-bold text-foreground"><span className="size-2 rounded-full" style={{ background: col.color }} />{t(col.en, col.fr)}</span>
                <span className="text-[11px] font-bold text-muted tabular">{rooms.length}</span>
              </div>
              <div className="space-y-2">
                {rooms.map((room) => {
                  const p = priority(room);
                  const st = stage(room)!;
                  return (
                    <motion.div
                      layout
                      key={room.id}
                      className="rounded-xl border bg-surface p-3 shadow-sm"
                    >
                      <div draggable onDragStart={() => setDrag(room.id)} onDragEnd={() => setDrag(null)} className="cursor-grab active:cursor-grabbing">
                        <div className="flex items-start justify-between">
                          <span className="font-mono text-base font-bold text-foreground">{room.number}</span>
                          {p === 'high' && <Badge tone="bad">{t('Arrival today', 'Arrivée')}</Badge>}
                          {p === 'medium' && <Badge tone="warn">{t('Likely needed', 'Probable')}</Badge>}
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted">{room.type} · {t('floor', 'niv.')} {room.floor}{st === 'maint' ? ` · ${t('A/C repair', 'Réparation clim')}` : ''}</p>
                      </div>
                      {(st === 'todo' || st === 'progress') && (
                        <select value={who[room.id] ?? ''} onChange={(e) => setWho({ ...who, [room.id]: e.target.value })} className="mt-2 h-7 w-full rounded-lg border bg-surface-2 px-2 text-[11px] text-foreground" aria-label={t('Assign cleaner', 'Assigner')}>
                          <option value="">{t('Unassigned', 'Non assignée')}</option>
                          {CLEANERS.map((c) => <option key={c}>{c}</option>)}
                        </select>
                      )}
                      {st === 'inspect' && <p className="mt-2 text-[11px] text-muted">{t('Cleaned by', 'Nettoyée par')} {who[room.id] ?? '—'}</p>}
                      {next[st] && (st !== 'inspect' || supervisor) && (
                        <button onClick={() => move(room, next[st]!)} className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border py-1.5 text-[11px] font-semibold text-foreground hover:bg-accent-soft">
                          {t(nextLabel[st].en, nextLabel[st].fr)} <ArrowRight className="size-3" />
                        </button>
                      )}
                      {st === 'ready' && <p className="mt-1 text-[11px] text-ok">{t('Clean · ready to sell', 'Propre · prête')}</p>}
                    </motion.div>
                  );
                })}
                {!rooms.length && <p className="px-2 py-6 text-center text-[11px] text-muted">{t('Drop rooms here', 'Déposez ici')}</p>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted">
        {t('Occupied rooms (stay-over service on request):', 'Chambres occupées (recouche sur demande) :')} {store.rooms.filter((r) => r.status === 'occupied' || r.status === 'reserved').map((r) => r.number).join(', ') || '—'}
      </p>
    </div>
  );
}

function LostFound() {
  const { t, lang } = useLanguage();
  const store = useStore();
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [f, setF] = useState({ room: '', desc: '' });
  const list = store.lost.filter((l) => !q || `${l.room} ${l.en} ${l.fr}`.toLowerCase().includes(q.toLowerCase()));
  const tone = { stored: 'warn', claimed: 'ok', disposed: 'neutral' } as const;
  return (
    <Card>
      <CardHeader
        icon={<Search />}
        title={t('Lost & found', 'Objets trouvés')}
        subtitle={t('Items are kept 30 days', 'Objets conservés 30 jours')}
        action={<Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus /> {t('Log item', 'Ajouter')}</Button>}
      />
      <div className="px-5 pt-3"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search by room or item…', 'Chambre ou objet…')} className="h-9" /></div>
      <div className="space-y-1.5 p-4">
        {list.map((l) => (
          <div key={l.id} className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-xs">
            <span className="font-mono font-bold text-foreground">{l.room}</span>
            <div className="min-w-0 flex-1"><p className="truncate font-semibold text-foreground">{t(l.en, l.fr)}</p><p className="text-muted">{fmtDate(l.found, lang)} · {l.by}</p></div>
            <Badge tone={tone[l.status]}>{l.status === 'stored' ? t('Stored', 'Conservé') : l.status === 'claimed' ? t('Returned', 'Rendu') : t('Disposed', 'Éliminé')}</Badge>
            {l.status === 'stored' && <button className="font-semibold text-gold-600 hover:underline dark:text-gold-300" onClick={() => { store.dispatch({ type: 'lost', id: l.id, status: 'claimed' }); toast.success(t('Marked as returned', 'Marqué comme rendu')); }}>{t('Return', 'Rendre')}</button>}
          </div>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={t('Log found item', 'Enregistrer un objet')}>
          <div className="grid gap-3 p-6 sm:grid-cols-[120px_1fr]">
            <Field label={t('Room', 'Chambre')}><Select value={f.room} onChange={(e) => setF({ ...f, room: e.target.value })}><option value="">—</option>{store.rooms.map((r) => <option key={r.id}>{r.number}</option>)}<option>{t('Common area', 'Parties communes')}</option></Select></Field>
            <Field label={t('Description', 'Description')}><Input value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} placeholder={t('e.g. blue cap, child’s toy…', 'ex. casquette bleue, jouet…')} /></Field>
          </div>
          <div className="flex justify-end gap-2 border-t bg-surface-2 px-6 py-3">
            <Button
              disabled={!f.room || f.desc.length < 3}
              onClick={() => {
                const item: LostItem = { id: `LF${Date.now()}`, found: new Date(), room: f.room, en: f.desc, fr: f.desc, by: session?.name ?? '—', status: 'stored' };
                store.dispatch({ type: 'lost-add', item });
                // guest match hint
                const res = store.reservations.find((r) => store.room(r.roomId)?.number === f.room && r.status === 'checked-out');
                toast.success(t('Item logged', 'Objet enregistré'), { description: res ? t(`Last guest: ${store.guest(res.guestId)?.name} — WhatsApp sent`, `Dernier client : ${store.guest(res.guestId)?.name} — WhatsApp envoyé`) : undefined });
                setF({ room: '', desc: '' });
                setOpen(false);
              }}
            >
              {t('Save', 'Enregistrer')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Inventory() {
  const { t } = useLanguage();
  const store = useStore();
  return (
    <Card>
      <CardHeader icon={<PackagePlus />} title={t('Linen & supplies', 'Linge & fournitures')} subtitle={t('Bar = stock vs par level · days left at current usage', 'Barre = stock vs niveau cible · jours restants')} />
      <div className="space-y-3 p-5">
        {store.stock.map((s) => {
          const pct = Math.min(100, (s.qty / s.par) * 100);
          const days = Math.floor(s.qty / s.usePerDay);
          const low = pct < 40;
          return (
            <div key={s.id}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">{t(s.en, s.fr)}</span>
                <span className="flex items-center gap-2 tabular">
                  <span className={cn(low ? 'font-bold text-bad' : 'text-muted')}>{s.qty}/{s.par} {s.unit}</span>
                  <span className={cn('text-[11px]', days <= 3 ? 'text-bad' : 'text-muted')}>~{days} {t('d', 'j')}</span>
                  <button className="rounded-md border px-1.5 py-0.5 text-[10px] font-bold text-foreground hover:bg-accent-soft" onClick={() => { store.dispatch({ type: 'stock', id: s.id, delta: s.par - s.qty > 0 ? s.par - s.qty : 10 }); toast.success(t(`Restocked ${s.en}`, `${s.fr} réapprovisionné`)); }}>
                    {t('Restock', 'Réappro.')}
                  </button>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2"><motion.div animate={{ width: `${pct}%` }} className={cn('h-full rounded-full', low ? 'bg-bad' : pct < 70 ? 'bg-warn' : 'bg-ok')} /></div>
            </div>
          );
        })}
        {store.stock.some((s) => s.qty / s.par < 0.4) && (
          <p className="flex items-start gap-2 rounded-xl bg-ai-soft px-3 py-2 text-xs text-foreground"><Sparkles className="mt-0.5 size-3.5 text-ai" /> {t('AI: weekend occupancy forecast is high — order towels and soap kits before Friday.', 'IA : forte occupation prévue ce week-end — commandez serviettes et kits avant vendredi.')}</p>
        )}
      </div>
    </Card>
  );
}

function Performance() {
  const { t, lang } = useLanguage();
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return fmtDate(d, lang, 'EEE'); });
  const data = days.map((d, i) => ({ d, ...Object.fromEntries(cleanerStats.map((c) => [c.name, c.rooms[i]])) }));
  const colors = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];
  return (
    <Card>
      <CardHeader icon={<ClipboardCheck />} title={t('Team performance', 'Performance de l’équipe')} subtitle={t('Rooms cleaned per shift, last 7 days', 'Chambres nettoyées par service, 7 derniers jours')} />
      <div className="flex flex-wrap gap-4 px-5 pt-3 text-[11px] font-semibold text-muted">
        {cleanerStats.map((c, i) => <span key={c.name} className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: colors[i] }} />{c.name}</span>)}
      </div>
      <div className="h-[200px] px-2 pt-2">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="d" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} allowDecimals={false} />
            <Tooltip cursor={{ fill: 'var(--accent-soft)' }} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
            {cleanerStats.map((c, i) => <Bar key={c.name} dataKey={c.name} fill={colors[i]} radius={[4, 4, 0, 0]} maxBarSize={14} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="mx-2 mb-3 w-[calc(100%-16px)] text-xs">
        <thead><tr><th className={th}>{t('Staff', 'Agent')}</th><th className={cn(th, 'text-right')}>{t('Rooms (7d)', 'Chambres (7j)')}</th><th className={cn(th, 'text-right')}>{t('Avg time', 'Temps moyen')}</th><th className={cn(th, 'text-right')}>{t('Inspection score', 'Note inspection')}</th></tr></thead>
        <tbody>
          {cleanerStats.map((c) => (
            <tr key={c.name} className="border-t">
              <td className={cn(td, 'py-2')}><span className="flex items-center gap-2"><Avatar name={c.name} size={24} /><span className="font-semibold text-foreground">{c.name}</span></span></td>
              <td className={cn(td, 'py-2 text-right tabular')}>{c.rooms.reduce((a, b) => a + b, 0)}</td>
              <td className={cn(td, 'py-2 text-right tabular')}>{c.avgMin} min</td>
              <td className={cn(td, 'py-2 text-right font-semibold tabular text-foreground')}>{c.score.toFixed(1)} / 5</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export default function HousekeepingPage() {
  const { t } = useLanguage();
  const store = useStore();
  const [tab, setTab] = useState<'board' | 'ops'>('board');
  const dirty = store.rooms.filter((r) => r.status === 'dirty').length;
  const maint = store.rooms.filter((r) => r.status === 'maintenance').length;
  const ready = store.rooms.filter((r) => r.status === 'available').length;
  const lowStock = store.stock.filter((s) => s.qty / s.par < 0.4).length;

  const exportCsv = () => {
    downloadCsv(`housekeeping-${fmtDate(today(), 'en', 'yyyy-MM-dd')}.csv`, [
      ['Room', 'Type', 'Floor', 'Status'],
      ...store.rooms.map((r) => [r.number, r.type, r.floor, r.status]),
      [],
      ['Item', 'Qty', 'Par', 'Unit'],
      ...store.stock.map((s) => [s.en, s.qty, s.par, s.unit]),
    ]);
    toast.success(t('Housekeeping report exported', 'Rapport exporté'));
  };

  return (
    <AppShell
      title={t('Housekeeping', 'Housekeeping')}
      subtitle={t('Synced live with the front desk and room map', 'Synchronisé en direct avec l’accueil et le plan')}
      actions={
        <>
          <Segmented value={tab} onChange={setTab} options={[{ value: 'board', label: t('Status board', 'Tableau') }, { value: 'ops', label: t('Supplies & team', 'Stock & équipe') }]} />
          <Button variant="outline" size="sm" onClick={exportCsv}><Download /> CSV</Button>
        </>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={<span className="flex items-center gap-1.5"><Sprout className="size-3.5" /> {t('To clean', 'À nettoyer')}</span>} value={dirty} tone={dirty ? 'warn' : 'ok'} />
        <Stat label={<span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5" /> {t('Ready to sell', 'Prêtes')}</span>} value={ready} tone="ok" />
        <Stat label={<span className="flex items-center gap-1.5"><Wrench className="size-3.5" /> {t('Maintenance', 'Maintenance')}</span>} value={maint} tone={maint ? 'bad' : undefined} />
        <Stat label={<span className="flex items-center gap-1.5"><AlertTriangle className="size-3.5" /> {t('Low stock items', 'Stocks bas')}</span>} value={lowStock} tone={lowStock ? 'bad' : 'ok'} />
      </div>
      {tab === 'board' ? (
        <div className="space-y-5">
          <Board />
          <LostFound />
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <Inventory />
          <Performance />
        </div>
      )}
    </AppShell>
  );
}
