import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { differenceInCalendarDays, isSameDay } from 'date-fns';
import { motion } from 'motion/react';
import {
  Activity, BedDouble, CalendarCheck, CalendarPlus, CheckCircle2, Clock, Coins, Crown, KeyRound, LogIn, LogOut, Percent, Play,
  ShieldCheck, Sparkles, Sun, Users, Wrench, Bus, Utensils, Anchor, Wifi, MessageSquareText,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { ActivityFeed, FrontDesk, Kpi, PaymentMixCard, RevenueChart, RoomStrip } from '@/components/dashboard/widgets';
import { ForecastWhatIf } from '@/components/dashboard/ForecastWhatIf';
import { useAI } from '@/components/ai/AIContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResStatusBadge, RoomStatusBadge } from '@/components/ui/status';
import { useLanguage } from '@/context/LanguageContext';
import { ROLE_LABEL, useSession } from '@/context/SessionContext';
import { resTotal, useStore } from '@/data/store';
import { MODEL_INFO, revenueByMonth } from '@/data/seed';
import { tierOf } from '@/lib/loyalty';
import { compact, fcfa, fmtDate, nights, today } from '@/lib/utils';

function greeting(t: (en: string, fr: string) => string) {
  const h = new Date().getHours();
  return h < 12 ? t('Good morning', 'Bonjour') : h < 18 ? t('Good afternoon', 'Bon après-midi') : t('Good evening', 'Bonsoir');
}

function useOpsKpis() {
  const { rooms, reservations } = useStore();
  const occupied = rooms.filter((r) => r.status === 'occupied').length;
  const occ = (occupied / rooms.length) * 100;
  const inHouse = reservations.filter((r) => r.status === 'checked-in');
  const adr = inHouse.length ? inHouse.reduce((s, r) => s + (rooms.find((x) => x.id === r.roomId)?.price ?? 0), 0) / inHouse.length : 0;
  const revpar = (adr * occupied) / rooms.length;
  const arrivals = reservations.filter((r) => r.status !== 'cancelled' && isSameDay(r.checkIn, today()));
  const departures = reservations.filter((r) => r.status !== 'cancelled' && isSameDay(r.checkOut, today()));
  return { occ, adr, revpar, arrivals, departures, dirty: rooms.filter((r) => r.status === 'dirty').length };
}

/* ───────────────────────────── Guest ───────────────────────────── */
function GuestView() {
  const { t, lang } = useLanguage();
  const { session } = useSession();
  const store = useStore();
  const { setBookingOpen, setCopilotOpen } = useAI();
  const mine = store.reservations.filter((r) => r.guestId === session?.guestId && r.status !== 'cancelled').sort((a, b) => +a.checkIn - +b.checkIn);
  const current = mine.find((r) => r.status === 'checked-in');
  const upcoming = mine.filter((r) => r.checkIn > today() && r.status !== 'checked-out');
  const guest = store.guest(session?.guestId ?? '');
  const room = store.room(current?.roomId ?? null);
  const total = current ? resTotal(current, store.rooms) : 0;
  const pts = guest?.loyalty ?? 0;
  const tier = tierOf(pts);
  const tierMax = tier.next ?? pts;

  const services = [
    { icon: Clock, en: 'Late checkout', fr: 'Départ tardif' },
    { icon: Sparkles, en: 'Room cleaning', fr: 'Ménage' },
    { icon: Bus, en: 'Shuttle seat', fr: 'Place navette' },
    { icon: Utensils, en: 'Dinner table', fr: 'Table au dîner' },
    { icon: Anchor, en: 'Boat tour', fr: 'Balade bateau' },
    { icon: MessageSquareText, en: 'Talk to reception', fr: 'Contacter l’accueil' },
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      {current && room ? (
        <Card className="relative overflow-hidden bg-forest-800 text-cream-50 xl:col-span-2 dark:bg-forest-900">
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-gold-500/20 blur-3xl" />
          <div className="relative grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:p-8">
            <div>
              <Badge tone="gold" className="bg-gold-500/20 text-gold-300">{t('Current stay', 'Séjour en cours')} · {current.ref}</Badge>
              <p className="mt-4 font-display text-4xl font-semibold">{t('Room', 'Chambre')} {room.number}</p>
              <p className="mt-1 text-sm text-cream-100/70">{room.type} · {t(room.view!.en, room.view!.fr)} · {t('floor', 'niveau')} {room.floor}</p>
              <div className="mt-6 flex flex-wrap gap-6 text-sm">
                <div><p className="text-[11px] uppercase tracking-wider text-cream-100/50">{t('Arrived', 'Arrivée')}</p><p className="font-semibold">{fmtDate(current.checkIn, lang, 'EEE d MMM')}</p></div>
                <div><p className="text-[11px] uppercase tracking-wider text-cream-100/50">{t('Departure', 'Départ')}</p><p className="font-semibold">{fmtDate(current.checkOut, lang, 'EEE d MMM')} · 12:00</p></div>
                <div><p className="text-[11px] uppercase tracking-wider text-cream-100/50">{t('Wi-Fi', 'Wi-Fi')}</p><p className="flex items-center gap-1.5 font-mono font-semibold"><Wifi className="size-3.5" /> LePhilo-Guest</p></div>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => toast.success(t('Door unlocked 🔓', 'Porte déverrouillée 🔓'))}
              className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-gold-500/30 bg-gold-500/10 px-8 py-6 text-gold-300"
            >
              <span className="pulse-ring grid size-16 place-items-center rounded-full bg-gold-500 text-forest-900"><KeyRound className="size-7" /></span>
              <span className="text-xs font-bold uppercase tracking-wider">{t('Digital key', 'Clé digitale')}</span>
            </motion.button>
          </div>
          <div className="relative flex items-center gap-3 border-t border-gold-500/15 px-6 py-3 text-xs text-cream-100/75 sm:px-8">
            <Sun className="size-4 text-gold-300" />
            {t(`${differenceInCalendarDays(current.checkOut, today())} night(s) left · Note: ${current.note ?? 'none'}`, `${differenceInCalendarDays(current.checkOut, today())} nuit(s) restante(s) · Note : ${current.note ?? 'aucune'}`)}
          </div>
        </Card>
      ) : (
        <Card className="grid place-items-center p-10 text-center xl:col-span-2">
          <p className="font-display text-2xl text-ink">{t('No stay in progress', 'Aucun séjour en cours')}</p>
          <Button className="mt-4" onClick={() => setBookingOpen(true)}><CalendarPlus /> {t('Book a stay', 'Réserver')}</Button>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted">{t('Le Philo Club', 'Club Le Philo')}</p>
          <Badge tone="gold"><Crown className="size-3" /> {t(tier.en, tier.fr)}</Badge>
        </div>
        <div className="relative mx-auto mt-4 size-36">
          <svg viewBox="0 0 100 100" className="-rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="8" />
            <motion.circle cx="50" cy="50" r="42" fill="none" stroke="var(--gold-500)" strokeWidth="8" strokeLinecap="round" strokeDasharray={264} initial={{ strokeDashoffset: 264 }} animate={{ strokeDashoffset: 264 * (1 - pts / tierMax) }} transition={{ duration: 1.2, ease: 'easeOut' }} />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div><p className="text-2xl font-bold text-foreground tabular">{pts}</p><p className="text-[10px] text-muted">{t('points', 'points')}</p></div>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-muted">{tier.next ? t(`${tierMax - pts} pts to the next tier`, `${tierMax - pts} pts avant le niveau suivant`) : t('Top tier reached 🎉', 'Niveau maximum atteint 🎉')}</p>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader icon={<Sparkles />} title={t('Request a service', 'Demander un service')} subtitle={t('Handled by reception in minutes', 'Traité par l’accueil en quelques minutes')} />
        <div className="grid grid-cols-2 gap-2 p-5 sm:grid-cols-3">
          {services.map((s) => (
            <button key={s.en} onClick={() => (s.en.startsWith('Talk') ? setCopilotOpen(true) : toast.success(t(`Request sent: ${s.en}`, `Demande envoyée : ${s.fr}`)))} className="flex items-center gap-3 rounded-xl border px-3 py-3 text-left text-[13px] font-semibold text-foreground transition-colors hover:border-gold-500 hover:bg-accent-soft">
              <span className="grid size-9 place-items-center rounded-lg bg-surface-2 text-ink"><s.icon className="size-4" /></span>
              {t(s.en, s.fr)}
            </button>
          ))}
        </div>
      </Card>

      {current && <Card>
        <CardHeader icon={<Coins />} title={t('My bill', 'Ma facture')} subtitle={current?.ref} />
        <div className="p-5">
          <div className="flex items-end justify-between">
            <div><p className="text-[11px] text-muted">{t('Paid', 'Payé')}</p><p className="text-xl font-bold text-foreground tabular">{fcfa(current?.paid ?? 0)}</p></div>
            <div className="text-right"><p className="text-[11px] text-muted">{t('Total', 'Total')}</p><p className="text-sm font-semibold text-muted tabular">{fcfa(total)}</p></div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-ok" style={{ width: `${total ? Math.min(100, ((current?.paid ?? 0) / total) * 100) : 0}%` }} />
          </div>
          <Badge tone={current && current.paid >= total ? 'ok' : 'warn'} className="mt-3">{current && current.paid >= total ? t('Fully paid', 'Soldé') : t('Balance due at checkout', 'Solde au départ')}</Badge>
        </div>
      </Card>}

      <Card className="xl:col-span-3">
        <CardHeader icon={<CalendarCheck />} title={t('Upcoming stays', 'Séjours à venir')} action={<Button size="sm" variant="outline" onClick={() => setBookingOpen(true)}><CalendarPlus /> {t('New', 'Nouveau')}</Button>} />
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((r) => (
            <div key={r.id} className="rounded-2xl border bg-surface-2 p-4">
              <div className="flex items-center justify-between"><span className="font-mono text-xs text-muted">{r.ref}</span><ResStatusBadge status={r.status} /></div>
              <p className="mt-2 font-semibold text-foreground">{fmtDate(r.checkIn, lang, 'EEE d MMM')} → {fmtDate(r.checkOut, lang, 'EEE d MMM')}</p>
              <p className="text-xs text-muted">{r.roomType} · {nights(r.checkIn, r.checkOut)} {t('nights', 'nuits')} · {fcfa(resTotal(r, store.rooms))}</p>
              <p className="mt-2 text-[11px] font-semibold text-gold-600 dark:text-gold-300">{t(`In ${differenceInCalendarDays(r.checkIn, today())} days`, `Dans ${differenceInCalendarDays(r.checkIn, today())} jours`)}</p>
            </div>
          ))}
          {!upcoming.length && <p className="text-sm text-muted">{t('Nothing booked yet.', 'Aucune réservation.')}</p>}
        </div>
      </Card>
    </div>
  );
}

/* ───────────────────────────── Receptionist ───────────────────────────── */
function ReceptionView() {
  const { t } = useLanguage();
  const k = useOpsKpis();
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label={t('Occupancy now', 'Occupation')} value={k.occ} format={(n) => `${n.toFixed(0)}%`} icon={<Percent />} hint={t('12 rooms', '12 chambres')} />
        <Kpi label={t('Arrivals today', 'Arrivées')} value={k.arrivals.length} icon={<LogIn />} hint={t(`${k.arrivals.filter((r) => r.status === 'checked-in').length} done`, `${k.arrivals.filter((r) => r.status === 'checked-in').length} faites`)} />
        <Kpi label={t('Departures today', 'Départs')} value={k.departures.length} icon={<LogOut />} />
        <Kpi label={t('Rooms to clean', 'À nettoyer')} value={k.dirty} icon={<Sparkles />} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <FrontDesk />
        <RoomStrip />
      </div>
      <ActivityFeed />
    </div>
  );
}

/* ───────────────────────────── Housekeeping ───────────────────────────── */
function HousekeepingView() {
  const { t } = useLanguage();
  const store = useStore();
  const [inProgress, setInProgress] = useState<string[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const queue = store.rooms.filter((r) => r.status === 'dirty' || r.status === 'maintenance');
  const stayovers = store.rooms.filter((r) => r.status === 'occupied');
  const arrivalsToday = store.reservations.filter((r) => isSameDay(r.checkIn, today()) && r.status !== 'cancelled').map((r) => r.roomId);
  const total = queue.length + doneCount;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <Card>
        <CardHeader icon={<Sparkles />} title={t('My task queue', 'Mes tâches')} subtitle={t('AI-prioritised: rooms with arrivals today first', 'Priorisé par l’IA : chambres avec arrivée en premier')} />
        <div className="space-y-2 p-4">
          {queue
            .sort((a, b) => Number(arrivalsToday.includes(b.id)) - Number(arrivalsToday.includes(a.id)))
            .map((r) => {
              const busy = inProgress.includes(r.id);
              const priority = arrivalsToday.includes(r.id);
              return (
                <motion.div layout key={r.id} className="flex items-center gap-3 rounded-2xl border p-3">
                  <div className="grid size-12 place-items-center rounded-xl bg-surface-2 font-bold text-foreground tabular">{r.number}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <RoomStatusBadge status={r.status} />
                      {priority && <Badge tone="bad">{t('Arrival today', 'Arrivée aujourd’hui')}</Badge>}
                      {busy && <Badge tone="info">{t('In progress', 'En cours')}</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted">{r.type} · {t('floor', 'niveau')} {r.floor} · {r.status === 'maintenance' ? t('A/C repair', 'Réparation clim') : t('Full turnover · ~35 min', 'Remise à blanc · ~35 min')}</p>
                  </div>
                  {r.status === 'maintenance' ? (
                    <Button size="sm" variant="outline" onClick={() => { store.dispatch({ type: 'room', roomId: r.id, status: 'dirty' }); toast(t('Repair logged — room needs cleaning', 'Réparation notée — chambre à nettoyer')); }}><Wrench /> {t('Fixed', 'Réparé')}</Button>
                  ) : busy ? (
                    <Button size="sm" variant="primary" onClick={() => { store.dispatch({ type: 'room', roomId: r.id, status: 'available' }); setInProgress(inProgress.filter((x) => x !== r.id)); setDoneCount(doneCount + 1); toast.success(t(`Room ${r.number} ready — reception notified`, `Chambre ${r.number} prête — accueil prévenu`)); }}><CheckCircle2 /> {t('Done', 'Terminé')}</Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setInProgress([...inProgress, r.id])}><Play /> {t('Start', 'Commencer')}</Button>
                  )}
                </motion.div>
              );
            })}
          {!queue.length && <p className="py-10 text-center text-sm text-muted">{t('All clear — great job! ✨', 'Tout est propre — bravo ! ✨')}</p>}
        </div>
      </Card>
      <div className="space-y-5">
        <Card className="p-5">
          <p className="text-xs font-semibold text-muted">{t('Shift progress', 'Progression')}</p>
          <p className="mt-2 text-3xl font-bold text-foreground tabular">{doneCount}<span className="text-lg text-muted">/{total}</span></p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2"><motion.div className="h-full rounded-full bg-ok" animate={{ width: `${total ? (doneCount / total) * 100 : 100}%` }} /></div>
        </Card>
        <Card>
          <CardHeader icon={<BedDouble />} title={t('Stay-over service', 'Service recouche')} subtitle={t('Occupied rooms · tidy if guest requests', 'Chambres occupées · sur demande')} />
          <div className="flex flex-wrap gap-2 p-5">
            {stayovers.map((r) => <Badge key={r.id} tone="info">{r.number}</Badge>)}
          </div>
        </Card>
        <RoomStrip />
      </div>
    </div>
  );
}

/* ───────────────────────────── Finance ───────────────────────────── */
function FinanceView() {
  const { t } = useLanguage();
  const store = useStore();
  const k = useOpsKpis();
  const open = store.reservations.filter((r) => r.status !== 'cancelled' && r.status !== 'checked-out').map((r) => ({ r, total: resTotal(r, store.rooms) }));
  const due = open.reduce((s, x) => s + Math.max(0, x.total - x.r.paid), 0);
  const month = revenueByMonth[revenueByMonth.length - 1];
  const prev = revenueByMonth[revenueByMonth.length - 2];
  const mtd = month.rooms + month.services;
  const growth = ((mtd - (prev.rooms + prev.services)) / (prev.rooms + prev.services)) * 100;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label={t('Revenue this month', 'CA du mois')} value={mtd} format={(n) => compact(n)} delta={growth} icon={<Coins />} hint="FCFA" spark={revenueByMonth.map((m) => m.rooms + m.services)} />
        <Kpi label="ADR" value={k.adr} format={(n) => compact(n)} icon={<BedDouble />} hint={t('avg rate', 'prix moyen')} />
        <Kpi label="RevPAR" value={k.revpar} format={(n) => compact(n)} icon={<Activity />} hint="FCFA" />
        <Kpi label={t('Outstanding', 'Impayés')} value={due} format={(n) => compact(n)} icon={<Clock />} hint={t(`${open.filter((x) => x.r.paid < x.total).length} folios`, `${open.filter((x) => x.r.paid < x.total).length} folios`)} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <RevenueChart />
        <PaymentMixCard />
      </div>
      <Card>
        <CardHeader icon={<Clock />} title={t('Balances to collect', 'Soldes à encaisser')} />
        <div className="overflow-x-auto p-3">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-wider text-muted"><tr><th className="px-3 py-2">{t('Guest', 'Client')}</th><th className="px-3 py-2">Ref</th><th className="px-3 py-2 text-right">{t('Total', 'Total')}</th><th className="px-3 py-2 text-right">{t('Paid', 'Payé')}</th><th className="px-3 py-2 text-right">{t('Due', 'Dû')}</th><th /></tr></thead>
            <tbody>
              {open.filter((x) => x.total > x.r.paid).sort((a, b) => (b.total - b.r.paid) - (a.total - a.r.paid)).slice(0, 6).map(({ r, total }) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2.5 font-semibold text-foreground">{store.guest(r.guestId)?.name}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted">{r.ref}</td>
                  <td className="px-3 py-2.5 text-right tabular">{fcfa(total)}</td>
                  <td className="px-3 py-2.5 text-right tabular text-muted">{fcfa(r.paid)}</td>
                  <td className="px-3 py-2.5 text-right font-bold tabular text-foreground">{fcfa(total - r.paid)}</td>
                  <td className="px-3 py-2.5 text-right"><Button size="sm" variant="outline" onClick={() => toast.success(t('Airtel/Moov payment link sent by SMS', 'Lien de paiement Airtel/Moov envoyé par SMS'))}>{t('Send link', 'Envoyer lien')}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <ForecastWhatIf />
    </div>
  );
}

/* ───────────────────────────── Manager / Admin ───────────────────────────── */
function ManagerView({ admin }: { admin?: boolean }) {
  const { t } = useLanguage();
  const k = useOpsKpis();
  const month = revenueByMonth[revenueByMonth.length - 1];
  const prev = revenueByMonth[revenueByMonth.length - 2];
  const mtd = month.rooms + month.services;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label={t('Occupancy now', 'Occupation')} value={k.occ} format={(n) => `${n.toFixed(0)}%`} icon={<Percent />} hint={t(`${Math.round((k.occ / 100) * 12)} of 12 rooms`, `${Math.round((k.occ / 100) * 12)} sur 12 chambres`)} />
        <Kpi label="ADR" value={k.adr} format={(n) => compact(n)} icon={<BedDouble />} hint={t('FCFA · in-house guests', 'FCFA · clients présents')} />
        <Kpi label="RevPAR" value={k.revpar} format={(n) => compact(n)} icon={<Activity />} hint="FCFA" />
        <Kpi label={t('Revenue this month', 'CA du mois')} value={mtd} format={(n) => compact(n)} delta={((mtd - prev.rooms - prev.services) / (prev.rooms + prev.services)) * 100} icon={<Coins />} spark={revenueByMonth.map((m) => m.rooms + m.services)} />
      </div>
      {admin && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi label={t('Active users', 'Utilisateurs actifs')} value={14} icon={<Users />} hint={t('6 staff · 8 guests', '6 personnel · 8 clients')} />
          <Kpi label={t('Forecast accuracy', 'Précision prévision')} value={MODEL_INFO.accuracy} format={(n) => `${n.toFixed(1)}%`} icon={<Sparkles />} />
          <Kpi label={t('Failed logins (24h)', 'Échecs connexion (24h)')} value={3} icon={<ShieldCheck />} hint={t('none locked', 'aucun blocage')} />
          <Kpi label={t('MFA coverage', 'Couverture MFA')} value={100} format={(n) => `${n.toFixed(0)}%`} icon={<KeyRound />} hint={t('all staff', 'tout le personnel')} />
        </div>
      )}
      <ForecastWhatIf />
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <RevenueChart />
        <RoomStrip />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <FrontDesk />
        <ActivityFeed />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t, lang } = useLanguage();
  const { session } = useSession();
  const { setBookingOpen, setCopilotOpen } = useAI();
  const location = useLocation();
  const role = session!.role;

  useEffect(() => {
    if (location.hash === '#whatif') setTimeout(() => document.getElementById('whatif')?.scrollIntoView({ behavior: 'smooth' }), 350);
  }, [location.hash]);

  const views = {
    guest: <GuestView />,
    receptionist: <ReceptionView />,
    housekeeping: <HousekeepingView />,
    finance: <FinanceView />,
    manager: <ManagerView />,
    admin: <ManagerView admin />,
  };

  return (
    <AppShell
      title={`${greeting(t)}, ${session!.name.split(' ')[0]}`}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          {fmtDate(new Date(), lang, 'EEEE d MMMM yyyy')} · {t(ROLE_LABEL[role].en, ROLE_LABEL[role].fr)}
        </span>
      }
      actions={
        <>
          <Button variant="ai" size="sm" onClick={() => setCopilotOpen(true)}><Sparkles /> {t('Brief me', 'Résumé IA')}</Button>
          {(role === 'receptionist' || role === 'manager' || role === 'admin' || role === 'guest') && (
            <Button size="sm" onClick={() => setBookingOpen(true)}><CalendarPlus /> {t('New booking', 'Réserver')}</Button>
          )}
          {role === 'receptionist' && <Button size="sm" variant="outline" asChild><Link to="/rooms"><BedDouble /> {t('Room map', 'Plan')}</Link></Button>}
        </>
      }
    >
      {views[role]}
    </AppShell>
  );
}

