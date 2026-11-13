import { useRef, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { enGB, fr } from 'date-fns/locale';
import { AlertTriangle, Check, Download, FileUp, Fingerprint, KeyRound, Laptop, Lock, MonitorSmartphone, Plus, Search, ShieldAlert, ShieldCheck, Smartphone, UserCheck, UserPlus, UserX, X } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, Segmented } from '@/components/ui/misc';
import { Chip, Field, Input, Select, Stat, Switch, td, th } from '@/components/ui/form';
import { useLanguage } from '@/context/LanguageContext';
import { ROLE_LABEL, useSession, type Role } from '@/context/SessionContext';
import { useStore } from '@/data/store';
import { MODULES, type AuditCat, type Perm, type StaffUser } from '@/data/seed2';
import { cn, downloadCsv, fmtDate, today } from '@/lib/utils';

const STAFF_ROLES: StaffUser['role'][] = ['receptionist', 'housekeeping', 'finance', 'manager', 'admin'];
const ALL_ROLES: Role[] = ['guest', ...STAFF_ROLES];

function Users() {
  const { t, lang } = useLanguage();
  const store = useStore();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', email: '', role: 'receptionist' as StaffUser['role'], shift: 'morning' });
  const [requests, setRequests] = useState([
    { id: 'AR1', who: 'Nadège Ella', en: 'Access to Billing (edit) for evening check-outs', fr: 'Accès Facturation (édition) pour les départs du soir', at: new Date(Date.now() - 3 * 3600_000) },
    { id: 'AR2', who: 'Amina Mba', en: 'View Reservations to plan cleaning', fr: 'Voir les Réservations pour planifier le ménage', at: new Date(Date.now() - 26 * 3600_000) },
  ]);
  const fileRef = useRef<HTMLInputElement>(null);
  const loc = lang === 'fr' ? fr : enGB;
  const list = store.users.filter((u) => !q || `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(q.toLowerCase()));
  const emailTaken = store.users.some((u) => u.email.toLowerCase() === f.email.toLowerCase());

  const importCsv = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const header = lines[0].toLowerCase().split(',').map((h) => h.replace(/"/g, '').trim());
    const idx = (k: string) => header.findIndex((h) => h.includes(k));
    const [iName, iEmail, iPhone, iNat] = [idx('name'), idx('email'), idx('phone'), idx('nation')];
    if (iName < 0) {
      toast.error(t('CSV needs at least a “name” column', 'Le CSV doit contenir une colonne « name »'));
      return;
    }
    let n = 0;
    lines.slice(1).forEach((l, i) => {
      const c = l.split(',').map((x) => x.replace(/^"|"$/g, '').trim());
      if (!c[iName]) return;
      store.dispatch({ type: 'guest-add', guest: { id: `GI${Date.now()}${i}`, name: c[iName], email: iEmail >= 0 ? c[iEmail] : '', phone: iPhone >= 0 ? c[iPhone] : '', nationality: iNat >= 0 ? c[iNat] : 'Gabon', loyalty: 0, stays: 0, preferences: [] } });
      n++;
    });
    toast.success(t(`${n} guest(s) imported`, `${n} client(s) importé(s)`));
  };

  return (
    <div className="space-y-5">
      {requests.length > 0 && (
        <Card>
          <CardHeader icon={<KeyRound />} title={t('Access requests', 'Demandes d’accès')} subtitle={t('Staff asking for more permissions', 'Le personnel demande des droits supplémentaires')} />
          <div className="space-y-2 p-4">
            {requests.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5 text-[13px]">
                <Avatar name={r.who} size={30} />
                <div className="min-w-0 flex-1"><p className="font-semibold text-foreground">{r.who}</p><p className="text-xs text-muted">{t(r.en, r.fr)} · {formatDistanceToNowStrict(r.at, { addSuffix: true, locale: loc })}</p></div>
                <Button size="sm" onClick={() => { setRequests(requests.filter((x) => x.id !== r.id)); store.dispatch({ type: 'audit', cat: 'user', en: `Approved access request: ${r.who} — ${r.en}`, fr: `Demande approuvée : ${r.who} — ${r.fr}`, risk: 'medium' }); toast.success(t('Approved', 'Approuvée')); }}><Check /> {t('Approve', 'Approuver')}</Button>
                <Button size="sm" variant="ghost" onClick={() => { setRequests(requests.filter((x) => x.id !== r.id)); toast(t('Denied', 'Refusée')); }}><X /> {t('Deny', 'Refuser')}</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader
          icon={<UserCheck />}
          title={t('Staff accounts', 'Comptes du personnel')}
          subtitle={t('Staff can’t self-register — only admins create accounts. Guests sign up on the website.', 'Pas d’inscription libre pour le personnel — seuls les admins créent les comptes. Les clients s’inscrivent sur le site.')}
          action={
            <div className="flex gap-2">
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><FileUp /> {t('Import guests', 'Importer clients')}</Button>
              <Button size="sm" variant="outline" onClick={() => { downloadCsv('guests-export.csv', [['name', 'email', 'phone', 'nationality', 'loyalty'], ...store.guests.map((g) => [g.name, g.email, g.phone, g.nationality, g.loyalty])]); store.dispatch({ type: 'audit', cat: 'guest-data', en: `Bulk guest export (${store.guests.length})`, fr: `Export clients en masse (${store.guests.length})`, risk: 'medium' }); }}><Download /> {t('Export guests', 'Exporter clients')}</Button>
              <Button size="sm" onClick={() => setOpen(true)}><UserPlus /> {t('New staff account', 'Nouveau compte')}</Button>
            </div>
          }
        />
        <div className="px-5 pt-3"><div className="flex h-9 max-w-xs items-center gap-2 rounded-xl border bg-surface-2 px-3"><Search className="size-4 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search staff…', 'Rechercher…')} className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted" /></div></div>
        <div className="overflow-x-auto p-3">
          <table className="w-full min-w-[780px] text-[13px]">
            <thead><tr><th className={th}>{t('User', 'Utilisateur')}</th><th className={th}>{t('Role', 'Rôle')}</th><th className={th}>MFA</th><th className={th}>{t('Last sign-in', 'Dernière connexion')}</th><th className={th}>{t('Status', 'Statut')}</th><th className={th} /></tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} className={cn('border-t', u.status === 'suspended' && 'opacity-60')}>
                  <td className={td}><div className="flex items-center gap-3"><Avatar name={u.name} size={32} /><div><p className="font-semibold text-foreground">{u.name}</p><p className="text-[11px] text-muted">{u.email}</p></div></div></td>
                  <td className={td}>
                    <Select value={u.role} onChange={(e) => { store.dispatch({ type: 'user', id: u.id, patch: { role: e.target.value as StaffUser['role'] } }); toast.success(t('Role updated', 'Rôle modifié')); }} className="h-8 w-40 text-xs" disabled={u.email === 'admin@lephilo.ga'}>
                      {STAFF_ROLES.map((r) => <option key={r} value={r}>{t(ROLE_LABEL[r].en, ROLE_LABEL[r].fr)}</option>)}
                    </Select>
                  </td>
                  <td className={td}>{u.mfa ? <Badge tone="ok"><ShieldCheck className="size-3" /> {t('On', 'Actif')}</Badge> : <button onClick={() => toast(t(`MFA setup link sent to ${u.email}`, `Lien de configuration MFA envoyé à ${u.email}`))}><Badge tone="warn">{t('Off — send setup', 'Inactif — envoyer')}</Badge></button>}</td>
                  <td className={cn(td, 'text-xs text-muted')}>{u.lastLogin ? formatDistanceToNowStrict(u.lastLogin, { addSuffix: true, locale: loc }) : t('Never', 'Jamais')}</td>
                  <td className={td}><Badge tone={u.status === 'active' ? 'ok' : u.status === 'invited' ? 'info' : 'bad'} dot>{u.status === 'active' ? t('Active', 'Actif') : u.status === 'invited' ? t('Invited', 'Invité') : t('Suspended', 'Suspendu')}</Badge></td>
                  <td className={cn(td, 'text-right')}>
                    {u.email !== 'admin@lephilo.ga' && (u.status === 'suspended' ? (
                      <Button size="sm" variant="outline" onClick={() => { store.dispatch({ type: 'user', id: u.id, patch: { status: 'active' } }); toast.success(t('Account reactivated', 'Compte réactivé')); }}><UserCheck /> {t('Reactivate', 'Réactiver')}</Button>
                    ) : (
                      <Button size="sm" variant="ghost" className="text-bad" onClick={() => { store.dispatch({ type: 'user', id: u.id, patch: { status: 'suspended' } }); toast(t('Account suspended — sessions revoked', 'Compte suspendu — sessions révoquées')); }}><UserX /> {t('Suspend', 'Suspendre')}</Button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={t('Create staff account', 'Créer un compte')} description={t('An invitation with a temporary password and MFA setup is sent by email', 'Une invitation avec mot de passe temporaire et configuration MFA est envoyée par email')}>
          <div className="grid gap-3 p-6 sm:grid-cols-2">
            <Field label={t('Full name', 'Nom complet')} className="sm:col-span-2"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
            <Field label="Email" error={f.email && emailTaken ? t('Already used', 'Déjà utilisé') : undefined} className="sm:col-span-2"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="prenom@lephilo.ga" /></Field>
            <Field label={t('Role', 'Rôle')}><Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as StaffUser['role'] })}>{STAFF_ROLES.map((r) => <option key={r} value={r}>{t(ROLE_LABEL[r].en, ROLE_LABEL[r].fr)}</option>)}</Select></Field>
            <Field label={t('Shift', 'Service')}><Select value={f.shift} onChange={(e) => setF({ ...f, shift: e.target.value })}><option value="morning">{t('Morning', 'Matin')}</option><option value="evening">{t('Evening', 'Soir')}</option><option value="night">{t('Night', 'Nuit')}</option></Select></Field>
            <p className="flex items-center gap-2 rounded-xl bg-ok-soft px-3 py-2 text-xs text-foreground sm:col-span-2"><ShieldCheck className="size-4 text-ok" /> {t('MFA is mandatory for all staff and enforced at first sign-in.', 'Le MFA est obligatoire pour tout le personnel dès la première connexion.')}</p>
          </div>
          <div className="flex justify-end gap-2 border-t bg-surface-2 px-6 py-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>{t('Cancel', 'Annuler')}</Button>
            <Button
              disabled={f.name.length < 3 || !/^\S+@\S+\.\S+$/.test(f.email) || emailTaken}
              onClick={() => {
                store.dispatch({ type: 'user-add', user: { id: `U${Date.now()}`, name: f.name, email: f.email, role: f.role, status: 'invited', mfa: false, lastLogin: null, shift: f.shift as StaffUser['shift'] } });
                toast.success(t(`Invitation sent to ${f.email}`, `Invitation envoyée à ${f.email}`));
                setF({ name: '', email: '', role: 'receptionist', shift: 'morning' });
                setOpen(false);
              }}
            >
              <Plus /> {t('Create & invite', 'Créer & inviter')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Permissions() {
  const { t } = useLanguage();
  const store = useStore();
  const cycle: Record<Perm, Perm> = { none: 'view', view: 'edit', edit: 'none' };
  const cls: Record<Perm, string> = { none: 'bg-surface-2 text-muted', view: 'bg-info-soft text-info', edit: 'bg-ok-soft text-ok' };
  const label: Record<Perm, { en: string; fr: string }> = { none: { en: '—', fr: '—' }, view: { en: 'View', fr: 'Voir' }, edit: { en: 'Edit', fr: 'Modifier' } };
  return (
    <Card>
      <CardHeader icon={<Lock />} title={t('Permission matrix', 'Matrice des permissions')} subtitle={t('Click a cell to cycle none → view → edit. Everyone keeps the dashboard; admin always keeps Security.', 'Cliquez une case : aucun → voir → modifier. Tout le monde garde le tableau de bord ; l’admin garde la Sécurité.')} />
      <div className="overflow-x-auto p-4">
        <table className="w-full min-w-[860px] text-[12px]">
          <thead>
            <tr><th className={th}>{t('Module', 'Module')}</th>{ALL_ROLES.map((r) => <th key={r} className={cn(th, 'text-center')}>{t(ROLE_LABEL[r].en, ROLE_LABEL[r].fr)}</th>)}</tr>
          </thead>
          <tbody>
            {MODULES.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="px-4 py-2 font-semibold text-foreground">{t(m.en, m.fr)}</td>
                {ALL_ROLES.map((r) => {
                  const p = store.permissions[r][m.id];
                  const locked = (r === 'admin' && m.id === 'security') || m.id === 'dashboard'; // everyone keeps a home page
                  return (
                    <td key={r} className="px-2 py-1.5 text-center">
                      <button
                        disabled={locked}
                        onClick={() => { store.dispatch({ type: 'perm', role: r, module: m.id, perm: cycle[p] }); }}
                        className={cn('w-20 rounded-lg px-2 py-1.5 font-semibold transition-colors disabled:cursor-not-allowed', cls[p], !locked && 'hover:ring-2 hover:ring-gold-500/30')}
                        aria-label={`${r} ${m.en}: ${p}`}
                      >
                        {locked ? <span className="flex items-center justify-center gap-1"><Lock className="size-3" />{t(label[p].en, label[p].fr)}</span> : t(label[p].en, label[p].fr)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[11px] text-muted">{t('Every change is recorded in the audit log.', 'Chaque modification est enregistrée dans le journal d’audit.')}</p>
      </div>
    </Card>
  );
}

function AuditLog() {
  const { t, lang } = useLanguage();
  const store = useStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<AuditCat | 'all'>('all');
  const [risk, setRisk] = useState(false);
  const cats: { id: AuditCat; en: string; fr: string }[] = [
    { id: 'auth', en: 'Sign-ins', fr: 'Connexions' },
    { id: 'reservation', en: 'Reservations', fr: 'Réservations' },
    { id: 'billing', en: 'Billing', fr: 'Facturation' },
    { id: 'room', en: 'Room changes', fr: 'Chambres' },
    { id: 'guest-data', en: 'Guest data access', fr: 'Données clients' },
    { id: 'user', en: 'Users', fr: 'Utilisateurs' },
    { id: 'settings', en: 'Settings', fr: 'Paramètres' },
  ];
  const list = store.audit.filter((a) => (cat === 'all' || a.cat === cat) && (!risk || a.risk) && (!q || `${a.actor} ${a.en} ${a.fr} ${a.ip}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={<Fingerprint />}
        title={t('Audit trail', 'Journal d’audit')}
        subtitle={t('Tamper-evident log of every action · kept 24 months', 'Journal infalsifiable de chaque action · conservé 24 mois')}
        action={<Button size="sm" variant="outline" onClick={() => { downloadCsv(`audit-${fmtDate(today(), 'en', 'yyyy-MM-dd')}.csv`, [['Time', 'Actor', 'Role', 'Category', 'Action', 'IP', 'Risk'], ...list.map((a) => [fmtDate(a.at, 'en', 'yyyy-MM-dd HH:mm:ss'), a.actor, a.role, a.cat, a.en, a.ip ?? '', a.risk ?? ''])]); toast.success(t('Audit trail exported', 'Journal exporté')); }}><Download /> {t('Export', 'Exporter')}</Button>}
      />
      <div className="flex flex-wrap items-center gap-1.5 px-5 pt-3">
        <div className="mr-2 flex h-9 w-56 items-center gap-2 rounded-xl border bg-surface-2 px-3"><Search className="size-4 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('User, action, IP…', 'Utilisateur, action, IP…')} className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted" /></div>
        <Chip active={cat === 'all'} onClick={() => setCat('all')}>{t('All', 'Tout')}</Chip>
        {cats.map((c) => <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>{t(c.en, c.fr)}</Chip>)}
        <Chip active={risk} onClick={() => setRisk(!risk)}><AlertTriangle className="size-3" /> {t('Flagged only', 'Signalés')}</Chip>
      </div>
      <div className="max-h-[560px] overflow-auto p-3 scrollbar-thin">
        <table className="w-full min-w-[760px] text-[13px]">
          <thead className="sticky top-0 bg-surface"><tr><th className={th}>{t('Time', 'Heure')}</th><th className={th}>{t('Who', 'Qui')}</th><th className={th}>{t('Action', 'Action')}</th><th className={th}>IP</th><th className={th} /></tr></thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id} className={cn('border-t', a.risk === 'high' && 'bg-bad-soft/50')}>
                <td className={cn(td, 'whitespace-nowrap font-mono text-[11px] text-muted')}>{fmtDate(a.at, lang, 'd MMM HH:mm')}</td>
                <td className={td}><p className="font-semibold text-foreground">{a.actor}</p><p className="text-[11px] text-muted">{a.role}</p></td>
                <td className={td}><Badge tone="neutral" className="mr-2">{t(cats.find((c) => c.id === a.cat)!.en, cats.find((c) => c.id === a.cat)!.fr)}</Badge><span className="text-foreground">{t(a.en, a.fr)}</span></td>
                <td className={cn(td, 'font-mono text-[11px] text-muted')}>{a.ip ?? '—'}</td>
                <td className={td}>{a.risk && <Badge tone={a.risk === 'high' ? 'bad' : 'warn'}>{a.risk === 'high' ? t('High', 'Élevé') : t('Review', 'À vérifier')}</Badge>}</td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={5} className="py-10 text-center text-muted">{t('No entries.', 'Aucune entrée.')}</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Settings() {
  const { t, lang } = useLanguage();
  const store = useStore();
  const { session } = useSession();
  const [cfg, setCfg] = useState({ mfaStaff: true, mfaAdminHw: false, timeout: '30', lockAfter: '5', geoBlock: true, guestData: '36', audit: '24', chat: '12', anonymise: true });
  const [sessions, setSessions] = useState([
    { id: 'S1', who: session?.name ?? 'You', dev: 'Chrome · macOS', ip: '41.158.12.4', icon: Laptop, at: new Date(Date.now() - 2 * 60000), cur: true },
    { id: 'S2', who: 'Marc Obono', dev: 'Front desk PC · Windows', ip: '41.158.12.9', icon: MonitorSmartphone, at: new Date(Date.now() - 12 * 60000) },
    { id: 'S3', who: 'Amina Mba', dev: 'Android phone', ip: '41.158.12.11', icon: Smartphone, at: new Date(Date.now() - 50 * 60000) },
    { id: 'S4', who: 'Pierre Mvé', dev: 'Safari · iPhone', ip: '154.72.3.200', icon: Smartphone, at: new Date(Date.now() - 180 * 60000) },
  ]);
  const loc = lang === 'fr' ? fr : enGB;
  const anomalies = store.audit.filter((a) => a.risk === 'high');
  const set = (k: keyof typeof cfg, v: string | boolean) => setCfg({ ...cfg, [k]: v });
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader icon={<ShieldAlert />} title={t('Anomaly detection', 'Détection d’anomalies')} subtitle={t('AI watches sign-ins, discounts, refunds and data exports', 'L’IA surveille connexions, remises, remboursements et exports')} />
        <div className="space-y-2 p-5">
          {anomalies.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-xl border border-bad/25 bg-bad-soft/60 p-3 text-xs">
              <AlertTriangle className="mt-0.5 size-4 text-bad" />
              <div className="flex-1"><p className="font-semibold text-foreground">{t(a.en, a.fr)}</p><p className="text-muted">{a.ip} · {formatDistanceToNowStrict(a.at, { addSuffix: true, locale: loc })}</p></div>
            </div>
          ))}
          <div className="flex items-start gap-3 rounded-xl border border-warn/30 bg-warn-soft p-3 text-xs">
            <AlertTriangle className="mt-0.5 size-4 text-warn" />
            <div className="flex-1"><p className="font-semibold text-foreground">{t('Guest list exported from a new IP (154.72.3.200)', 'Liste clients exportée depuis une nouvelle IP (154.72.3.200)')}</p><p className="text-muted">Pierre Mvé · {t('confirm this was expected', 'confirmer que c’était prévu')}</p></div>
            <button className="font-semibold text-muted hover:text-foreground" onClick={() => toast(t('Marked as expected', 'Marqué comme prévu'))}>{t('OK', 'OK')}</button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader icon={<Laptop />} title={t('Active sessions', 'Sessions actives')} subtitle={t(`Idle sessions sign out after ${cfg.timeout} min`, `Déconnexion après ${cfg.timeout} min d’inactivité`)} />
        <div className="space-y-2 p-5">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-xs">
              <s.icon className="size-4 text-muted" />
              <div className="min-w-0 flex-1"><p className="font-semibold text-foreground">{s.who} {s.cur && <Badge tone="ok">{t('This device', 'Cet appareil')}</Badge>}</p><p className="text-muted">{s.dev} · {s.ip} · {formatDistanceToNowStrict(s.at, { addSuffix: true, locale: loc })}</p></div>
              {!s.cur && <button className="font-semibold text-bad hover:underline" onClick={() => { setSessions(sessions.filter((x) => x.id !== s.id)); store.dispatch({ type: 'audit', cat: 'auth', en: `Revoked session of ${s.who} (${s.dev})`, fr: `Session de ${s.who} révoquée (${s.dev})` }); toast(t('Session revoked', 'Session révoquée')); }}>{t('Revoke', 'Révoquer')}</button>}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader icon={<KeyRound />} title={t('Authentication', 'Authentification')} />
        <div className="space-y-3 p-5 text-[13px]">
          {[
            { k: 'mfaStaff' as const, en: 'Require MFA for all staff (SMS or authenticator)', fr: 'MFA obligatoire pour tout le personnel (SMS ou application)', lock: true },
            { k: 'mfaAdminHw' as const, en: 'Require a security key for administrators', fr: 'Clé de sécurité obligatoire pour les administrateurs' },
            { k: 'geoBlock' as const, en: 'Block sign-ins from new countries until confirmed', fr: 'Bloquer les connexions depuis un nouveau pays jusqu’à confirmation' },
          ].map((x) => (
            <div key={x.k} className="flex items-center justify-between gap-3"><span className="text-foreground">{t(x.en, x.fr)}</span><Switch on={cfg[x.k] as boolean} label={x.en} onChange={(v) => !x.lock && set(x.k, v)} /></div>
          ))}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Field label={t('Session timeout (min)', 'Expiration de session (min)')}><Select value={cfg.timeout} onChange={(e) => set('timeout', e.target.value)}>{['15', '30', '60', '120'].map((x) => <option key={x}>{x}</option>)}</Select></Field>
            <Field label={t('Lock account after failed logins', 'Verrouiller après échecs')}><Select value={cfg.lockAfter} onChange={(e) => set('lockAfter', e.target.value)}>{['3', '5', '10'].map((x) => <option key={x}>{x}</option>)}</Select></Field>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader icon={<Lock />} title={t('Data protection & retention', 'Protection & conservation des données')} />
        <div className="space-y-3 p-5 text-[13px]">
          {[
            { en: 'Passwords', fr: 'Mots de passe', v: 'bcrypt · cost 12' },
            { en: 'ID documents & payment data', fr: 'Pièces d’identité & paiements', v: 'AES-256 at rest' },
            { en: 'Data in transit', fr: 'Données en transit', v: 'TLS 1.3' },
            { en: 'Backups', fr: 'Sauvegardes', v: t('Encrypted · daily', 'Chiffrées · quotidiennes') },
          ].map((x) => (
            <div key={x.en} className="flex items-center justify-between"><span className="text-foreground">{t(x.en, x.fr)}</span><Badge tone="ok"><Lock className="size-3" /> {x.v}</Badge></div>
          ))}
          <div className="grid grid-cols-3 gap-3 border-t pt-3">
            <Field label={t('Guest profiles (months)', 'Profils clients (mois)')}><Select value={cfg.guestData} onChange={(e) => set('guestData', e.target.value)}>{['12', '24', '36', '60'].map((x) => <option key={x}>{x}</option>)}</Select></Field>
            <Field label={t('Audit log (months)', 'Journal (mois)')}><Select value={cfg.audit} onChange={(e) => set('audit', e.target.value)}>{['12', '24', '60'].map((x) => <option key={x}>{x}</option>)}</Select></Field>
            <Field label={t('Chat transcripts (months)', 'Conversations (mois)')}><Select value={cfg.chat} onChange={(e) => set('chat', e.target.value)}>{['3', '6', '12'].map((x) => <option key={x}>{x}</option>)}</Select></Field>
          </div>
          <div className="flex items-center justify-between gap-3"><span className="text-foreground">{t('Anonymise guests after the retention period', 'Anonymiser les clients après la durée de conservation')}</span><Switch on={cfg.anonymise} label="anonymise" onChange={(v) => set('anonymise', v)} /></div>
          <Button size="sm" onClick={() => { store.dispatch({ type: 'audit', cat: 'settings', en: 'Updated security & retention settings', fr: 'Paramètres de sécurité et de conservation modifiés', risk: 'medium' }); toast.success(t('Settings saved', 'Paramètres enregistrés')); }}>{t('Save settings', 'Enregistrer')}</Button>
        </div>
      </Card>
    </div>
  );
}

export default function SecurityPage() {
  const { t } = useLanguage();
  const store = useStore();
  const [tab, setTab] = useState<'users' | 'perms' | 'audit' | 'settings'>('users');
  const active = store.users.filter((u) => u.status === 'active');
  const mfa = Math.round((store.users.filter((u) => u.mfa && u.status !== 'suspended').length / store.users.filter((u) => u.status !== 'suspended').length) * 100);
  const failed = store.audit.filter((a) => a.cat === 'auth' && a.risk).length;
  return (
    <AppShell
      title={t('Security & access', 'Sécurité & accès')}
      subtitle={t('Users, permissions, audit trail and data protection', 'Utilisateurs, permissions, journal d’audit et protection des données')}
      actions={<Segmented value={tab} onChange={setTab} options={[{ value: 'users', label: t('Users', 'Utilisateurs') }, { value: 'perms', label: t('Permissions', 'Permissions') }, { value: 'audit', label: t('Audit log', 'Journal') }, { value: 'settings', label: t('Security', 'Sécurité') }]} />}
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t('Active staff', 'Personnel actif')} value={active.length} sub={t(`${store.users.length - active.length} suspended / invited`, `${store.users.length - active.length} suspendu(s) / invité(s)`)} />
        <Stat label={t('MFA coverage', 'Couverture MFA')} value={`${mfa}%`} tone={mfa === 100 ? 'ok' : 'warn'} />
        <Stat label={t('Security alerts', 'Alertes sécurité')} value={failed} tone={failed ? 'bad' : 'ok'} sub={t('last 48 h', '48 dernières h')} />
        <Stat label={t('Audit events today', 'Événements aujourd’hui')} value={store.audit.filter((a) => a.at.toDateString() === new Date().toDateString()).length} />
      </div>
      {tab === 'users' && <Users />}
      {tab === 'perms' && <Permissions />}
      {tab === 'audit' && <AuditLog />}
      {tab === 'settings' && <Settings />}
    </AppShell>
  );
}
