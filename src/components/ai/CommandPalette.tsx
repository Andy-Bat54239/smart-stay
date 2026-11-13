import { Command } from 'cmdk';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { BedDouble, CalendarPlus, CornerDownLeft, Languages, LogOut, Moon, Search, Sparkles, Sun, User } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useSession } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { useStore } from '@/data/store';
import { canSee, NAV } from '../layout/nav';
import { RoomStatusBadge, ResStatusBadge } from '../ui/status';
import { Kbd } from '../ui/misc';
import { useAI } from './AIContext';
import { fmtDate } from '@/lib/utils';

const item =
  'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-foreground data-[selected=true]:bg-accent-soft [&_svg]:size-4 [&_svg]:text-muted';
const group = '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted';

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, ask, setBookingOpen } = useAI();
  const { t, lang, setLang } = useLanguage();
  const { session, signOut } = useSession();
  const { theme, toggle } = useTheme();
  const store = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const role = session?.role;
  const staff = role && role !== 'guest';

  const close = () => {
    setPaletteOpen(false);
    setQ('');
  };
  const run = (fn: () => void) => () => {
    fn();
    close();
  };

  return (
    <AnimatePresence>
      {paletteOpen && (
        <motion.div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-forest-950/45 backdrop-blur-sm" onClick={close} />
          <motion.div initial={{ scale: 0.96, y: -8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0 }} transition={{ duration: 0.16 }} className="relative w-full max-w-xl">
            <Command
              label="Command menu"
              className="overflow-hidden rounded-2xl border bg-surface shadow-pop"
              onKeyDown={(e) => e.key === 'Escape' && close()}
            >
              <div className="flex items-center gap-3 border-b px-4">
                <Search className="size-4 text-muted" />
                <Command.Input
                  autoFocus
                  value={q}
                  onValueChange={setQ}
                  placeholder={t('Search or ask Philo AI anything…', 'Rechercher ou demander à Philo AI…')}
                  className="h-14 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted"
                />
                <Kbd>esc</Kbd>
              </div>
              <Command.List className="max-h-[56vh] overflow-y-auto p-2 scrollbar-thin">
                <Command.Empty className="px-3 py-8 text-center text-sm text-muted">{t('No results — press Enter to ask the AI.', 'Aucun résultat — Entrée pour demander à l’IA.')}</Command.Empty>

                {q.trim().length > 1 && (
                  <Command.Group heading="Philo AI" className={group}>
                    <Command.Item value={`ask-ai ${q}`} onSelect={run(() => ask(q))} className={item}>
                      <div className="ai-gradient grid size-7 place-items-center rounded-lg text-white [&_svg]:!text-white">
                        <Sparkles />
                      </div>
                      <span className="flex-1">
                        {t('Ask AI:', 'Demander à l’IA :')} <span className="font-semibold">“{q}”</span>
                      </span>
                      <CornerDownLeft />
                    </Command.Item>
                  </Command.Group>
                )}

                <Command.Group heading={t('Actions', 'Actions')} className={group}>
                  {role !== 'housekeeping' && role !== 'finance' && (
                    <Command.Item onSelect={run(() => setBookingOpen(true))} className={item}>
                      <CalendarPlus /> {t('New reservation', 'Nouvelle réservation')}
                    </Command.Item>
                  )}
                  <Command.Item onSelect={run(toggle)} className={item}>
                    {theme === 'dark' ? <Sun /> : <Moon />} {theme === 'dark' ? t('Light mode', 'Mode clair') : t('Dark mode', 'Mode sombre')}
                  </Command.Item>
                  <Command.Item onSelect={run(() => setLang(lang === 'en' ? 'fr' : 'en'))} className={item}>
                    <Languages /> {lang === 'en' ? 'Passer en français' : 'Switch to English'}
                  </Command.Item>
                  {session && (
                    <Command.Item onSelect={run(() => { signOut(); navigate('/login'); })} className={item}>
                      <LogOut /> {t('Sign out', 'Se déconnecter')}
                    </Command.Item>
                  )}
                </Command.Group>

                {session && (
                  <Command.Group heading={t('Go to', 'Aller à')} className={group}>
                    {NAV.filter((n) => canSee(store.permissions, session.role, n)).map((n) => (
                      <Command.Item key={n.to} value={`${n.en} ${n.fr}`} onSelect={run(() => navigate(n.to))} className={item}>
                        <n.icon /> <span className="flex-1">{t(n.en, n.fr)}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {staff && q.trim().length > 0 && (
                  <>
                    <Command.Group heading={t('Rooms', 'Chambres')} className={group}>
                      {store.rooms.map((r) => (
                        <Command.Item key={r.id} value={`room chambre ${r.number} ${r.type}`} onSelect={run(() => navigate(`/rooms?room=${r.id}`))} className={item}>
                          <BedDouble /> <span className="flex-1">{t('Room', 'Chambre')} {r.number} · {r.type}</span>
                          <RoomStatusBadge status={r.status} />
                        </Command.Item>
                      ))}
                    </Command.Group>
                    <Command.Group heading={t('Guests & bookings', 'Clients & réservations')} className={group}>
                      {store.reservations.slice(0, 30).map((r) => {
                        const g = store.guest(r.guestId);
                        return (
                          <Command.Item key={r.id} value={`${g?.name} ${r.ref} ${g?.email}`} onSelect={run(() => navigate(`/reservations?res=${r.id}`))} className={item}>
                            <User /> <span className="flex-1">{g?.name} <span className="text-muted">· {r.ref} · {fmtDate(r.checkIn, lang)}</span></span>
                            <ResStatusBadge status={r.status} />
                          </Command.Item>
                        );
                      })}
                    </Command.Group>
                  </>
                )}
              </Command.List>
              <div className="flex items-center justify-between border-t bg-surface-2 px-4 py-2 text-[11px] text-muted">
                <span className="flex items-center gap-1.5"><Kbd>↑↓</Kbd> {t('navigate', 'naviguer')} <Kbd>↵</Kbd> {t('select', 'choisir')}</span>
                <span className="flex items-center gap-1.5"><Kbd>⌘J</Kbd> {t('open copilot', 'copilote')}</span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
