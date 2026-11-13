import { useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import * as Popover from '@radix-ui/react-popover';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, ChevronsLeft, ChevronsRight, LogOut, Menu, Moon, Search, Sparkles, Sun, X, Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { ROLE_LABEL, ROLE_PROFILES, useSession, type Role } from '@/context/SessionContext';
import { useTheme } from '@/context/ThemeContext';
import { useStore } from '@/data/store';
import { cn } from '@/lib/utils';
import { useAI } from '../ai/AIContext';
import { Wordmark, LogoBadge } from '../Logo';
import { Avatar, Kbd, Tip } from '../ui/misc';
import { canSee, GROUPS, NAV } from './nav';
import { formatDistanceToNowStrict } from 'date-fns';
import { enGB, fr } from 'date-fns/locale';

function useCollapsed() {
  const [c, setC] = useState(() => {
    try {
      return localStorage.getItem('smartstay_nav') === 'collapsed';
    } catch {
      return false;
    }
  });
  const set = (v: boolean) => {
    try {
      localStorage.setItem('smartstay_nav', v ? 'collapsed' : 'open');
    } catch {}
    setC(v);
  };
  return [c, set] as const;
}

function Sidebar({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { t } = useLanguage();
  const { session } = useSession();
  const store = useStore();
  const items = NAV.filter((n) => session && canSee(store.permissions, session.role, n));
  const unassigned = store.reservations.filter((r) => !r.roomId && r.status !== 'cancelled').length;
  const dirty = store.rooms.filter((r) => r.status === 'dirty').length;
  const counters: Record<string, number> = session?.role === 'guest' ? {} : { '/reservations': unassigned, '/rooms': dirty };

  return (
    <div className="grain relative flex h-full flex-col bg-sidebar text-cream-100">
      <div className={cn('flex items-center border-b border-gold-500/15 py-5', collapsed ? 'justify-center px-2' : 'px-5')}>
        <Link to="/" onClick={onNavigate} aria-label="Auberge Le Philo">
          {collapsed ? <LogoBadge size={36} /> : <Wordmark light />}
        </Link>
      </div>

      <nav className="relative z-10 flex-1 space-y-5 overflow-y-auto px-3 py-5 scrollbar-thin">
        {GROUPS.map((g) => {
          const list = items.filter((i) => i.group === g.id);
          if (!list.length) return null;
          return (
            <div key={g.id}>
              {!collapsed && <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-gold-500/55">{t(g.en, g.fr)}</div>}
              <div className="space-y-0.5">
                {list.map((item) => {
                  const link = (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors',
                          collapsed && 'justify-center px-0',
                          isActive ? 'text-forest-900' : 'text-cream-100/70 hover:bg-gold-500/10 hover:text-cream-50',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl bg-gold-500" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                          <item.icon className="relative size-[18px] shrink-0" />
                          {!collapsed && <span className="relative flex-1">{t(item.en, item.fr)}</span>}
                          {counters[item.to] > 0 && (
                            <span className={cn('relative grid min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-bold', isActive ? 'bg-forest-900 text-gold-300' : 'bg-gold-500 text-forest-900', collapsed && 'absolute right-1 top-1 min-w-4 px-1')}>
                              {counters[item.to]}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                  return collapsed ? (
                    <Tip key={item.to} label={t(item.en, item.fr)} side="right">
                      {link}
                    </Tip>
                  ) : (
                    link
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="relative z-10 m-3 rounded-2xl border border-gold-500/20 bg-gradient-to-br from-gold-500/15 to-transparent p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-gold-300">
            <Sparkles className="size-3.5" /> Philo AI
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-cream-100/65">{t('Press ⌘K anywhere to search or ask a question.', 'Appuyez sur ⌘K partout pour chercher ou poser une question.')}</p>
        </div>
      )}
    </div>
  );
}

function RoleSwitcher() {
  const { t } = useLanguage();
  const { session, signIn, signOut } = useSession();
  const navigate = useNavigate();
  if (!session) return null;
  return (
    <Popover.Root>
      <Popover.Trigger className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 hover:bg-accent-soft">
        <Avatar name={session.name} size={32} />
        <div className="hidden text-left leading-tight md:block">
          <div className="text-[13px] font-semibold text-foreground">{session.name}</div>
          <div className="text-[11px] text-muted">{t(ROLE_LABEL[session.role].en, ROLE_LABEL[session.role].fr)}</div>
        </div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} className="z-50 w-64 rounded-2xl border bg-surface p-2 shadow-pop animate-in fade-in-0 zoom-in-95">
          <div className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-muted">{t('Demo: view as', 'Démo : voir en tant que')}</div>
          {(Object.keys(ROLE_PROFILES) as Role[]).map((r) => (
            <Popover.Close key={r} asChild>
              <button onClick={() => { signIn(r); navigate('/dashboard'); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] hover:bg-accent-soft">
                <Avatar name={ROLE_PROFILES[r].name} size={26} />
                <span className="flex-1 text-foreground">{t(ROLE_LABEL[r].en, ROLE_LABEL[r].fr)}</span>
                {session.role === r && <Check className="size-4 text-gold-600" />}
              </button>
            </Popover.Close>
          ))}
          <div className="my-1.5 border-t" />
          <button onClick={() => { signOut(); navigate('/login'); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-bad hover:bg-bad-soft">
            <LogOut className="size-4" /> {t('Sign out', 'Se déconnecter')}
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Notifications() {
  const { t, lang } = useLanguage();
  const { session } = useSession();
  const store = useStore();
  const mine = store.notices.filter((n) => session && n.roles.includes(session.role));
  const unread = mine.filter((n) => !n.read).length;
  return (
    <Popover.Root>
      <Popover.Trigger className="relative grid size-9 place-items-center rounded-xl text-foreground hover:bg-accent-soft" aria-label={t(`Notifications, ${unread} unread`, `Notifications, ${unread} non lues`)}>
        <Bell className="size-[18px]" />
        {unread > 0 && <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-gold-500 text-[9px] font-bold text-forest-900">{unread}</span>}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} className="z-50 w-80 rounded-2xl border bg-surface shadow-pop animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-bold text-foreground">{t('Notifications', 'Notifications')}</span>
            {unread > 0 && session && <button onClick={() => store.dispatch({ type: 'notice-read', id: 'all', role: session.role })} className="text-[11px] font-semibold text-muted hover:text-foreground">{t('Mark all read', 'Tout lu')}</button>}
          </div>
          <div className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
            {mine.slice(0, 8).map((n) => (
              <button key={n.id} onClick={() => session && store.dispatch({ type: 'notice-read', id: n.id, role: session.role })} className={cn('flex w-full gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-2', !n.read && 'bg-accent-soft/50')}>
                <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-line-strong' : n.priority === 'high' ? 'bg-bad' : 'bg-gold-500')} />
                <div className="min-w-0">
                  <p className={cn('text-[13px] text-foreground', !n.read && 'font-semibold')}>{t(n.en, n.fr)}</p>
                  <p className="text-[11px] text-muted">{formatDistanceToNowStrict(n.at, { addSuffix: true, locale: lang === 'fr' ? fr : enGB })}</p>
                </div>
              </button>
            ))}
            {!mine.length && <p className="px-2 py-6 text-center text-xs text-muted">{t('Nothing new.', 'Rien de nouveau.')}</p>}
          </div>
          {session && canSee(store.permissions, session.role, NAV.find((n) => n.to === '/notifications')!) && (
            <Popover.Close asChild>
              <Link to="/notifications" className="block border-t px-4 py-2.5 text-center text-xs font-semibold text-gold-600 hover:bg-surface-2 dark:text-gold-300">{t('Open notification center →', 'Centre de notifications →')}</Link>
            </Popover.Close>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function LangSwitch({ light }: { light?: boolean }) {
  const { lang, setLang } = useLanguage();
  return (
    <div className={cn('flex rounded-full border p-0.5 text-[11px] font-bold', light ? 'border-cream-100/25' : '')} role="group" aria-label="Language">
      {(['en', 'fr'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn('rounded-full px-2.5 py-1 uppercase transition-colors', lang === l ? 'bg-gold-500 text-forest-900' : light ? 'text-cream-100/70' : 'text-muted hover:text-foreground')}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function ThemeSwitch({ light }: { light?: boolean }) {
  const { theme, toggle } = useTheme();
  const { t } = useLanguage();
  return (
    <button onClick={toggle} className={cn('grid size-9 place-items-center rounded-xl', light ? 'text-cream-100 hover:bg-cream-100/10' : 'text-foreground hover:bg-accent-soft')} aria-label={t('Toggle theme', 'Changer de thème')}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
          {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

export function AppShell({ title, subtitle, actions, children }: { title: string; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  const { t } = useLanguage();
  const { setPaletteOpen, setCopilotOpen, copilotOpen } = useAI();
  const [collapsed, setCollapsed] = useCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className={cn('fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-300 lg:block', collapsed ? 'w-[76px]' : 'w-64')}>
        <Sidebar collapsed={collapsed} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 z-20 grid size-6 place-items-center rounded-full border bg-surface text-muted shadow-card hover:text-foreground"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight className="size-3.5" /> : <ChevronsLeft className="size-3.5" />}
        </button>
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-forest-950/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.div className="absolute inset-y-0 left-0 w-72" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
              <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
              <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-5 text-gold-300" aria-label="Close menu">
                <X className="size-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className={cn('transition-[padding] duration-300', collapsed ? 'lg:pl-[76px]' : 'lg:pl-64', copilotOpen && 'lg:pr-[400px]')}>
        {/* Top bar */}
        <header className="glass sticky top-0 z-20 border-b">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <button onClick={() => setMobileOpen(true)} className="grid size-9 place-items-center rounded-xl hover:bg-accent-soft lg:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </button>
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border bg-surface/70 px-3 text-left text-[13px] text-muted transition-colors hover:border-line-strong sm:max-w-md"
            >
              <Search className="size-4 shrink-0" />
              <span className="flex-1 truncate">{t('Search guests, rooms… or ask AI', 'Clients, chambres… ou demandez à l’IA')}</span>
              <span className="hidden items-center gap-1 sm:flex"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
            </button>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="hidden sm:block"><LangSwitch /></div>
              <ThemeSwitch />
              <Notifications />
              <Tip label={<span className="flex items-center gap-1.5">{t('Copilot', 'Copilote')} <Kbd>⌘J</Kbd></span>}>
                <button
                  onClick={() => setCopilotOpen(!copilotOpen)}
                  className={cn('flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold', copilotOpen ? 'ai-gradient text-white' : 'border border-ai/30 bg-ai-soft text-ai hover:brightness-95')}
                >
                  <Sparkles className="size-4" />
                  <span className="hidden sm:inline">AI</span>
                </button>
              </Tip>
              <div className="ml-1 hidden h-6 w-px bg-line-strong sm:block" />
              <RoleSwitcher />
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-semibold text-ink sm:text-[34px]">{title}</h1>
                {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
              </div>
              {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
