import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { format } from 'date-fns';
import { motion, useScroll, useTransform } from 'motion/react';
import {
  Anchor, ArrowRight, Bike, Bus, CalendarDays, Check, Flame, Mail, MapPin, Music, Phone, Sparkles, Ticket, Trophy, Users, Utensils, Wifi,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useSession } from '@/context/SessionContext';
import { availableRooms, useStore } from '@/data/store';
import { PACKAGES, type RoomType } from '@/data/seed';
import { useAI } from '@/components/ai/AIContext';
import { Button } from '@/components/ui/button';
import { SectionTitle } from '@/components/ui/misc';
import { Wordmark } from '@/components/Logo';
import { LangSwitch, ThemeSwitch } from '@/components/layout/AppShell';
import { cn, dayOffset, fcfa, nights } from '@/lib/utils';
import hero from '@/assets/hero.jpeg';
import packagesImg from '@/assets/packages.jpeg';
import evTombola from '@/assets/event-tombola.jpeg';
import evOpenDay from '@/assets/event-open-day.jpeg';
import evFathers from '@/assets/event-fathers-day.jpeg';
import evGourmand from '@/assets/event-gourmand.jpeg';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

const PKG_FEATURES: Record<string, { en: string; fr: string }[]> = {
  Solo: [
    { en: '2 nights, standard room', fr: '2 nuitées, chambre standard' },
    { en: 'Restaurant included', fr: 'Restauration' },
    { en: 'Return transport', fr: 'Transport aller/retour' },
    { en: 'Billiards & baby-foot', fr: 'Billard & baby-foot' },
  ],
  Duo: [
    { en: '2 nights for two', fr: '2 nuitées pour deux' },
    { en: 'Restaurant included', fr: 'Restauration' },
    { en: 'Return transport', fr: 'Transport aller/retour' },
    { en: 'Billiards & baby-foot', fr: 'Billard & baby-foot' },
  ],
  VIP: [
    { en: '2 nights, VIP room', fr: '2 nuitées, chambre VIP' },
    { en: 'Restaurant included', fr: 'Restauration' },
    { en: 'Return transport', fr: 'Transport aller/retour' },
    { en: 'Billiards & baby-foot', fr: 'Billard & baby-foot' },
  ],
};

const EXPERIENCES = [
  { icon: Utensils, en: 'Buffets', fr: 'Buffets', den: 'Gabonese & international', dfr: 'Gabonais & international' },
  { icon: Flame, en: 'Grills', fr: 'Grillades', den: 'Brochettes cooked before you', dfr: 'Brochettes cuites devant vous' },
  { icon: Anchor, en: 'Boat trips', fr: 'Balades en bateau', den: 'On the estuary', dfr: "Sur l'estuaire" },
  { icon: Bike, en: 'Quad rides', fr: 'Quad', den: 'Off-road excursions', dfr: 'Excursions tout-terrain' },
  { icon: Trophy, en: 'Billiards & baby-foot', fr: 'Billard & baby-foot', den: 'Free for guests', dfr: 'Gratuit pour les clients' },
  { icon: Music, en: 'Live concerts', fr: 'Concerts live', den: 'Local artists', dfr: 'Artistes locaux' },
  { icon: Ticket, en: 'Tombola', fr: 'Tombola', den: 'Prizes to win', dfr: 'Des lots à gagner' },
  { icon: Bus, en: 'Shuttle', fr: 'Navette', den: 'From Port-Gentil', dfr: 'Depuis Port-Gentil' },
];

const EVENTS = [
  { img: evTombola, en: 'Grand Tombola', fr: 'Grande Tombola', den: 'Ticket 2 500 FCFA · shuttles from CECADO Matanda', dfr: 'Ticket 2 500 FCFA · navettes depuis le CECADO Matanda' },
  { img: evGourmand, en: 'Food stands & live concert', fr: 'Stands gourmands & concert', den: 'Sandwiches, buffets, grills and live music', dfr: 'Sandwichs, buffets, grillades et concert live' },
  { img: evOpenDay, en: 'Open day', fr: 'Journée portes ouvertes', den: 'Bus 5 000 FCFA · buffet 10 000 FCFA', dfr: 'Bus 5 000 FCFA · buffet 10 000 FCFA' },
  { img: evFathers, en: "Father's Day", fr: 'Fête des pères', den: 'Buffet, quad, boat & transport — 49 990 FCFA', dfr: 'Buffet, quad, bateau & transport — 49 990 FCFA' },
];

function NavBar() {
  const { t } = useLanguage();
  const { session } = useSession();
  const { setBookingOpen } = useAI();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={cn('fixed inset-x-0 top-0 z-40 transition-all duration-300', scrolled ? 'border-b border-gold-500/15 bg-forest-900/85 py-3 backdrop-blur-xl' : 'py-5')}>
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="Auberge Le Philo"><Wordmark light compact={scrolled} /></Link>
        <nav className="ml-6 hidden items-center gap-6 text-[13px] font-medium text-cream-100/75 lg:flex">
          {[['#stays', t('Stays', 'Séjours')], ['#experiences', t('Experiences', 'Expériences')], ['#events', t('Events', 'Événements')], ['#visit', t('Getting here', 'Venir')]].map(([h, l]) => (
            <a key={h} href={h} className="transition-colors hover:text-gold-300">{l}</a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block"><LangSwitch light /></div>
          <ThemeSwitch light />
          <Link to={session ? '/dashboard' : '/login'} className="hidden rounded-xl px-3 py-2 text-[13px] font-semibold text-cream-100 hover:bg-cream-100/10 sm:block">
            {session ? t('My space', 'Mon espace') : t('Sign in', 'Connexion')}
          </Link>
          <Button variant="gold" size="sm" onClick={() => setBookingOpen(true)}>{t('Book now', 'Réserver')}</Button>
        </div>
      </div>
    </header>
  );
}

function AvailabilityBar() {
  const { t } = useLanguage();
  const { rooms, reservations } = useStore();
  const { setBookingOpen, ask } = useAI();
  const [ci, setCi] = useState(iso(dayOffset(1)));
  const [co, setCo] = useState(iso(dayOffset(3)));
  const [guests, setGuests] = useState(2);
  const [checked, setChecked] = useState(false);
  const [aiQ, setAiQ] = useState('');
  const from = new Date(ci + 'T00:00');
  const to = new Date(co + 'T00:00');
  const n = nights(from, to);
  const free = n > 0 ? availableRooms(rooms, reservations, from, to).filter((r) => r.capacity >= guests) : [];
  const types: RoomType[] = ['Solo', 'Duo', 'VIP', 'Standard'];

  return (
    <div className="glass rounded-3xl border border-cream-100/15 p-2 shadow-pop dark:border-gold-500/15">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_120px_auto]">
        {[
          { l: t('Arrival', 'Arrivée'), v: ci, set: setCi, min: iso(dayOffset(0)) },
          { l: t('Departure', 'Départ'), v: co, set: setCo, min: ci },
        ].map((f) => (
          <label key={f.l} className="rounded-2xl bg-surface px-4 py-2.5">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted"><CalendarDays className="size-3" /> {f.l}</span>
            <input type="date" value={f.v} min={f.min} onChange={(e) => { f.set(e.target.value); setChecked(false); }} className="mt-0.5 w-full bg-transparent text-sm font-semibold text-foreground outline-none" />
          </label>
        ))}
        <label className="rounded-2xl bg-surface px-4 py-2.5">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted"><Users className="size-3" /> {t('Guests', 'Pers.')}</span>
          <select value={guests} onChange={(e) => { setGuests(+e.target.value); setChecked(false); }} className="mt-0.5 w-full bg-transparent text-sm font-semibold text-foreground outline-none">
            {[1, 2, 3].map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        <Button variant="gold" size="lg" className="h-auto min-h-12 rounded-2xl" onClick={() => setChecked(true)} disabled={n <= 0}>
          {t('Check availability', 'Disponibilités')}
        </Button>
      </div>

      {checked && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
          <div className="grid gap-2 px-1 pb-1 pt-2 sm:grid-cols-4">
            {types.map((tp) => {
              const left = free.filter((r) => r.type === tp).length;
              const price = rooms.find((r) => r.type === tp)!.price;
              return (
                <button key={tp} disabled={!left} onClick={() => setBookingOpen(true)} className="rounded-2xl bg-surface px-4 py-3 text-left transition-transform hover:-translate-y-0.5 disabled:opacity-50">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{tp}</span>
                    <span className={cn('text-[11px] font-semibold', !left ? 'text-bad' : left <= 1 ? 'text-warn' : 'text-ok')}>{left ? `${left} ${t('left', 'libre(s)')}` : t('Full', 'Complet')}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted tabular">{fcfa(price * n)} · {n} {t('nights', 'nuits')}</div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); if (aiQ.trim()) { ask(aiQ); setAiQ(''); } }}
        className="mt-2 flex items-center gap-2 rounded-2xl bg-surface/60 px-3 py-1.5"
      >
        <Sparkles className="size-4 shrink-0 text-ai" />
        <input value={aiQ} onChange={(e) => setAiQ(e.target.value)} placeholder={t('Or just ask: “a quiet room for 2 this weekend with a boat trip”', 'Ou demandez : « une chambre calme pour 2 ce week-end avec balade en bateau »')} className="h-9 min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted" />
        <button className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-ai hover:bg-ai-soft">{t('Ask AI', 'Demander')}</button>
      </form>
    </div>
  );
}

export default function LandingPage() {
  const { t } = useLanguage();
  const { setBookingOpen, setCopilotOpen } = useAI();
  const { scrollY } = useScroll();
  const imgY = useTransform(scrollY, [0, 600], [0, 80]);

  return (
    <div className="bg-background">
      <NavBar />

      {/* HERO */}
      <section className="grain relative overflow-hidden bg-forest-900 pb-20 pt-32 lg:pb-28 lg:pt-40">
        <div className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full bg-gold-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 size-[420px] rounded-full bg-forest-500/30 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-start gap-12 px-4 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:px-8">
          <div>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gold-300">
              <MapPin className="size-3" /> Ozouri · 37 km {t('from', 'de')} Port-Gentil
            </motion.p>
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="font-display text-[44px] font-semibold leading-[1.02] text-cream-50 sm:text-6xl lg:text-7xl">
              {t('Live an', 'Vivez un')} <em className="font-medium text-gold-300">{t('unforgettable', 'séjour')}</em>
              <br />
              {t('stay.', 'inoubliable.')}
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="mt-6 max-w-lg text-base leading-relaxed text-cream-100/70">
              {t(
                'Rooms, buffets, quad rides and boat trips on the estuary — book in seconds and let our AI assistant plan the rest.',
                'Chambres, buffets, quad et balades sur l’estuaire — réservez en quelques secondes et laissez notre assistant IA organiser le reste.',
              )}
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="mt-8">
              <AvailabilityBar />
            </motion.div>
          </div>

          <motion.div style={{ y: imgY }} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.6 }} className="relative hidden lg:block">
            <div className="overflow-hidden rounded-[32px] border border-gold-500/25 shadow-pop">
              <img src={packagesImg} alt={t('Le Philo stay packages', 'Forfaits séjour Le Philo')} className="h-[520px] w-full object-cover object-top" />
            </div>
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }} className="glass absolute -left-10 top-16 rounded-2xl border px-4 py-3 shadow-pop">
              <div className="flex items-center gap-2 text-[11px] font-bold text-ai"><Sparkles className="size-3.5" /> {t('AI forecast', 'Prévision IA')}</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{t('This weekend is filling fast', 'Ce week-end se remplit vite')}</div>
            </motion.div>
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }} className="glass absolute -right-6 bottom-20 flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-pop">
              <div className="grid size-9 place-items-center rounded-xl bg-ok-soft text-ok"><Check className="size-4" /></div>
              <div>
                <div className="text-sm font-semibold text-foreground">Airtel · Moov Money</div>
                <div className="text-[11px] text-muted">{t('Pay from your phone', 'Payez depuis votre téléphone')}</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* STAYS */}
      <section id="stays" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionTitle eyebrow={t('Our stays', 'Nos séjours')} title={t('2-night getaways, all inclusive', 'Escapades 2 nuits, tout compris')} />
          <p className="max-w-sm text-sm text-muted">{t('Reservation only. Prices include tax.', 'Sur réservation uniquement. Prix TTC.')}</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {PACKAGES.map((p, i) => {
            const featured = p.type === 'Duo';
            return (
              <motion.div
                key={p.type}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -6 }}
                className={cn('relative flex flex-col rounded-3xl border p-7 shadow-card', featured ? 'bg-forest-800 text-cream-50 dark:bg-forest-700/40' : 'bg-surface')}
              >
                {featured && <span className="absolute -top-3 left-7 rounded-full bg-gold-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-forest-900">{t('Most booked', 'Le plus réservé')}</span>}
                <p className={cn('text-[11px] font-bold uppercase tracking-[0.18em]', featured ? 'text-gold-300' : 'text-gold-600 dark:text-gold-300')}>{t(p.en, p.fr)}</p>
                <p className={cn('mt-3 font-display text-4xl font-semibold tabular', featured ? 'text-cream-50' : 'text-ink')}>
                  {fcfa(p.price, false)} <span className="font-sans text-sm font-semibold opacity-60">FCFA</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {PKG_FEATURES[p.type].map((f) => (
                    <li key={f.en} className="flex items-center gap-2.5">
                      <span className={cn('grid size-5 place-items-center rounded-full', featured ? 'bg-gold-500/20 text-gold-300' : 'bg-ok-soft text-ok')}><Check className="size-3" /></span>
                      <span className={featured ? 'text-cream-100/85' : 'text-foreground'}>{t(f.en, f.fr)}</span>
                    </li>
                  ))}
                </ul>
                <Button variant={featured ? 'gold' : 'outline'} className="mt-7 w-full" onClick={() => setBookingOpen(true)}>
                  {t('Book this stay', 'Réserver')} <ArrowRight />
                </Button>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* EXPERIENCES */}
      <section id="experiences" className="grain relative bg-forest-900 py-24">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionTitle light eyebrow={t('Activities & leisure', 'Activités & loisirs')} title={t('More than a place to sleep', 'Bien plus qu’un lieu où dormir')} />
          <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4">
            {EXPERIENCES.map((e, i) => (
              <motion.div
                key={e.en}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="group rounded-2xl border border-gold-500/15 bg-cream-100/[0.04] p-5 transition-colors hover:border-gold-500/40 hover:bg-gold-500/10"
              >
                <div className="grid size-11 place-items-center rounded-xl bg-gold-500/15 text-gold-300 transition-transform group-hover:scale-110"><e.icon className="size-5" /></div>
                <p className="mt-4 font-semibold text-cream-50">{t(e.en, e.fr)}</p>
                <p className="mt-0.5 text-xs text-cream-100/55">{t(e.den, e.dfr)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* EVENTS */}
      <section id="events" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <SectionTitle eyebrow={t('Agenda', 'Agenda')} title={t('Events at Le Philo', 'Événements au Philo')} />
        <div className="-mx-4 mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 scrollbar-thin sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
          {EVENTS.map((ev, i) => (
            <motion.article key={ev.en} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="group w-[72vw] shrink-0 snap-start sm:w-auto">
              <div className="overflow-hidden rounded-3xl border shadow-card">
                <img src={ev.img} alt={t(ev.en, ev.fr)} loading="lazy" className="aspect-[2/3] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <h3 className="mt-4 font-sans text-base font-bold text-foreground">{t(ev.en, ev.fr)}</h3>
              <p className="mt-1 text-xs text-muted">{t(ev.den, ev.dfr)}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* VISIT */}
      <section id="visit" className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="grid overflow-hidden rounded-[32px] border bg-surface shadow-card lg:grid-cols-2">
          <div className="relative min-h-[260px]">
            <img src={hero} alt="Auberge Le Philo" className="absolute inset-0 size-full object-cover object-top" />
          </div>
          <div className="p-8 sm:p-12">
            <SectionTitle eyebrow={t('Getting here', 'Venir chez nous')} title={t('Ozouri, on the estuary', 'Ozouri, au bord de l’estuaire')} />
            <ul className="mt-8 space-y-5 text-sm">
              <li className="flex gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-ink"><Bus className="size-4" /></span><span><b className="text-foreground">{t('Shuttle', 'Navette')}</b><br /><span className="text-muted">{t('From in front of CECADO Matanda, Port-Gentil · 5 000 FCFA return', 'Devant le CECADO Matanda, Port-Gentil · 5 000 FCFA A/R')}</span></span></li>
              <li className="flex gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-ink"><Phone className="size-4" /></span><span><b className="text-foreground">{t('Phone & WhatsApp', 'Téléphone & WhatsApp')}</b><br /><a href="tel:+241074106080" className="text-muted hover:text-ink">+241 074 10 60 80</a></span></li>
              <li className="flex gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-ink"><Mail className="size-4" /></span><span><b className="text-foreground">Email</b><br /><span className="text-muted">contact@lephilo.ga</span></span></li>
              <li className="flex gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-ink"><Wifi className="size-4" /></span><span><b className="text-foreground">{t('On site', 'Sur place')}</b><br /><span className="text-muted">{t('Wi-Fi, A/C, restaurant, games room', 'Wi-Fi, climatisation, restaurant, salle de jeux')}</span></span></li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-2">
              <Button onClick={() => setBookingOpen(true)}>{t('Book a stay', 'Réserver un séjour')}</Button>
              <Button variant="ai" onClick={() => setCopilotOpen(true)}><Sparkles /> {t('Ask the assistant', 'Demander à l’assistant')}</Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-xs text-muted sm:px-6 lg:px-8">
          <Wordmark compact />
          <p>© {new Date().getFullYear()} Auberge Le Philo · SmartStay</p>
          <Link to="/login" className="font-semibold hover:text-ink">{t('Staff sign-in', 'Espace personnel')} →</Link>
        </div>
      </footer>

      {/* Floating assistant */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: 'spring' }}
        onClick={() => setCopilotOpen(true)}
        className="ai-gradient fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full py-3 pl-4 pr-5 text-sm font-semibold text-white shadow-pop"
      >
        <Sparkles className="size-4" /> {t('Ask Philo', 'Demander à Philo')}
      </motion.button>
    </div>
  );
}
