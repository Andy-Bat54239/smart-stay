import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { addDays } from 'date-fns';
import { Ban, Crown, Download, Eye, Mail, MessageCircle, Phone, Plus, Search, ShieldAlert, Sparkles, Star, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar } from '@/components/ui/misc';
import { Chip, Field, Input, Select, Stat, Textarea, td, th } from '@/components/ui/form';
import { ResStatusBadge } from '@/components/ui/status';
import { useLanguage } from '@/context/LanguageContext';
import { useSession } from '@/context/SessionContext';
import { folio, useStore } from '@/data/store';
import { seedTranscripts } from '@/data/seed2';
import type { Guest } from '@/data/seed';
import { cn, compact, downloadCsv, fcfa, fmtDate, nights, today } from '@/lib/utils';
import { tierOf } from '@/lib/loyalty';

function useGuestStats() {
  const store = useStore();
  return useMemo(() => {
    const out: Record<string, { spent: number; nights: number; inHouse: boolean; next?: Date; last?: Date }> = {};
    store.guests.forEach((g) => {
      const rs = store.reservations.filter((r) => r.guestId === g.id && r.status !== 'cancelled');
      out[g.id] = {
        spent: rs.reduce((s, r) => s + folio(r, store).total, 0) + g.stays * 140000,
        nights: rs.reduce((s, r) => s + nights(r.checkIn, r.checkOut), 0) + g.stays * 2,
        inHouse: rs.some((r) => r.status === 'checked-in'),
        next: rs.filter((r) => r.checkIn > today()).sort((a, b) => +a.checkIn - +b.checkIn)[0]?.checkIn,
        last: rs.filter((r) => r.checkIn <= today()).sort((a, b) => +b.checkIn - +a.checkIn)[0]?.checkIn,
      };
    });
    return out;
  }, [store]);
}

function Profile({ guest, onClose }: { guest: Guest | null; onClose: () => void }) {
  const { t, lang } = useLanguage();
  const store = useStore();
  const { session } = useSession();
  const g = guest ? store.guests.find((x) => x.id === guest.id) ?? guest : null;
  const [revealed, setRevealed] = useState(false);
  const [notes, setNotes] = useState<string | null>(null);
  const [newPref, setNewPref] = useState('');
  const [blReason, setBlReason] = useState('');
  const [blOpen, setBlOpen] = useState(false);
  const stats = useGuestStats();
  const canEdit = session?.role !== 'finance';
  if (!g) return <Dialog open={false} />;
  const s = stats[g.id];
  const tier = tierOf(g.loyalty);
  const stays = store.reservations.filter((r) => r.guestId === g.id).sort((a, b) => +b.checkIn - +a.checkIn);
  const comms = [
    ...stays.flatMap((r) => [
      { at: addDays(r.checkIn, -6), ch: 'email', en: `Booking confirmation ${r.ref}`, fr: `Confirmation de réservation ${r.ref}` },
      ...(r.checkIn <= addDays(today(), 2) ? [{ at: addDays(r.checkIn, -2), ch: 'whatsapp', en: 'Pre-arrival message + directions', fr: 'Message de pré-arrivée + itinéraire' }] : []),
    ]),
    ...seedTranscripts.filter((x) => x.guest === g.name).map((x) => ({ at: x.at, ch: 'chat', en: `Assistant chat: ${x.topic.en}`, fr: `Chat assistant : ${x.topic.fr}` })),
  ]
    .filter((c) => c.at <= new Date())
    .sort((a, b) => +b.at - +a.at);
  const patch = (p: Partial<Guest>) => store.dispatch({ type: 'guest', id: g.id, patch: p });

  return (
    <Dialog open={!!guest} onOpenChange={(o) => { if (!o) { onClose(); setRevealed(false); setNotes(null); setBlOpen(false); } }}>
      <DialogContent side="right" className="max-w-lg" title={g.name} description={`${g.nationality} · ${t('guest since', 'client depuis')} ${fmtDate(addDays(today(), -(g.stays * 60 + 30)), lang, 'MMM yyyy')}`}>
        <div className="space-y-5 p-6">
          {g.blacklisted && (
            <div className="flex items-start gap-3 rounded-2xl border border-bad/30 bg-bad-soft p-3 text-xs">
              <ShieldAlert className="mt-0.5 size-4 text-bad" />
              <div className="flex-1"><p className="font-bold text-bad">{t('Blacklisted', 'Liste noire')}</p><p className="text-foreground">{g.blacklisted.reason}</p></div>
              {canEdit && <button className="font-semibold text-muted hover:text-foreground" onClick={() => { patch({ blacklisted: undefined }); toast(t('Removed from blacklist', 'Retiré de la liste noire')); }}>{t('Remove', 'Retirer')}</button>}
            </div>
          )}
          <div className="flex items-center gap-4">
            <Avatar name={g.name} size={56} />
            <div className="min-w-0 flex-1 space-y-0.5 text-xs text-muted">
              <p className="flex items-center gap-1.5"><Mail className="size-3" /> {g.email}</p>
              <p className="flex items-center gap-1.5"><Phone className="size-3" /> {g.phone}</p>
              <p>{g.address ?? '—'}</p>
              <p className="flex items-center gap-1.5">
                {g.idType ?? 'ID'}: <span className="font-mono text-foreground">{revealed ? g.idNumber : '••••••' + (g.idNumber ?? '').slice(-3)}</span>
                {!revealed && (
                  <button className="flex items-center gap-1 font-semibold text-gold-600 dark:text-gold-300" onClick={() => { setRevealed(true); store.dispatch({ type: 'audit', cat: 'guest-data', en: `Viewed ID document of ${g.name}`, fr: `Pièce d’identité de ${g.name} consultée` }); }}>
                    <Eye className="size-3" /> {t('Reveal (logged)', 'Afficher (journalisé)')}
                  </button>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Stat label={t('Stays', 'Séjours')} value={g.stays + stays.filter((r) => r.status !== 'cancelled').length} />
            <Stat label={t('Nights', 'Nuits')} value={s.nights} />
            <Stat label={t('Spent', 'Dépensé')} value={compact(s.spent)} sub="FCFA" />
          </div>

          <div className="rounded-2xl border bg-gradient-to-br from-accent-soft to-transparent p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-bold text-ink"><Crown className="size-3.5" /> {t(tier.en, tier.fr)} · {g.loyalty} pts</span>
              {canEdit && <button className="font-semibold text-muted hover:text-foreground" onClick={() => { patch({ loyalty: g.loyalty + 250 }); toast.success(t('+250 goodwill points', '+250 points offerts')); }}>+250 {t('goodwill', 'geste')}</button>}
            </div>
            {tier.next && (
              <>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line-strong"><div className="h-full rounded-full bg-gold-500" style={{ width: `${(g.loyalty / tier.next) * 100}%` }} /></div>
                <p className="mt-1 text-[11px] text-muted">{tier.next - g.loyalty} {t('pts to next tier', 'pts avant le niveau suivant')}</p>
              </>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-muted">{t('Preferences', 'Préférences')}</p>
            <div className="flex flex-wrap gap-1.5">
              {g.preferences.map((p) => (
                <span key={p} className="flex items-center gap-1 rounded-full border bg-surface-2 px-2.5 py-1 text-xs text-foreground">
                  {p}{canEdit && <button aria-label={`Remove ${p}`} onClick={() => patch({ preferences: g.preferences.filter((x) => x !== p) })}><X className="size-3 text-muted" /></button>}
                </span>
              ))}
              {canEdit && (
                <form onSubmit={(e) => { e.preventDefault(); if (newPref.trim()) { patch({ preferences: [...g.preferences, newPref.trim()] }); setNewPref(''); } }} className="flex items-center gap-1">
                  <input value={newPref} onChange={(e) => setNewPref(e.target.value)} placeholder={t('Add…', 'Ajouter…')} className="h-7 w-24 rounded-full border bg-surface px-2.5 text-xs outline-none focus:border-gold-500" />
                </form>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-muted">{t('Notes & special requests', 'Notes & demandes spéciales')}</p>
            <Textarea value={notes ?? g.notes ?? ''} onChange={(e) => setNotes(e.target.value)} disabled={!canEdit} placeholder={t('e.g. allergic to peanuts, celebrates anniversary in June…', 'ex. allergie aux arachides, anniversaire en juin…')} />
            {notes !== null && notes !== (g.notes ?? '') && <Button size="sm" className="mt-2" onClick={() => { patch({ notes }); setNotes(null); toast.success(t('Notes saved', 'Notes enregistrées')); }}>{t('Save notes', 'Enregistrer')}</Button>}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-muted">{t('Stay history', 'Historique des séjours')}</p>
            <div className="space-y-1.5">
              {stays.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border px-3 py-2 text-xs">
                  <span className="w-14 font-mono text-muted">{store.room(r.roomId)?.number ?? '—'}</span>
                  <span className="flex-1 text-foreground">{fmtDate(r.checkIn, lang)} → {fmtDate(r.checkOut, lang)}</span>
                  <span className="tabular text-muted">{fcfa(folio(r, store).total)}</span>
                  <ResStatusBadge status={r.status} />
                </div>
              ))}
              {g.stays > 0 && <p className="text-[11px] text-muted">+ {g.stays} {t('earlier stays (archived)', 'séjours antérieurs (archivés)')}</p>}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-muted">{t('Communication log', 'Historique des échanges')}</p>
            <div className="space-y-1">
              {comms.slice(0, 8).map((c, i) => (
                <div key={i} className="flex items-center gap-3 px-1 py-1.5 text-xs">
                  <span className="grid size-6 place-items-center rounded-lg bg-surface-2 text-muted">{c.ch === 'email' ? <Mail className="size-3" /> : <MessageCircle className="size-3" />}</span>
                  <span className="flex-1 text-foreground">{t(c.en, c.fr)}</span>
                  <span className="text-muted">{fmtDate(c.at, lang)}</span>
                </div>
              ))}
              {!comms.length && <p className="text-xs text-muted">{t('No messages yet.', 'Aucun message.')}</p>}
            </div>
          </div>

          {canEdit && !g.blacklisted && (
            blOpen ? (
              <div className="rounded-2xl border border-bad/30 p-4">
                <Field label={t('Reason for blacklisting', 'Motif de la liste noire')}><Input value={blReason} onChange={(e) => setBlReason(e.target.value)} /></Field>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="danger" disabled={blReason.trim().length < 4} onClick={() => { patch({ blacklisted: { reason: blReason, at: new Date() } }); setBlOpen(false); toast(t('Guest blacklisted — bookings will be flagged', 'Client sur liste noire — les réservations seront signalées')); }}>{t('Confirm', 'Confirmer')}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setBlOpen(false)}>{t('Cancel', 'Annuler')}</Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setBlOpen(true)} className="flex items-center gap-1.5 text-xs font-semibold text-bad hover:underline"><Ban className="size-3.5" /> {t('Add to blacklist…', 'Mettre sur liste noire…')}</button>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WalkIn({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useLanguage();
  const store = useStore();
  const [f, setF] = useState({ name: '', phone: '', email: '', nationality: 'Gabon', idType: 'CNI' as 'CNI' | 'Passport', idNumber: '', address: '' });
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const dup = store.guests.find((g) => (f.phone && g.phone.replace(/\D/g, '').endsWith(f.phone.replace(/\D/g, '').slice(-6)) && f.phone.replace(/\D/g, '').length >= 6) || (f.email && g.email === f.email));
  const ok = f.name.trim().length > 2 && f.phone.replace(/\D/g, '').length >= 8 && f.idNumber.length >= 5;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t('Register walk-in guest', 'Enregistrer un client')} description={t('ID is required for check-in in Gabon', 'La pièce d’identité est requise pour l’enregistrement')}>
        <div className="grid gap-3 p-6 sm:grid-cols-2">
          <Field label={t('Full name', 'Nom complet')} className="sm:col-span-2"><Input value={f.name} onChange={up('name')} autoFocus /></Field>
          <Field label={t('Phone', 'Téléphone')}><Input value={f.phone} onChange={up('phone')} placeholder="+241 07 …" /></Field>
          <Field label="Email"><Input type="email" value={f.email} onChange={up('email')} /></Field>
          <Field label={t('Nationality', 'Nationalité')}><Input value={f.nationality} onChange={up('nationality')} /></Field>
          <Field label={t('ID', 'Pièce')}>
            <div className="flex gap-2"><Select value={f.idType} onChange={up('idType')} className="w-28"><option>CNI</option><option value="Passport">{t('Passport', 'Passeport')}</option></Select><Input value={f.idNumber} onChange={up('idNumber')} /></div>
          </Field>
          <Field label={t('Address', 'Adresse')} className="sm:col-span-2"><Input value={f.address} onChange={up('address')} /></Field>
          {dup && (
            <p className="flex items-center gap-2 rounded-xl bg-ai-soft px-3 py-2 text-xs text-foreground sm:col-span-2"><Sparkles className="size-3.5 text-ai" /> {t(`Possible duplicate: ${dup.name} already has a profile.`, `Doublon possible : ${dup.name} a déjà un profil.`)}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t bg-surface-2 px-6 py-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('Cancel', 'Annuler')}</Button>
          <Button
            disabled={!ok}
            onClick={() => {
              store.dispatch({ type: 'guest-add', guest: { id: `G${Date.now()}`, name: f.name.trim(), phone: f.phone, email: f.email, nationality: f.nationality, idType: f.idType, idNumber: f.idNumber, address: f.address, loyalty: 0, stays: 0, preferences: [] } });
              toast.success(t(`${f.name} registered`, `${f.name} enregistré(e)`));
              setF({ name: '', phone: '', email: '', nationality: 'Gabon', idType: 'CNI', idNumber: '', address: '' });
              onOpenChange(false);
            }}
          >
            <UserPlus /> {t('Register', 'Enregistrer')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function GuestsPage() {
  const { t, lang } = useLanguage();
  const store = useStore();
  const stats = useGuestStats();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'inhouse' | 'vip' | 'upcoming' | 'blacklist'>('all');
  const [nat, setNat] = useState('all');
  const [walkIn, setWalkIn] = useState(false);
  const [sort, setSort] = useState<'name' | 'spent' | 'loyalty'>('spent');

  const nationalities = [...new Set(store.guests.map((g) => g.nationality))];
  const list = store.guests
    .filter((g) => !q || `${g.name} ${g.email} ${g.phone}`.toLowerCase().includes(q.toLowerCase()))
    .filter((g) => nat === 'all' || g.nationality === nat)
    .filter((g) => filter === 'all' || (filter === 'inhouse' && stats[g.id]?.inHouse) || (filter === 'vip' && g.vip) || (filter === 'upcoming' && stats[g.id]?.next) || (filter === 'blacklist' && g.blacklisted))
    .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : sort === 'loyalty' ? b.loyalty - a.loyalty : (stats[b.id]?.spent ?? 0) - (stats[a.id]?.spent ?? 0)));
  const open = store.guests.find((g) => g.id === params.get('guest')) ?? null;

  const exportCsv = () => {
    downloadCsv(`guests-${fmtDate(today(), 'en', 'yyyy-MM-dd')}.csv`, [
      ['Name', 'Email', 'Phone', 'Nationality', 'Loyalty', 'Tier', 'Nights', 'Spent FCFA', 'VIP', 'Blacklisted'],
      ...list.map((g) => [g.name, g.email, g.phone, g.nationality, g.loyalty, tierOf(g.loyalty).en, stats[g.id].nights, stats[g.id].spent, g.vip ? 'yes' : '', g.blacklisted ? 'yes' : '']),
    ]);
    store.dispatch({ type: 'audit', cat: 'guest-data', en: `Exported guest list (${list.length} rows)`, fr: `Liste clients exportée (${list.length} lignes)`, risk: 'medium' });
    toast.success(t('Guest report exported', 'Rapport clients exporté'));
  };

  const inHouse = store.guests.filter((g) => stats[g.id]?.inHouse).length;
  const repeat = store.guests.filter((g) => g.stays > 0).length;

  return (
    <AppShell
      title={t('Guests', 'Clients')}
      subtitle={t(`${store.guests.length} profiles · ${inHouse} in-house now`, `${store.guests.length} profils · ${inHouse} présents`)}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download /> CSV</Button>
          <Button size="sm" onClick={() => setWalkIn(true)}><Plus /> {t('Walk-in guest', 'Nouveau client')}</Button>
        </>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t('Total guests', 'Clients')} value={store.guests.length} />
        <Stat label={t('In-house', 'Présents')} value={inHouse} />
        <Stat label={t('Repeat guests', 'Clients fidèles')} value={`${Math.round((repeat / store.guests.length) * 100)}%`} sub={t(`${repeat} have stayed before`, `${repeat} déjà venus`)} />
        <Stat label={t('Loyalty points issued', 'Points distribués')} value={compact(store.guests.reduce((s, g) => s + g.loyalty, 0))} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-xl border bg-surface px-3 sm:max-w-xs">
          <Search className="size-4 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Name, email or phone…', 'Nom, email ou téléphone…')} className="flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted" />
        </div>
        {([['all', t('All', 'Tous')], ['inhouse', t('In-house', 'Présents')], ['upcoming', t('Arriving soon', 'Arrivées')], ['vip', 'VIP'], ['blacklist', t('Blacklist', 'Liste noire')]] as const).map(([k, l]) => (
          <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>{l}</Chip>
        ))}
        <Select value={nat} onChange={(e) => setNat(e.target.value)} className="h-9 w-auto text-xs"><option value="all">{t('All nationalities', 'Toutes nationalités')}</option>{nationalities.map((n) => <option key={n}>{n}</option>)}</Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-9 w-auto text-xs" aria-label="Sort">
          <option value="spent">{t('Sort: top spenders', 'Tri : meilleurs clients')}</option>
          <option value="loyalty">{t('Sort: loyalty', 'Tri : fidélité')}</option>
          <option value="name">{t('Sort: name', 'Tri : nom')}</option>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-[13px]">
            <thead className="border-b bg-surface-2"><tr><th className={th}>{t('Guest', 'Client')}</th><th className={th}>{t('Nationality', 'Nationalité')}</th><th className={th}>{t('Loyalty', 'Fidélité')}</th><th className={th}>{t('Last / next stay', 'Dernier / prochain')}</th><th className={cn(th, 'text-right')}>{t('Lifetime spend', 'Total dépensé')}</th><th className={th}></th></tr></thead>
            <tbody>
              {list.map((g) => {
                const s = stats[g.id];
                const tier = tierOf(g.loyalty);
                return (
                  <tr key={g.id} onClick={() => setParams({ guest: g.id }, { replace: true })} className={cn('cursor-pointer border-b last:border-0 hover:bg-surface-2', g.blacklisted && 'bg-bad-soft/40')}>
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <Avatar name={g.name} size={34} />
                        <div><p className="font-semibold text-foreground">{g.name} {g.vip && <Star className="inline size-3 fill-gold-500 text-gold-500" />}</p><p className="text-[11px] text-muted">{g.email}</p></div>
                      </div>
                    </td>
                    <td className={cn(td, 'text-muted')}>{g.nationality}</td>
                    <td className={td}><Badge tone={tier.en === 'Gold' || tier.en === 'Platinum' ? 'gold' : 'neutral'}>{t(tier.en, tier.fr)}</Badge> <span className="text-[11px] text-muted tabular">{g.loyalty}</span></td>
                    <td className={cn(td, 'text-xs text-muted')}>{s.last ? fmtDate(s.last, lang) : '—'} / {s.next ? <span className="font-semibold text-foreground">{fmtDate(s.next, lang)}</span> : '—'}</td>
                    <td className={cn(td, 'text-right font-semibold text-foreground tabular')}>{fcfa(s.spent)}</td>
                    <td className={td}>
                      <div className="flex justify-end gap-1">
                        {s.inHouse && <Badge tone="info" dot>{t('In-house', 'Présent')}</Badge>}
                        {g.blacklisted && <Badge tone="bad"><Ban className="size-3" /> {t('Blacklist', 'Liste noire')}</Badge>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan={6} className="py-12 text-center text-muted">{t('No guests match.', 'Aucun client.')}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Profile guest={open} onClose={() => setParams({}, { replace: true })} />
      <WalkIn open={walkIn} onOpenChange={setWalkIn} />
    </AppShell>
  );
}
