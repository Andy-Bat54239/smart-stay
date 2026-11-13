import { useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { enGB, fr } from 'date-fns/locale';
import { BellRing, CalendarCheck, CheckCheck, CircleAlert, CreditCard, Mail, Megaphone, MessageCircle, Plug, Send, Smartphone, Sparkles, Wrench, Zap, LogIn, Settings2, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Segmented } from '@/components/ui/misc';
import { Chip, Field, Input, Select, Switch, Textarea, td, th } from '@/components/ui/form';
import { useLanguage } from '@/context/LanguageContext';
import { useSession } from '@/context/SessionContext';
import { useStore } from '@/data/store';
import { integrations, type Channel, type Notice } from '@/data/seed2';
import { cn, fmtDate } from '@/lib/utils';

const KIND_ICON: Record<Notice['kind'], typeof Bell> = { booking: CalendarCheck, checkin: LogIn, housekeeping: Sparkles, maintenance: Wrench, payment: CreditCard, promo: Megaphone, system: Settings2, ai: Zap };
const KIND_TONE: Record<Notice['kind'], string> = { booking: 'bg-accent-soft text-ink', checkin: 'bg-info-soft text-info', housekeeping: 'bg-ai-soft text-ai', maintenance: 'bg-bad-soft text-bad', payment: 'bg-ok-soft text-ok', promo: 'bg-warn-soft text-warn', system: 'bg-surface-2 text-muted', ai: 'bg-ai-soft text-ai' };
const CH: { id: Channel; en: string; fr: string; icon: typeof Mail }[] = [
  { id: 'sms', en: 'SMS', fr: 'SMS', icon: Smartphone },
  { id: 'whatsapp', en: 'WhatsApp', fr: 'WhatsApp', icon: MessageCircle },
  { id: 'email', en: 'Email', fr: 'Email', icon: Mail },
  { id: 'inapp', en: 'In-app', fr: 'In-app', icon: BellRing },
];

function Center() {
  const { t, lang } = useLanguage();
  const { session } = useSession();
  const store = useStore();
  const [kind, setKind] = useState<Notice['kind'] | 'all' | 'unread'>('all');
  const mine = store.notices.filter((n) => session && n.roles.includes(session.role));
  const list = mine.filter((n) => kind === 'all' || (kind === 'unread' ? !n.read : n.kind === kind));
  const unread = mine.filter((n) => !n.read).length;
  const kinds = [...new Set(mine.map((n) => n.kind))];
  return (
    <Card>
      <CardHeader
        icon={<Bell />}
        title={t('Notification center', 'Centre de notifications')}
        subtitle={t(`${unread} unread`, `${unread} non lue(s)`)}
        action={unread > 0 && <Button size="sm" variant="ghost" onClick={() => store.dispatch({ type: 'notice-read', id: 'all', role: session!.role })}><CheckCheck /> {t('Mark all read', 'Tout marquer lu')}</Button>}
      />
      <div className="flex flex-wrap gap-1.5 px-5 pt-3">
        <Chip active={kind === 'all'} onClick={() => setKind('all')}>{t('All', 'Toutes')}</Chip>
        <Chip active={kind === 'unread'} onClick={() => setKind('unread')}>{t('Unread', 'Non lues')} <span className="opacity-60">{unread}</span></Chip>
        {kinds.map((k) => <Chip key={k} active={kind === k} onClick={() => setKind(k)}>{k}</Chip>)}
      </div>
      <div className="space-y-1 p-3">
        {list.map((n) => {
          const Icon = KIND_ICON[n.kind];
          return (
            <button key={n.id} onClick={() => store.dispatch({ type: 'notice-read', id: n.id, role: session!.role })} className={cn('flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-surface-2', !n.read && 'bg-accent-soft/50')}>
              <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', KIND_TONE[n.kind])}><Icon className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className={cn('text-[13px] text-foreground', !n.read && 'font-semibold')}>{t(n.en, n.fr)}</p>
                <p className="mt-0.5 text-[11px] text-muted">{formatDistanceToNowStrict(n.at, { addSuffix: true, locale: lang === 'fr' ? fr : enGB })}</p>
              </div>
              {n.priority === 'high' && <Badge tone="bad"><CircleAlert className="size-3" /> {t('High', 'Urgent')}</Badge>}
              {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-gold-500" />}
            </button>
          );
        })}
        {!list.length && <p className="py-10 text-center text-sm text-muted">{t('You’re all caught up.', 'Vous êtes à jour.')}</p>}
      </div>
    </Card>
  );
}

function Composer() {
  const { t, lang } = useLanguage();
  const { session } = useSession();
  const store = useStore();
  const [f, setF] = useState({ title: '', body: '', audience: 'all', when: 'now' });
  const [ch, setCh] = useState<Channel[]>(['sms', 'whatsapp']);
  const reach: Record<string, number> = { all: 412, past: 286, upcoming: store.reservations.filter((r) => r.checkIn > new Date()).length, inhouse: store.reservations.filter((r) => r.status === 'checked-in').length, staff: store.users.filter((u) => u.status === 'active').length };
  const aud = [
    { id: 'all', en: 'All guests (opted in)', fr: 'Tous les clients (consentants)' },
    { id: 'past', en: 'Past guests · 12 months', fr: 'Anciens clients · 12 mois' },
    { id: 'upcoming', en: 'Guests arriving soon', fr: 'Clients à venir' },
    { id: 'inhouse', en: 'In-house guests', fr: 'Clients présents' },
    { id: 'staff', en: 'All staff', fr: 'Tout le personnel' },
  ];
  const smsParts = Math.ceil((f.title.length + f.body.length + 2) / 160) || 1;
  const draftAI = () => setF({ ...f, title: t('Weekend escape at Le Philo 🌴', 'Week-end évasion au Philo 🌴'), body: t('Book a Duo Stay this weekend and get a free estuary boat tour. Code PHILO10 for 10% off. Call +241 074 10 60 80.', 'Réservez un Séjour Duo ce week-end et profitez d’une balade en bateau offerte. Code PHILO10 : -10 %. Appelez le +241 074 10 60 80.') });
  const send = () => {
    const sent = reach[f.audience] * (f.audience === 'staff' ? 1 : 1);
    store.dispatch({ type: 'broadcast', b: { id: `BC${Date.now()}`, at: new Date(), title: f.title, channels: ch, audience: aud.find((a) => a.id === f.audience)!.en, sent, opened: 0, by: session?.name ?? '' } });
    if (f.audience === 'staff') store.dispatch({ type: 'notice-add', notice: { id: `N${Date.now()}`, at: new Date(), en: f.title, fr: f.title, kind: 'system', roles: ['receptionist', 'housekeeping', 'finance', 'manager', 'admin'], read: false } });
    toast.success(f.when === 'now' ? t(`Sent to ${sent} recipients`, `Envoyé à ${sent} destinataires`) : t('Scheduled', 'Programmé'));
    setF({ title: '', body: '', audience: 'all', when: 'now' });
  };
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
      <Card>
        <CardHeader icon={<Megaphone />} title={t('Broadcast message', 'Message de diffusion')} subtitle={t('Promotions and announcements to guests or staff', 'Promotions et annonces aux clients ou au personnel')} action={<Button size="sm" variant="ai" onClick={draftAI}><Sparkles /> {t('Draft with AI', 'Rédiger avec l’IA')}</Button>} />
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <Field label={t('Audience', 'Audience')}><Select value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>{aud.map((a) => <option key={a.id} value={a.id}>{t(a.en, a.fr)} ({reach[a.id]})</option>)}</Select></Field>
          <Field label={t('When', 'Quand')}><Select value={f.when} onChange={(e) => setF({ ...f, when: e.target.value })}><option value="now">{t('Send now', 'Maintenant')}</option><option value="fri">{t('Friday 10:00', 'Vendredi 10h')}</option><option value="best">{t('Best time (AI: Thu 18:30)', 'Meilleur moment (IA : jeu. 18h30)')}</option></Select></Field>
          <Field label={t('Title', 'Titre')} className="sm:col-span-2"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label={t('Message', 'Message')} className="sm:col-span-2" hint={ch.includes('sms') ? t(`${f.title.length + f.body.length} chars · ${smsParts} SMS part(s) per recipient`, `${f.title.length + f.body.length} car. · ${smsParts} SMS par destinataire`) : undefined}><Textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
          <div className="sm:col-span-2">
            <p className="mb-2 text-xs font-semibold text-muted">{t('Channels', 'Canaux')}</p>
            <div className="flex flex-wrap gap-1.5">{CH.map((c) => <Chip key={c.id} active={ch.includes(c.id)} onClick={() => setCh(ch.includes(c.id) ? ch.filter((x) => x !== c.id) : [...ch, c.id])}><c.icon className="size-3.5" /> {t(c.en, c.fr)}</Chip>)}</div>
          </div>
          <div className="flex items-center justify-between sm:col-span-2">
            <p className="text-[11px] text-muted">{t('Only guests who opted in to marketing receive promotions.', 'Seuls les clients ayant accepté le marketing reçoivent les promotions.')}</p>
            <Button disabled={!f.title || !f.body || !ch.length} onClick={send}><Send /> {f.when === 'now' ? t('Send', 'Envoyer') : t('Schedule', 'Programmer')}</Button>
          </div>
        </div>
      </Card>
      <div>
        <p className="mb-2 text-xs font-semibold text-muted">{t('Preview', 'Aperçu')}</p>
        <div className="mx-auto w-[260px] rounded-[36px] border-[6px] border-forest-900 bg-forest-950 p-3 shadow-pop">
          <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-cream-100/20" />
          <div className="rounded-2xl bg-[#e7ffd9] p-3 text-[12px] leading-snug text-[#111] shadow">
            <p className="font-bold">{f.title || t('Your title', 'Votre titre')}</p>
            <p className="mt-1 whitespace-pre-line">{f.body || t('Your message appears here…', 'Votre message apparaît ici…')}</p>
            <p className="mt-1 text-right text-[10px] text-black/50">{fmtDate(new Date(), lang, 'HH:mm')} ✓✓</p>
          </div>
          <p className="mt-3 text-center text-[10px] text-cream-100/50">Auberge Le Philo · WhatsApp</p>
        </div>
      </div>
      <Card className="xl:col-span-2">
        <CardHeader icon={<Send />} title={t('Broadcast history', 'Historique des diffusions')} />
        <div className="overflow-x-auto p-3">
          <table className="w-full min-w-[620px] text-[13px]">
            <thead><tr><th className={th}>{t('Date', 'Date')}</th><th className={th}>{t('Title', 'Titre')}</th><th className={th}>{t('Channels', 'Canaux')}</th><th className={th}>{t('Audience', 'Audience')}</th><th className={cn(th, 'text-right')}>{t('Sent', 'Envoyés')}</th><th className={cn(th, 'text-right')}>{t('Opened', 'Ouverts')}</th></tr></thead>
            <tbody>
              {store.broadcasts.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className={cn(td, 'text-muted')}>{fmtDate(b.at, lang, 'd MMM')}</td>
                  <td className={cn(td, 'font-semibold text-foreground')}>{b.title}<span className="block text-[11px] font-normal text-muted">{b.by}</span></td>
                  <td className={td}><div className="flex gap-1">{b.channels.map((c) => <Badge key={c} tone="neutral">{c}</Badge>)}</div></td>
                  <td className={cn(td, 'text-muted')}>{b.audience}</td>
                  <td className={cn(td, 'text-right tabular')}>{b.sent}</td>
                  <td className={cn(td, 'text-right tabular')}>{b.sent ? `${Math.round((b.opened / b.sent) * 100)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Automations() {
  const { t } = useLanguage();
  const store = useStore();
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
      <Card>
        <CardHeader icon={<Zap />} title={t('Automated guest messages', 'Messages automatiques')} subtitle={t('Sent in the guest’s language (EN/FR)', 'Envoyés dans la langue du client (FR/EN)')} />
        <div className="space-y-2 p-5">
          {store.rules.map((r) => (
            <div key={r.id} className={cn('flex flex-wrap items-center gap-3 rounded-xl border p-3', !r.on && 'opacity-60')}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{t(r.en, r.fr)}</p>
                <p className="text-[11px] text-muted">{t(r.when.en, r.when.fr)} · {t(`${r.sent30} sent in 30 days`, `${r.sent30} envoyés en 30 jours`)}</p>
              </div>
              <div className="flex gap-1">{r.channels.map((c) => <Badge key={c} tone="neutral">{c}</Badge>)}</div>
              <Switch on={r.on} label={r.en} onChange={(v) => { store.dispatch({ type: 'rule', id: r.id, on: v }); toast(v ? t('Automation on', 'Automatisation activée') : t('Automation paused', 'Automatisation suspendue')); }} />
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <CardHeader icon={<Plug />} title={t('Integrations', 'Intégrations')} />
        <div className="space-y-2 p-5">
          {integrations.map((i) => (
            <div key={i.id} className="flex items-center gap-3 rounded-xl border px-3 py-2.5">
              <span className={cn('size-2.5 rounded-full', i.ok ? 'bg-ok' : 'bg-bad')} />
              <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-foreground">{t(i.en, i.fr)}</p><p className="truncate text-[11px] text-muted">{i.detail}</p></div>
              <Badge tone={i.ok ? 'ok' : 'bad'}>{i.ok ? t('Connected', 'Connecté') : t('Offline', 'Hors ligne')}</Badge>
            </div>
          ))}
          <Button size="sm" variant="outline" className="w-full" onClick={() => toast.success(t('Test message sent to +241 074 10 60 80', 'Message test envoyé au +241 074 10 60 80'))}>{t('Send test message', 'Envoyer un test')}</Button>
        </div>
      </Card>
    </div>
  );
}

function GuestPrefs() {
  const { t } = useLanguage();
  const [p, setP] = useState({ booking: { email: true, sms: true, whatsapp: true }, reminders: { email: false, sms: true, whatsapp: true }, promos: { email: true, sms: false, whatsapp: false } });
  const rows = [
    { k: 'booking' as const, en: 'Booking confirmations & changes', fr: 'Confirmations & modifications' },
    { k: 'reminders' as const, en: 'Check-in / check-out reminders', fr: 'Rappels d’arrivée / départ' },
    { k: 'promos' as const, en: 'Offers & events', fr: 'Offres & événements' },
  ];
  return (
    <Card>
      <CardHeader icon={<Settings2 />} title={t('How we contact you', 'Comment vous contacter')} subtitle={t('You can change this anytime', 'Modifiable à tout moment')} />
      <div className="overflow-x-auto p-3">
        <table className="w-full min-w-[440px] text-[13px]">
          <thead><tr><th className={th} />{(['email', 'sms', 'whatsapp'] as const).map((c) => <th key={c} className={cn(th, 'text-center')}>{c}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.k} className="border-t">
                <td className={cn(td, 'font-semibold text-foreground')}>{t(r.en, r.fr)}</td>
                {(['email', 'sms', 'whatsapp'] as const).map((c) => (
                  <td key={c} className={cn(td, 'text-center')}><span className="inline-flex"><Switch on={p[r.k][c]} label={`${r.en} ${c}`} onChange={(v) => setP({ ...p, [r.k]: { ...p[r.k], [c]: v } })} /></span></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <Button size="sm" className="m-2" onClick={() => toast.success(t('Preferences saved', 'Préférences enregistrées'))}>{t('Save', 'Enregistrer')}</Button>
      </div>
    </Card>
  );
}

export default function NotificationsPage() {
  const { t } = useLanguage();
  const { session } = useSession();
  const canBroadcast = session?.role === 'manager' || session?.role === 'admin';
  const [tab, setTab] = useState<'center' | 'broadcast' | 'auto'>('center');
  if (session?.role === 'guest')
    return (
      <AppShell title={t('Notifications', 'Notifications')}>
        <GuestPrefs />
      </AppShell>
    );
  return (
    <AppShell
      title={t('Notifications & communication', 'Notifications & communication')}
      subtitle={t('Alerts for your role, guest messaging and automations', 'Alertes de votre rôle, messages clients et automatisations')}
      actions={canBroadcast ? <Segmented value={tab} onChange={setTab} options={[{ value: 'center', label: t('Inbox', 'Boîte') }, { value: 'broadcast', label: t('Broadcast', 'Diffusion') }, { value: 'auto', label: t('Automations', 'Automatisations') }]} /> : undefined}
    >
      {tab === 'center' && <Center />}
      {tab === 'broadcast' && canBroadcast && <Composer />}
      {tab === 'auto' && canBroadcast && <Automations />}
    </AppShell>
  );
}
