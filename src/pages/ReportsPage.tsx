import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, subMonths, subWeeks, subYears } from 'date-fns';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, CalendarClock, Download, FileText, Globe2, LayoutGrid, Moon, Plus, Printer, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { Kpi } from '@/components/dashboard/widgets';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Segmented } from '@/components/ui/misc';
import { Chip, Field, Input, Select, td, th } from '@/components/ui/form';
import { useLanguage } from '@/context/LanguageContext';
import { useStore } from '@/data/store';
import { channelMix, MODEL_INFO, revenueByMonth, seedRooms } from '@/data/seed';
import { LOS_DIST, NATIONALITY_MIX } from '@/data/seed2';
import { cn, compact, downloadCsv, fcfa, fmtDate, today } from '@/lib/utils';
import { Activity, BedDouble, Coins, Percent } from 'lucide-react';

const COST_RATIO = 0.58; // operating costs as share of revenue (demo assumption)
const ROOMS = seedRooms.length;

function rng(seed: number) {
  return () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
}

type Grain = 'day' | 'week' | 'month' | 'year';
function series(grain: Grain, lang: 'en' | 'fr') {
  const r = rng(grain.length * 13 + 5);
  if (grain === 'month') return revenueByMonth.map((m) => ({ label: fmtDate(m.month, lang, 'MMM'), rooms: m.rooms, services: m.services }));
  const n = grain === 'day' ? 30 : grain === 'week' ? 12 : 4;
  return Array.from({ length: n }, (_, i) => {
    const d = grain === 'day' ? addDays(today(), -(n - 1 - i)) : grain === 'week' ? subWeeks(today(), n - 1 - i) : subYears(today(), n - 1 - i);
    const scale = grain === 'day' ? 420_000 : grain === 'week' ? 2_900_000 : 120_000_000 + i * 18_000_000;
    const wk = grain === 'day' && (d.getDay() === 5 || d.getDay() === 6) ? 1.6 : 1;
    const rooms = Math.round(scale * (0.75 + r() * 0.5) * wk);
    return { label: grain === 'year' ? fmtDate(d, lang, 'yyyy') : fmtDate(d, lang, grain === 'day' ? 'd MMM' : "'W'w"), rooms, services: Math.round(rooms * (0.18 + r() * 0.08)) };
  });
}

const WIDGETS = ['revenue', 'channels', 'nationality', 'los', 'accuracy'] as const;
type Widget = (typeof WIDGETS)[number];
const WIDGET_LABEL: Record<Widget, { en: string; fr: string }> = {
  revenue: { en: 'Revenue trend', fr: 'Tendance du CA' },
  channels: { en: 'Channels', fr: 'Canaux' },
  nationality: { en: 'Nationalities', fr: 'Nationalités' },
  los: { en: 'Length of stay', fr: 'Durée de séjour' },
  accuracy: { en: 'Forecast accuracy', fr: 'Précision prévision' },
};

function useWidgets() {
  const [on, setOn] = useState<Widget[]>(() => {
    try {
      const v = JSON.parse(localStorage.getItem('smartstay_bi_widgets') ?? 'null');
      return Array.isArray(v) ? v : [...WIDGETS];
    } catch {
      return [...WIDGETS];
    }
  });
  const toggle = (w: Widget) => {
    const next = on.includes(w) ? on.filter((x) => x !== w) : [...on, w];
    setOn(next);
    try {
      localStorage.setItem('smartstay_bi_widgets', JSON.stringify(next));
    } catch {}
  };
  return [on, toggle] as const;
}

const tip = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 };

function ExecSummary() {
  const { t, lang } = useLanguage();
  const store = useStore();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const timer = useRef<number>(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const generate = () => {
    const m = revenueByMonth[revenueByMonth.length - 1];
    const p = revenueByMonth[revenueByMonth.length - 2];
    const rev = m.rooms + m.services;
    const g = ((rev - p.rooms - p.services) / (p.rooms + p.services)) * 100;
    const unassigned = store.reservations.filter((r) => !r.roomId && r.status !== 'cancelled').length;
    const top = [...channelMix].sort((a, b) => b.share - a.share)[0];
    const full = lang === 'en'
      ? `Executive summary — ${fmtDate(today(), 'en', 'MMMM yyyy')}\n\nRevenue this month stands at ${fcfa(rev)}, ${g >= 0 ? 'up' : 'down'} ${Math.abs(g).toFixed(1)}% on last month; services and F&B contribute ${Math.round((m.services / rev) * 100)}%. Direct bookings remain the strongest channel (${top.share}%), keeping commission costs low.\n\nThe forecast model is running at ${MODEL_INFO.accuracy}% accuracy. Weekends and the upcoming end-of-year holidays drive peaks; VIP rooms are the first to sell out, so a +10% weekend VIP rate is recommended.\n\nWatch points: ${unassigned} booking(s) still need a room, towel and soap-kit stock is below 40%, and one staff account was suspended after failed logins.\n\nRecommended actions: approve the AI weekend pricing, launch a TikTok/WhatsApp promotion for weekdays to lift Solo occupancy, and reorder linen before Friday.`
      : `Synthèse — ${fmtDate(today(), 'fr', 'MMMM yyyy')}\n\nLe chiffre d’affaires du mois atteint ${fcfa(rev)}, ${g >= 0 ? 'en hausse' : 'en baisse'} de ${Math.abs(g).toFixed(1).replace('.', ',')} % sur le mois précédent ; services et restauration représentent ${Math.round((m.services / rev) * 100)} %. Les réservations directes restent le premier canal (${top.share} %), ce qui limite les commissions.\n\nLe modèle de prévision affiche ${MODEL_INFO.accuracy.toString().replace('.', ',')} % de précision. Les week-ends et les fêtes de fin d’année créent les pics ; les chambres VIP partent en premier, d’où une hausse recommandée de 10 % le week-end.\n\nPoints de vigilance : ${unassigned} réservation(s) sans chambre, stock de serviettes et de kits sous 40 %, et un compte du personnel suspendu après des échecs de connexion.\n\nActions recommandées : valider la tarification IA du week-end, lancer une promotion TikTok/WhatsApp en semaine pour les chambres Solo, et commander du linge avant vendredi.`;
    setBusy(true);
    setText('');
    let i = 0;
    const step = () => {
      i += 6;
      setText(full.slice(0, i));
      if (i < full.length) timer.current = window.setTimeout(step, 12);
      else setBusy(false);
    };
    timer.current = window.setTimeout(step, 500);
  };
  return (
    <Card className="print-area">
      <CardHeader
        icon={<Sparkles />}
        title={t('AI executive summary', 'Synthèse IA')}
        subtitle={t('Written from this month’s live data', 'Rédigée à partir des données du mois')}
        action={
          <div className="no-print flex gap-2">
            {text && !busy && <Button size="sm" variant="ghost" onClick={() => window.print()}><Printer /> PDF</Button>}
            <Button size="sm" variant="ai" onClick={generate} disabled={busy}><Wand2 /> {text ? t('Regenerate', 'Régénérer') : t('Generate', 'Générer')}</Button>
          </div>
        }
      />
      <div className="p-5">
        {text ? (
          <div className="whitespace-pre-line rounded-2xl border bg-surface-2 p-5 text-[13px] leading-relaxed text-foreground">
            {text}
            {busy && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-ai align-middle" />}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted">{t('One click turns the dashboards below into a board-ready summary.', 'Un clic transforme les tableaux ci-dessous en synthèse prête pour la direction.')}</p>
        )}
      </div>
    </Card>
  );
}

function ReportBuilder() {
  const { t, lang } = useLanguage();
  const store = useStore();
  const [dim, setDim] = useState<'month' | 'channel' | 'type' | 'nationality'>('month');
  const [metrics, setMetrics] = useState<string[]>(['revenue', 'nights']);
  const M = [
    { id: 'revenue', en: 'Revenue (FCFA)', fr: 'CA (FCFA)' },
    { id: 'nights', en: 'Room-nights', fr: 'Nuitées' },
    { id: 'bookings', en: 'Bookings', fr: 'Réservations' },
    { id: 'adr', en: 'ADR', fr: 'Prix moyen' },
  ];
  const rows = useMemo(() => {
    const r = rng(dim.length * 7);
    const keys =
      dim === 'month' ? revenueByMonth.map((m) => fmtDate(m.month, lang, 'MMM yyyy'))
      : dim === 'channel' ? channelMix.map((c) => c.channel)
      : dim === 'type' ? ['Solo', 'Duo', 'VIP', 'Standard']
      : NATIONALITY_MIX.map((n) => (lang === 'en' ? n.en : n.fr));
    return keys.map((k, i) => {
      const nights = Math.round(40 + r() * 120 + (dim === 'month' ? i * 6 : 0));
      const adr = Math.round(55000 + r() * 35000);
      return { k, revenue: nights * adr, nights, bookings: Math.round(nights / 2.3), adr };
    });
  }, [dim, lang]);
  const exportIt = () => {
    downloadCsv(`report-${dim}-${fmtDate(today(), 'en', 'yyyy-MM-dd')}.csv`, [[dim, ...metrics], ...rows.map((r) => [r.k, ...metrics.map((m) => r[m as 'revenue'])])]);
    store.dispatch({ type: 'audit', cat: 'settings', en: `Exported custom report (${dim})`, fr: `Rapport personnalisé exporté (${dim})` });
    toast.success(t('Report exported (opens in Excel)', 'Rapport exporté (ouvrable dans Excel)'));
  };
  return (
    <Card className="print-area">
      <CardHeader icon={<LayoutGrid />} title={t('Custom report builder', 'Générateur de rapports')} subtitle={t('Pick a breakdown and metrics — preview updates live', 'Choisissez un axe et des mesures — aperçu en direct')} action={<div className="no-print flex gap-2"><Button size="sm" variant="ghost" onClick={() => window.print()}><Printer /> PDF</Button><Button size="sm" variant="outline" onClick={exportIt}><Download /> Excel</Button></div>} />
      <div className="no-print flex flex-wrap items-center gap-2 px-5 pt-4">
        <span className="text-xs font-semibold text-muted">{t('By', 'Par')}</span>
        {([['month', t('Month', 'Mois')], ['channel', t('Channel', 'Canal')], ['type', t('Room type', 'Type')], ['nationality', t('Nationality', 'Nationalité')]] as const).map(([k, l]) => <Chip key={k} active={dim === k} onClick={() => setDim(k)}>{l}</Chip>)}
        <span className="ml-3 text-xs font-semibold text-muted">{t('Show', 'Afficher')}</span>
        {M.map((m) => <Chip key={m.id} active={metrics.includes(m.id)} onClick={() => setMetrics(metrics.includes(m.id) ? metrics.filter((x) => x !== m.id) : [...metrics, m.id])}>{t(m.en, m.fr)}</Chip>)}
      </div>
      <div className="overflow-x-auto p-3">
        <table className="w-full text-[13px]">
          <thead><tr><th className={th}>{t('Breakdown', 'Axe')}</th>{metrics.map((m) => <th key={m} className={cn(th, 'text-right')}>{t(M.find((x) => x.id === m)!.en, M.find((x) => x.id === m)!.fr)}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.k} className="border-t">
                <td className={cn(td, 'font-semibold capitalize text-foreground')}>{r.k}</td>
                {metrics.map((m) => <td key={m} className={cn(td, 'text-right tabular')}>{m === 'revenue' || m === 'adr' ? fcfa(r[m as 'revenue'], false) : r[m as 'nights']}</td>)}
              </tr>
            ))}
            <tr className="border-t-2 font-bold">
              <td className={cn(td, 'text-foreground')}>{t('Total', 'Total')}</td>
              {metrics.map((m) => <td key={m} className={cn(td, 'text-right tabular text-foreground')}>{m === 'adr' ? fcfa(Math.round(rows.reduce((s, r) => s + r.revenue, 0) / rows.reduce((s, r) => s + r.nights, 0)), false) : m === 'revenue' ? fcfa(rows.reduce((s, r) => s + r.revenue, 0), false) : rows.reduce((s, r) => s + r[m as 'nights'], 0)}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Schedules() {
  const { t } = useLanguage();
  const [list, setList] = useState([
    { id: 1, name: t('Weekly forecast', 'Prévision hebdomadaire'), freq: 'weekly', when: t('Monday 08:00', 'Lundi 8h'), to: 'sophie@lephilo.ga', fmt: 'PDF' },
    { id: 2, name: t('Monthly financial report', 'Rapport financier mensuel'), freq: 'monthly', when: t('1st of month 07:00', '1er du mois 7h'), to: 'pierre@lephilo.ga', fmt: 'Excel' },
    { id: 3, name: t('Daily arrivals & departures', 'Arrivées & départs du jour'), freq: 'daily', when: '06:30', to: 'reception@lephilo.ga', fmt: 'PDF' },
  ]);
  const [f, setF] = useState({ name: '', freq: 'weekly', to: '', fmt: 'PDF' });
  return (
    <Card>
      <CardHeader icon={<CalendarClock />} title={t('Scheduled reports', 'Rapports programmés')} subtitle={t('Delivered automatically by email', 'Envoyés automatiquement par email')} />
      <div className="space-y-2 p-5">
        {list.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-xs">
            <FileText className="size-4 text-muted" />
            <div className="min-w-0 flex-1"><p className="font-semibold text-foreground">{s.name}</p><p className="truncate text-muted">{s.when} → {s.to}</p></div>
            <Badge tone="neutral">{s.fmt}</Badge>
            <button aria-label="Delete schedule" onClick={() => setList(list.filter((x) => x.id !== s.id))}><Trash2 className="size-3.5 text-muted hover:text-bad" /></button>
          </div>
        ))}
        <form className="grid gap-2 pt-2 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); setList([...list, { id: Date.now(), name: f.name, freq: f.freq, when: f.freq === 'daily' ? '07:00' : f.freq === 'weekly' ? t('Monday 08:00', 'Lundi 8h') : t('1st of month', '1er du mois'), to: f.to, fmt: f.fmt }]); setF({ name: '', freq: 'weekly', to: '', fmt: 'PDF' }); toast.success(t('Schedule created', 'Programmation créée')); }}>
          <Field label={t('Report', 'Rapport')}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={t('e.g. Channel performance', 'ex. Performance des canaux')} /></Field>
          <Field label={t('Send to', 'Destinataire')}><Input type="email" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} placeholder="name@lephilo.ga" /></Field>
          <Field label={t('Frequency', 'Fréquence')}><Select value={f.freq} onChange={(e) => setF({ ...f, freq: e.target.value })}><option value="daily">{t('Daily', 'Quotidien')}</option><option value="weekly">{t('Weekly', 'Hebdomadaire')}</option><option value="monthly">{t('Monthly', 'Mensuel')}</option></Select></Field>
          <Field label={t('Format', 'Format')}><Select value={f.fmt} onChange={(e) => setF({ ...f, fmt: e.target.value })}><option>PDF</option><option>Excel</option></Select></Field>
          <Button type="submit" size="sm" className="sm:col-span-2" disabled={!f.name || !/^\S+@\S+\.\S+$/.test(f.to)}><Plus /> {t('Add schedule', 'Programmer')}</Button>
        </form>
      </div>
    </Card>
  );
}

export default function ReportsPage() {
  const { t, lang } = useLanguage();
  const [grain, setGrain] = useState<Grain>('month');
  const [on, toggle] = useWidgets();
  const data = useMemo(() => series(grain, lang), [grain, lang]);

  const m = revenueByMonth[revenueByMonth.length - 1];
  const p = revenueByMonth[revenueByMonth.length - 2];
  const rev = m.rooms + m.services;
  const days = 30;
  const occ = 63.4;
  const soldNights = Math.round((occ / 100) * ROOMS * days);
  const adr = m.rooms / soldNights;
  const revpar = m.rooms / (ROOMS * days);
  const goppar = (rev * (1 - COST_RATIO)) / (ROOMS * days);
  const growth = ((rev - p.rooms - p.services) / (p.rooms + p.services)) * 100;

  const chLabel: Record<string, { en: string; fr: string }> = { direct: { en: 'Direct (web & app)', fr: 'Direct (site & app)' }, phone: { en: 'Phone / WhatsApp', fr: 'Téléphone / WhatsApp' }, ota: { en: 'OTA', fr: 'OTA' }, 'walk-in': { en: 'Walk-in', fr: 'Sans réservation' } };

  return (
    <AppShell
      title={t('Reports & business intelligence', 'Rapports & business intelligence')}
      subtitle={t(`Month to date · ${fmtDate(subMonths(today(), 0), lang, 'MMMM yyyy')}`, `Mois en cours · ${fmtDate(today(), lang, 'MMMM yyyy')}`)}
      actions={
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-muted">{t('Widgets:', 'Widgets :')}</span>
          {WIDGETS.map((w) => <Chip key={w} active={on.includes(w)} onClick={() => toggle(w)}>{t(WIDGET_LABEL[w].en, WIDGET_LABEL[w].fr)}</Chip>)}
        </div>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label={t('Occupancy rate', 'Taux d’occupation')} value={occ} format={(n) => `${n.toFixed(1)}%`} icon={<Percent />} delta={3.1} hint={t('vs last month', 'vs mois dernier')} />
        <Kpi label={t('ADR', 'Prix moyen (ADR)')} value={adr} format={(n) => compact(n)} icon={<BedDouble />} hint="FCFA" />
        <Kpi label="RevPAR" value={revpar} format={(n) => compact(n)} icon={<Activity />} hint="FCFA" />
        <Kpi label="GOPPAR" value={goppar} format={(n) => compact(n)} icon={<Coins />} delta={growth} hint={t(`costs ${Math.round(COST_RATIO * 100)}% (demo)`, `coûts ${Math.round(COST_RATIO * 100)} % (démo)`)} />
      </div>

      <div className="space-y-5">
        <ExecSummary />

        {on.includes('revenue') && (
          <Card>
            <CardHeader icon={<BarChart3 />} title={t('Revenue trend', 'Évolution du chiffre d’affaires')} action={<Segmented value={grain} onChange={setGrain} options={[{ value: 'day', label: t('Daily', 'Jour') }, { value: 'week', label: t('Weekly', 'Semaine') }, { value: 'month', label: t('Monthly', 'Mois') }, { value: 'year', label: t('Yearly', 'Année') }]} />} />
            <div className="flex gap-4 px-5 pt-3 text-[11px] font-semibold text-muted">
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[var(--series-1)]" /> {t('Rooms', 'Chambres')}</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[var(--series-2)]" /> {t('Services & F&B', 'Services & restauration')}</span>
            </div>
            <div className="h-[260px] px-2 pb-3 pt-2">
              <ResponsiveContainer>
                <AreaChart data={data} margin={{ top: 8, right: 16, left: -4, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} minTickGap={16} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={compact} />
                  <Tooltip contentStyle={tip} formatter={(v: number) => fcfa(v)} />
                  <Area type="monotone" dataKey="rooms" stackId="1" stroke="var(--series-1)" strokeWidth={2} fill="var(--series-1)" fillOpacity={0.18} />
                  <Area type="monotone" dataKey="services" stackId="1" stroke="var(--series-2)" strokeWidth={2} fill="var(--series-2)" fillOpacity={0.18} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        <div className="grid gap-5 xl:grid-cols-3">
          {on.includes('channels') && (
            <Card>
              <CardHeader icon={<BarChart3 />} title={t('Channel performance', 'Performance des canaux')} subtitle={t('Share of bookings · commission', 'Part des réservations · commission')} />
              <div className="space-y-3 p-5">
                {channelMix.map((c) => (
                  <div key={c.channel}>
                    <div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-foreground">{t(chLabel[c.channel].en, chLabel[c.channel].fr)}</span><span className="tabular text-muted"><b className="text-foreground">{c.share}%</b> · {c.channel === 'ota' ? '15%' : '0%'} {t('fee', 'comm.')}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-[var(--series-1)]" style={{ width: `${c.share}%` }} /></div>
                  </div>
                ))}
                <p className="rounded-xl bg-ai-soft px-3 py-2 text-[11px] text-foreground"><Sparkles className="mr-1 inline size-3 text-ai" />{t('Shifting 5 pts from OTA to direct saves ~180k FCFA/month in commission.', 'Transférer 5 pts de l’OTA vers le direct économise ~180k FCFA/mois de commission.')}</p>
              </div>
            </Card>
          )}
          {on.includes('nationality') && (
            <Card>
              <CardHeader icon={<Globe2 />} title={t('Guest nationality', 'Nationalité des clients')} subtitle={t('Last 12 months', '12 derniers mois')} />
              <div className="space-y-2.5 p-5">
                {NATIONALITY_MIX.map((n) => (
                  <div key={n.en} className="flex items-center gap-3 text-xs">
                    <span className="w-28 truncate font-semibold text-foreground">{t(n.en, n.fr)}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-[var(--series-1)]" style={{ width: `${n.share}%` }} /></div>
                    <span className="w-9 text-right font-bold tabular text-foreground">{n.share}%</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {on.includes('los') && (
            <Card>
              <CardHeader icon={<Moon />} title={t('Length of stay', 'Durée de séjour')} subtitle={t('Share of stays by nights · avg 2.6', 'Part des séjours par nuits · moy. 2,6')} />
              <div className="h-[220px] px-2 pb-3 pt-3">
                <ResponsiveContainer>
                  <BarChart data={LOS_DIST} margin={{ top: 16, right: 12, left: -24, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                    <XAxis dataKey="nights" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip contentStyle={tip} formatter={(v: number) => `${v}%`} labelFormatter={(l) => `${l} ${t('night(s)', 'nuit(s)')}`} cursor={{ fill: 'var(--accent-soft)' }} />
                    <Bar dataKey="share" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>

        {on.includes('accuracy') && (
          <Card>
            <CardHeader icon={<Sparkles />} title={t('Forecast accuracy report', 'Rapport de précision')} subtitle={t('Weekly MAPE — lower is better', 'MAPE hebdomadaire — plus bas = mieux')} />
            <div className="grid gap-3 p-5 sm:grid-cols-4">
              {[{ l: t('Model', 'Modèle'), v: MODEL_INFO.name }, { l: 'MAPE', v: `${MODEL_INFO.mape}%` }, { l: t('Accuracy', 'Précision'), v: `${MODEL_INFO.accuracy}%` }, { l: t('Training data', 'Données'), v: t(`${MODEL_INFO.trainedOn} days`, `${MODEL_INFO.trainedOn} jours`) }].map((x) => (
                <div key={x.l} className="rounded-xl border bg-surface-2 p-3"><p className="text-[11px] text-muted">{x.l}</p><p className="mt-1 text-sm font-bold text-foreground">{x.v}</p></div>
              ))}
            </div>
          </Card>
        )}

        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <ReportBuilder />
          <Schedules />
        </div>
      </div>
    </AppShell>
  );
}
