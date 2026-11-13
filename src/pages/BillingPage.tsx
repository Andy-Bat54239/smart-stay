import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { isSameDay } from 'date-fns';
import { motion } from 'motion/react';
import { Banknote, CheckCircle2, Download, Loader2, Mail, Percent, Plus, Printer, ReceiptText, RotateCcw, Search, Split, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Segmented } from '@/components/ui/misc';
import { Chip, Field, Input, Select, Stat, td, th } from '@/components/ui/form';
import { ResStatusBadge } from '@/components/ui/status';
import { PAY_METHODS } from '@/components/BookingWizard';
import { Wordmark } from '@/components/Logo';
import { useLanguage } from '@/context/LanguageContext';
import { useSession } from '@/context/SessionContext';
import { folio, useStore } from '@/data/store';
import { TAX_LINES, type Charge, type Payment } from '@/data/seed2';
import type { PayMethod, Reservation } from '@/data/seed';
import { cn, compact, downloadCsv, fcfa, fmtDate, nights, sleep, today } from '@/lib/utils';

const PROMOS: Record<string, { pct: number; en: string; fr: string }> = {
  PHILO10: { pct: 10, en: 'Promo PHILO10', fr: 'Promo PHILO10' },
  FIDELE15: { pct: 15, en: 'Loyalty 15%', fr: 'Fidélité 15 %' },
  TOMBOLA: { pct: 5, en: 'Tombola winner 5%', fr: 'Gagnant tombola 5 %' },
};

type Panel = null | 'charge' | 'discount' | 'pay' | 'refund' | 'split';

function FolioView({ r }: { r: Reservation }) {
  const { t, lang } = useLanguage();
  const store = useStore();
  const { session } = useSession();
  const f = folio(r, store);
  const g = store.guest(r.guestId);
  const [panel, setPanel] = useState<Panel>(null);
  const [chg, setChg] = useState({ kind: 'service' as Charge['kind'], desc: '', amount: '' });
  const [disc, setDisc] = useState({ code: '', pct: '' });
  const [pay, setPay] = useState({ method: 'airtel' as PayMethod, amount: '', kind: 'payment' as Payment['kind'], payer: '' });
  const [busy, setBusy] = useState(false);
  const [ways, setWays] = useState(2);
  const canRefund = session?.role === 'finance' || session?.role === 'manager' || session?.role === 'admin';

  const addCharge = (kind: Charge['kind'], en: string, fr: string, amount: number) => {
    store.dispatch({ type: 'charge', charge: { id: `C${Date.now()}`, resId: r.id, at: new Date(), en, fr, amount, kind } });
  };

  const recordPayment = async (amount: number, method: PayMethod, kind: Payment['kind'], payer?: string) => {
    if (method === 'airtel' || method === 'moov') {
      setBusy(true);
      toast(t(`Push request sent to ${g?.phone}…`, `Demande envoyée au ${g?.phone}…`));
      await sleep(1600);
      setBusy(false);
    }
    store.dispatch({ type: 'pay', payment: { id: `P${Date.now()}`, resId: r.id, at: new Date(), method, amount, kind, ref: `TX${Math.floor(Math.random() * 90000 + 10000)}`, payer } });
    toast.success(amount < 0 ? t(`Refunded ${fcfa(-amount)}`, `Remboursé ${fcfa(-amount)}`) : t(`${fcfa(amount)} received`, `${fcfa(amount)} reçu`));
    setPanel(null);
  };

  const status = f.balance <= 0 ? 'paid' : f.paid > 0 ? 'partial' : 'unpaid';

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="no-print flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setPanel('charge')}><Plus /> {t('Charge', 'Débit')}</Button>
        <Button size="sm" variant="outline" onClick={() => setPanel('discount')}><Percent /> {t('Discount', 'Remise')}</Button>
        <Button size="sm" variant="outline" onClick={() => setPanel('split')}><Split /> {t('Split bill', 'Partager')}</Button>
        {canRefund && f.paid > 0 && <Button size="sm" variant="outline" onClick={() => setPanel('refund')}><RotateCcw /> {t('Refund', 'Rembourser')}</Button>}
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={() => toast.success(t(`Invoice emailed to ${g?.email}`, `Facture envoyée à ${g?.email}`))}><Mail /> {t('Email', 'Email')}</Button>
        <Button size="sm" variant="ghost" onClick={() => window.print()}><Printer /> PDF</Button>
        {f.balance > 0 ? (
          <Button size="sm" variant="gold" onClick={() => { setPay({ ...pay, amount: String(f.balance), kind: 'payment' }); setPanel('pay'); }}><Wallet /> {t('Take payment', 'Encaisser')}</Button>
        ) : r.status === 'checked-in' ? (
          <Button size="sm" onClick={() => { store.dispatch({ type: 'status', resId: r.id, status: 'checked-out' }); toast.success(t('Settled & checked out', 'Soldé et parti')); }}><CheckCircle2 /> {t('Settle & check out', 'Solder & départ')}</Button>
        ) : null}
      </div>

      {/* Inline panels */}
      {panel && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="no-print rounded-2xl border border-gold-500/40 bg-accent-soft/60 p-4">
          {panel === 'charge' && (
            <div className="grid gap-3 sm:grid-cols-[150px_1fr_140px_auto] sm:items-end">
              <Field label={t('Type', 'Type')}><Select value={chg.kind} onChange={(e) => setChg({ ...chg, kind: e.target.value as Charge['kind'] })}><option value="service">{t('Service', 'Service')}</option><option value="fnb">{t('Food & drinks', 'Restauration')}</option><option value="damage">{t('Damage', 'Dégât')}</option></Select></Field>
              <Field label={t('Description', 'Description')}><Input value={chg.desc} onChange={(e) => setChg({ ...chg, desc: e.target.value })} placeholder={t('e.g. Bar — 2 drinks', 'ex. Bar — 2 boissons')} /></Field>
              <Field label="FCFA"><Input type="number" min={0} value={chg.amount} onChange={(e) => setChg({ ...chg, amount: e.target.value })} /></Field>
              <Button disabled={!chg.desc || !+chg.amount} onClick={() => { addCharge(chg.kind, chg.desc, chg.desc, +chg.amount); setChg({ kind: 'service', desc: '', amount: '' }); setPanel(null); toast.success(t('Charge added', 'Débit ajouté')); }}>{t('Add', 'Ajouter')}</Button>
              <div className="flex flex-wrap gap-1.5 sm:col-span-4">
                {[{ en: 'Buffet', fr: 'Buffet', a: 10000, k: 'fnb' }, { en: 'Laundry', fr: 'Blanchisserie', a: 6500, k: 'service' }, { en: 'Boat tour', fr: 'Balade bateau', a: 20000, k: 'service' }, { en: 'Minibar', fr: 'Minibar', a: 4500, k: 'fnb' }].map((x) => (
                  <Chip key={x.en} active={false} onClick={() => setChg({ kind: x.k as Charge['kind'], desc: t(x.en, x.fr), amount: String(x.a) })}>{t(x.en, x.fr)} · {compact(x.a)}</Chip>
                ))}
              </div>
            </div>
          )}
          {panel === 'discount' && (
            <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto] sm:items-end">
              <Field label={t('Promo code', 'Code promo')} hint={t('Try PHILO10, FIDELE15 or TOMBOLA', 'Essayez PHILO10, FIDELE15 ou TOMBOLA')}><Input value={disc.code} onChange={(e) => setDisc({ code: e.target.value.toUpperCase(), pct: PROMOS[e.target.value.toUpperCase()] ? String(PROMOS[e.target.value.toUpperCase()].pct) : disc.pct })} /></Field>
              <Field label="%"><Input type="number" min={1} max={50} value={disc.pct} onChange={(e) => setDisc({ ...disc, pct: e.target.value })} /></Field>
              <Button
                disabled={!+disc.pct || +disc.pct > 50}
                onClick={() => {
                  const amt = -Math.round(f.subtotal * (+disc.pct / 100));
                  const p = PROMOS[disc.code];
                  addCharge('discount', p ? p.en : `Discount ${disc.pct}%`, p ? p.fr : `Remise ${disc.pct} %`, amt);
                  setDisc({ code: '', pct: '' });
                  setPanel(null);
                  toast.success(t(`Discount ${fcfa(-amt)} applied`, `Remise de ${fcfa(-amt)} appliquée`));
                }}
              >
                {t('Apply', 'Appliquer')}
              </Button>
              {+disc.pct > 15 && <p className="text-[11px] text-warn sm:col-span-3">{t('Discounts above 15% are flagged in the audit log.', 'Les remises de plus de 15 % sont signalées dans le journal d’audit.')}</p>}
            </div>
          )}
          {(panel === 'pay' || panel === 'refund') && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {PAY_METHODS.map((m) => (
                  <button key={m.id} onClick={() => setPay({ ...pay, method: m.id })} className={cn('flex items-center gap-2 rounded-xl border bg-surface px-3 py-2 text-xs font-semibold text-foreground', pay.method === m.id && 'border-gold-500 ring-2 ring-gold-500/25')}>
                    <m.icon className="size-4 text-muted" /> {t(m.en, m.fr)}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-[160px_160px_1fr_auto] sm:items-end">
                <Field label="FCFA"><Input type="number" min={0} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></Field>
                {panel === 'pay' ? (
                  <Field label={t('Type', 'Type')}><Select value={pay.kind} onChange={(e) => setPay({ ...pay, kind: e.target.value as Payment['kind'] })}><option value="payment">{t('Payment', 'Paiement')}</option><option value="deposit">{t('Deposit / pre-auth', 'Acompte / pré-autorisation')}</option></Select></Field>
                ) : <div />}
                <Field label={t('Paid by (optional)', 'Payé par (facultatif)')}><Input value={pay.payer} onChange={(e) => setPay({ ...pay, payer: e.target.value })} placeholder={g?.name} /></Field>
                <Button
                  variant={panel === 'refund' ? 'danger' : 'gold'}
                  disabled={busy || !+pay.amount || (panel === 'refund' && +pay.amount > f.paid)}
                  onClick={() => recordPayment(panel === 'refund' ? -Math.abs(+pay.amount) : +pay.amount, pay.method, panel === 'refund' ? 'refund' : pay.kind, pay.payer || undefined)}
                >
                  {busy ? <><Loader2 className="animate-spin" /> {t('Waiting for PIN…', 'Attente du code…')}</> : panel === 'refund' ? t('Refund', 'Rembourser') : t('Record', 'Enregistrer')}
                </Button>
              </div>
            </div>
          )}
          {panel === 'split' && (
            <div>
              <div className="flex items-center gap-3 text-xs">
                <span className="font-semibold text-foreground">{t('Split balance between', 'Partager le solde entre')}</span>
                {[2, 3, 4].map((n) => <Chip key={n} active={ways === n} onClick={() => setWays(n)}>{n} {t('people', 'pers.')}</Chip>)}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: ways }, (_, i) => {
                  const share = Math.ceil(Math.max(0, f.balance) / ways);
                  return (
                    <div key={i} className="rounded-xl border bg-surface p-3 text-xs">
                      <p className="font-semibold text-foreground">{i === 0 ? g?.name : `${t('Guest', 'Invité')} ${i + 1}`}</p>
                      <p className="mt-1 text-lg font-bold text-ink tabular">{fcfa(share)}</p>
                      <button className="mt-1 font-semibold text-gold-600 hover:underline dark:text-gold-300" onClick={() => toast.success(t('Payment link sent by SMS', 'Lien de paiement envoyé par SMS'))}>{t('Send Airtel/Moov link', 'Envoyer lien Airtel/Moov')}</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <button onClick={() => setPanel(null)} className="mt-3 text-[11px] font-semibold text-muted hover:text-foreground">{t('Close', 'Fermer')}</button>
        </motion.div>
      )}

      {/* Printable invoice */}
      <Card className="print-area overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b p-6">
          <Wordmark />
          <div className="text-right text-xs text-muted">
            <p className="font-display text-2xl font-semibold text-ink">{t('Invoice', 'Facture')}</p>
            <p className="font-mono">FAC-{r.ref.slice(3)}</p>
            <p>{fmtDate(new Date(), lang, 'd MMM yyyy')}</p>
          </div>
        </div>
        <div className="grid gap-4 border-b p-6 text-xs sm:grid-cols-3">
          <div><p className="font-bold uppercase tracking-wider text-muted">{t('Billed to', 'Facturé à')}</p><p className="mt-1 text-sm font-semibold text-foreground">{g?.name}</p><p className="text-muted">{g?.email}</p><p className="text-muted">{g?.phone}</p></div>
          <div><p className="font-bold uppercase tracking-wider text-muted">{t('Stay', 'Séjour')}</p><p className="mt-1 text-sm text-foreground">{fmtDate(r.checkIn, lang)} → {fmtDate(r.checkOut, lang)}</p><p className="text-muted">{nights(r.checkIn, r.checkOut)} {t('nights', 'nuits')} · {r.adults} {t('guests', 'pers.')}</p></div>
          <div className="sm:text-right"><p className="font-bold uppercase tracking-wider text-muted">{t('Booking', 'Réservation')}</p><p className="mt-1 font-mono text-sm text-foreground">{r.ref}</p><div className="mt-1 flex gap-1 sm:justify-end"><ResStatusBadge status={r.status} /><Badge tone={status === 'paid' ? 'ok' : status === 'partial' ? 'warn' : 'bad'}>{status === 'paid' ? t('Paid', 'Payée') : status === 'partial' ? t('Partly paid', 'Partielle') : t('Unpaid', 'Impayée')}</Badge></div></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-[13px]">
            <thead className="bg-surface-2"><tr><th className={th}>{t('Item', 'Désignation')}</th><th className={cn(th, 'text-right')}>{t('Qty', 'Qté')}</th><th className={cn(th, 'text-right')}>{t('Unit', 'P.U.')}</th><th className={cn(th, 'text-right')}>{t('Amount', 'Montant')}</th></tr></thead>
            <tbody>
              {f.lines.map((l, i) => (
                <tr key={i} className="border-t">
                  <td className={td}>
                    <span className={cn('text-foreground', l.kind === 'discount' && 'text-ok')}>{t(l.en, l.fr)}</span>
                    {l.kind === 'damage' && <Badge tone="bad" className="ml-2">{t('damage', 'dégât')}</Badge>}
                    {l.at && <span className="ml-2 text-[11px] text-muted">{fmtDate(l.at, lang)}</span>}
                  </td>
                  <td className={cn(td, 'text-right tabular text-muted')}>{l.qty}</td>
                  <td className={cn(td, 'text-right tabular text-muted')}>{fcfa(l.unit, false)}</td>
                  <td className={cn(td, 'text-right font-semibold tabular', l.amount < 0 ? 'text-ok' : 'text-foreground')}>{fcfa(l.amount, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-6 border-t p-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{t('Payments', 'Paiements')}</p>
            {f.payments.length ? f.payments.map((p) => {
              const m = PAY_METHODS.find((x) => x.id === p.method)!;
              return (
                <div key={p.id} className="flex items-center justify-between py-1 text-xs">
                  <span className="text-foreground">{fmtDate(p.at, lang)} · {t(m.en, m.fr)} · <span className="font-mono text-muted">{p.ref}</span> {p.kind !== 'payment' && <Badge tone={p.kind === 'refund' ? 'bad' : 'info'}>{p.kind === 'refund' ? t('refund', 'remb.') : t('deposit', 'acompte')}</Badge>}</span>
                  <span className={cn('font-semibold tabular', p.amount < 0 ? 'text-bad' : 'text-foreground')}>{fcfa(p.amount)}</span>
                </div>
              );
            }) : <p className="text-xs text-muted">{t('No payments yet.', 'Aucun paiement.')}</p>}
          </div>
          <div className="space-y-1 text-sm sm:ml-auto sm:w-64">
            <div className="flex justify-between text-muted"><span>{t('Subtotal', 'Sous-total')}</span><span className="tabular text-foreground">{fcfa(f.subtotal)}</span></div>
            <div className="flex justify-between text-muted"><span>{t('VAT 10%', 'TVA 10 %')}</span><span className="tabular text-foreground">{fcfa(f.tax)}</span></div>
            <div className="flex justify-between border-t pt-2 text-base font-bold text-ink"><span>{t('Total', 'Total TTC')}</span><span className="tabular">{fcfa(f.total)}</span></div>
            <div className="flex justify-between text-muted"><span>{t('Paid', 'Payé')}</span><span className="tabular">{fcfa(f.paid)}</span></div>
            <div className={cn('flex justify-between rounded-lg px-2 py-1.5 font-bold', f.balance > 0 ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok')}><span>{t('Balance', 'Solde')}</span><span className="tabular">{fcfa(Math.max(0, f.balance))}</span></div>
          </div>
        </div>
        <p className="border-t px-6 py-3 text-center text-[10px] text-muted">Auberge Le Philo · Ozouri, Port-Gentil · +241 074 10 60 80 · contact@lephilo.ga</p>
      </Card>
    </div>
  );
}

function Reconciliation() {
  const { t, lang } = useLanguage();
  const store = useStore();
  const [method, setMethod] = useState<PayMethod | 'all'>('all');
  const pays = [...store.payments].filter((p) => method === 'all' || p.method === method).sort((a, b) => +b.at - +a.at);
  const byMethod = PAY_METHODS.map((m) => ({ m, sum: store.payments.filter((p) => p.method === m.id).reduce((s, p) => s + p.amount, 0), n: store.payments.filter((p) => p.method === m.id).length }));
  const max = Math.max(...byMethod.map((x) => x.sum));
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <Card className="overflow-hidden">
        <CardHeader icon={<Banknote />} title={t('Payment ledger', 'Journal des paiements')} subtitle={t('Mobile money is matched automatically against operator statements', 'Le mobile money est rapproché automatiquement avec les relevés opérateurs')} />
        <div className="flex flex-wrap gap-1.5 px-5 pt-3">
          <Chip active={method === 'all'} onClick={() => setMethod('all')}>{t('All', 'Tous')}</Chip>
          {PAY_METHODS.map((m) => <Chip key={m.id} active={method === m.id} onClick={() => setMethod(m.id)}>{t(m.en, m.fr)}</Chip>)}
        </div>
        <div className="overflow-x-auto p-3">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead><tr><th className={th}>{t('Date', 'Date')}</th><th className={th}>{t('Guest', 'Client')}</th><th className={th}>{t('Method', 'Moyen')}</th><th className={th}>Ref</th><th className={cn(th, 'text-right')}>FCFA</th><th className={th}>{t('Match', 'Rappro.')}</th></tr></thead>
            <tbody>
              {pays.map((p, i) => {
                const r = store.reservations.find((x) => x.id === p.resId)!;
                const m = PAY_METHODS.find((x) => x.id === p.method)!;
                const matched = p.method === 'cash' ? i % 4 !== 1 : true;
                return (
                  <tr key={p.id} className="border-t">
                    <td className={cn(td, 'text-muted')}>{fmtDate(p.at, lang, 'd MMM HH:mm')}</td>
                    <td className={cn(td, 'font-semibold text-foreground')}>{store.guest(r.guestId)?.name} <span className="font-mono text-[11px] font-normal text-muted">{r.ref}</span></td>
                    <td className={td}>{t(m.en, m.fr)}</td>
                    <td className={cn(td, 'font-mono text-[11px] text-muted')}>{p.ref}</td>
                    <td className={cn(td, 'text-right font-semibold tabular', p.amount < 0 ? 'text-bad' : 'text-foreground')}>{fcfa(p.amount, false)}</td>
                    <td className={td}>{matched ? <Badge tone="ok">{t('Matched', 'Rapproché')}</Badge> : <Badge tone="warn">{t('Count drawer', 'Vérifier caisse')}</Badge>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <CardHeader icon={<Wallet />} title={t('Totals by method', 'Totaux par moyen')} />
        <div className="space-y-3 p-5">
          {byMethod.map(({ m, sum, n }) => (
            <div key={m.id}>
              <div className="mb-1 flex justify-between text-xs"><span className="flex items-center gap-1.5 font-semibold text-foreground"><m.icon className="size-3.5 text-muted" /> {t(m.en, m.fr)} <span className="font-normal text-muted">· {n}</span></span><span className="font-bold tabular text-foreground">{compact(sum)}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-[var(--series-1)]" style={{ width: `${max ? (sum / max) * 100 : 0}%` }} /></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function TaxSettings() {
  const { t } = useLanguage();
  const [lines, setLines] = useState(TAX_LINES.map((l) => ({ ...l, on: l.rate > 0, rate: l.rate || 0.05 })));
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader icon={<Percent />} title={t('Tax configuration', 'Configuration des taxes')} subtitle={t('Changes apply to new folios only', 'S’applique aux nouvelles factures uniquement')} />
        <div className="space-y-3 p-5">
          {lines.map((l, i) => (
            <div key={l.en} className="flex items-center gap-3 rounded-xl border p-3">
              <div className="flex-1"><p className="text-sm font-semibold text-foreground">{t(l.en, l.fr)}</p><p className="text-[11px] text-muted">{t(l.note.en, l.note.fr)}</p></div>
              <Input type="number" step={0.5} value={(l.rate * 100).toFixed(1)} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, rate: +e.target.value / 100 } : x)))} className="h-9 w-20 text-right" disabled={!l.on} />
              <span className="text-xs text-muted">%</span>
              <button role="switch" aria-checked={l.on} aria-label={l.en} onClick={() => setLines(lines.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))} className={cn('h-5 w-9 rounded-full p-0.5', l.on ? 'bg-gold-500' : 'bg-line-strong')}><span className={cn('block size-4 rounded-full bg-white transition-transform', l.on && 'translate-x-4')} /></button>
            </div>
          ))}
          <Button size="sm" onClick={() => toast.success(t('Tax settings saved', 'Taxes enregistrées'))}>{t('Save', 'Enregistrer')}</Button>
        </div>
      </Card>
      <Card>
        <CardHeader icon={<ReceiptText />} title={t('Promotions', 'Promotions')} subtitle={t('Codes guests and staff can apply', 'Codes applicables par les clients et le personnel')} />
        <div className="space-y-2 p-5">
          {Object.entries(PROMOS).map(([code, p]) => (
            <div key={code} className="flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm"><span className="font-mono font-bold text-foreground">{code}</span><span className="text-muted">{t(p.en, p.fr)}</span><Badge tone="ok">−{p.pct}%</Badge></div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function BillingPage() {
  const { t, lang } = useLanguage();
  const store = useStore();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<'folios' | 'recon' | 'settings'>('folios');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'open' | 'due' | 'paid' | 'all'>('open');

  const folios = useMemo(
    () => store.reservations.filter((r) => r.status !== 'cancelled').map((r) => ({ r, f: folio(r, store) })).sort((a, b) => b.f.balance - a.f.balance),
    [store],
  );
  const list = folios
    .filter(({ r }) => filter === 'all' || (filter === 'open' && r.status !== 'checked-out') || (filter === 'paid' && folios.find((x) => x.r.id === r.id)!.f.balance <= 0) || (filter === 'due' && folios.find((x) => x.r.id === r.id)!.f.balance > 0))
    .filter(({ r }) => !q || `${store.guest(r.guestId)?.name} ${r.ref}`.toLowerCase().includes(q.toLowerCase()));
  const selected = list.find((x) => x.r.id === params.get('folio')) ?? list[0];
  // pin the selection so it doesn't jump when balances re-sort the list
  useEffect(() => {
    if (selected && params.get('folio') !== selected.r.id) setParams({ folio: selected.r.id }, { replace: true });
  }, [selected?.r.id]); // eslint-disable-line

  const today_ = store.payments.filter((p) => isSameDay(p.at, today()));
  const collected = today_.filter((p) => p.amount > 0).reduce((s, p) => s + p.amount, 0);
  const outstanding = folios.filter((x) => x.r.status !== 'checked-out').reduce((s, x) => s + Math.max(0, x.f.balance), 0);
  const deposits = store.payments.filter((p) => p.kind === 'deposit').reduce((s, p) => s + p.amount, 0);
  const refunds = store.payments.filter((p) => p.amount < 0).reduce((s, p) => s - p.amount, 0);

  const exportCsv = () => {
    downloadCsv(`financial-report-${fmtDate(today(), 'en', 'yyyy-MM-dd')}.csv`, [
      ['Ref', 'Guest', 'Check-in', 'Check-out', 'Subtotal', 'VAT', 'Total', 'Paid', 'Balance', 'Status'],
      ...folios.map(({ r, f }) => [r.ref, store.guest(r.guestId)?.name ?? '', fmtDate(r.checkIn, 'en', 'yyyy-MM-dd'), fmtDate(r.checkOut, 'en', 'yyyy-MM-dd'), f.subtotal, f.tax, f.total, f.paid, f.balance, r.status]),
      [],
      ['Date', 'Ref', 'Method', 'Type', 'Amount', 'Transaction'],
      ...store.payments.map((p) => [fmtDate(p.at, 'en', 'yyyy-MM-dd HH:mm'), store.reservations.find((r) => r.id === p.resId)?.ref ?? '', p.method, p.kind, p.amount, p.ref]),
    ]);
    toast.success(t('Financial report exported', 'Rapport financier exporté'));
  };

  return (
    <AppShell
      title={t('Billing & payments', 'Facturation & paiements')}
      subtitle={t('Folios update live as charges and payments are recorded', 'Les factures se mettent à jour en direct')}
      actions={
        <>
          <Segmented value={tab} onChange={setTab} options={[{ value: 'folios', label: t('Folios', 'Factures') }, { value: 'recon', label: t('Reconciliation', 'Rapprochement') }, { value: 'settings', label: t('Tax & promos', 'Taxes & promos') }]} />
          <Button variant="outline" size="sm" onClick={exportCsv}><Download /> {t('Export', 'Exporter')}</Button>
        </>
      }
    >
      <div className="no-print mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t('Collected today', 'Encaissé aujourd’hui')} value={compact(collected)} sub={`${today_.length} ${t('transactions', 'transactions')}`} tone="ok" />
        <Stat label={t('Outstanding', 'À encaisser')} value={compact(outstanding)} sub="FCFA" tone={outstanding ? 'warn' : 'ok'} />
        <Stat label={t('Deposits held', 'Acomptes détenus')} value={compact(deposits)} sub="FCFA" />
        <Stat label={t('Refunds', 'Remboursements')} value={compact(refunds)} sub="FCFA" />
      </div>

      {tab === 'folios' && (
        <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
          <Card className="no-print h-fit overflow-hidden">
            <div className="space-y-2 border-b p-3">
              <div className="flex h-9 items-center gap-2 rounded-xl border bg-surface-2 px-3"><Search className="size-4 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Guest or ref…', 'Client ou réf…')} className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted" /></div>
              <div className="flex flex-wrap gap-1">{([['open', t('Open', 'Ouvertes')], ['due', t('Balance due', 'Solde dû')], ['paid', t('Paid', 'Payées')], ['all', t('All', 'Toutes')]] as const).map(([k, l]) => <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>{l}</Chip>)}</div>
            </div>
            <div className="max-h-[640px] overflow-y-auto p-2 scrollbar-thin">
              {list.map(({ r, f }) => (
                <button key={r.id} onClick={() => setParams({ folio: r.id }, { replace: true })} className={cn('w-full rounded-xl px-3 py-2.5 text-left', selected?.r.id === r.id ? 'bg-accent-soft' : 'hover:bg-surface-2')}>
                  <div className="flex items-center justify-between"><span className="text-[13px] font-semibold text-foreground">{store.guest(r.guestId)?.name}</span><span className={cn('text-xs font-bold tabular', f.balance > 0 ? 'text-warn' : 'text-ok')}>{f.balance > 0 ? compact(f.balance) : '✓'}</span></div>
                  <div className="flex justify-between text-[11px] text-muted"><span className="font-mono">{r.ref}</span><span>{fmtDate(r.checkIn, lang)} → {fmtDate(r.checkOut, lang)}</span></div>
                </button>
              ))}
              {!list.length && <p className="p-6 text-center text-xs text-muted">{t('No folios.', 'Aucune facture.')}</p>}
            </div>
          </Card>
          {selected ? <FolioView key={selected.r.id} r={selected.r} /> : <Card className="p-10 text-center text-muted">{t('Select a folio', 'Choisissez une facture')}</Card>}
        </div>
      )}
      {tab === 'recon' && <Reconciliation />}
      {tab === 'settings' && <TaxSettings />}
    </AppShell>
  );
}
