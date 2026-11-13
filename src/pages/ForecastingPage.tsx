import { useMemo, useState } from 'react';
import { addDays, format, isWeekend } from 'date-fns';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CalendarPlus, Check, Download, Gauge, Sparkles, Tag, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { ForecastWhatIf } from '@/components/dashboard/ForecastWhatIf';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Field, Input, Stat, td, th } from '@/components/ui/form';
import { useLanguage } from '@/context/LanguageContext';
import { useStore } from '@/data/store';
import { baselineForecast, forecastEvents, MODEL_INFO, seedRooms, type RoomType } from '@/data/seed';
import { cn, downloadCsv, fcfa, fmtDate, today } from '@/lib/utils';

const TYPES: RoomType[] = ['Solo', 'Duo', 'VIP', 'Standard'];
const COUNT: Record<RoomType, number> = Object.fromEntries(TYPES.map((t) => [t, seedRooms.filter((r) => r.type === t).length])) as Record<RoomType, number>;
const PRICE: Record<RoomType, number> = Object.fromEntries(TYPES.map((t) => [t, seedRooms.find((r) => r.type === t)!.price])) as Record<RoomType, number>;

// How each room type reacts to weekends vs weekdays (demo assumption)
const TYPE_BIAS: Record<RoomType, { weekday: number; weekend: number }> = {
  Solo: { weekday: 1.12, weekend: 0.82 },
  Duo: { weekday: 0.92, weekend: 1.12 },
  VIP: { weekday: 0.8, weekend: 1.22 },
  Standard: { weekday: 0.88, weekend: 1.15 },
};

interface LocalEvent { date: string; name: string; lift: number }

function useDemand(extra: LocalEvent[]) {
  return useMemo(() => {
    const base = baselineForecast(28).filter((d) => d.date >= today());
    return base.map((d) => {
      const key = format(d.date, 'yyyy-MM-dd');
      const add = extra.filter((e) => e.date === key).reduce((s, e) => s + e.lift, 0);
      const occ = Math.min(100, d.base + add);
      const wk = isWeekend(d.date) || d.date.getDay() === 5;
      const byType = Object.fromEntries(TYPES.map((tp) => [tp, Math.min(100, Math.round(occ * (wk ? TYPE_BIAS[tp].weekend : TYPE_BIAS[tp].weekday)))])) as Record<RoomType, number>;
      return { date: d.date, occ, byType, event: d.event, local: extra.filter((e) => e.date === key) };
    });
  }, [extra]);
}

const heat = (v: number) => `color-mix(in oklab, var(--series-1) ${Math.round(8 + (v / 100) * 92)}%, var(--surface))`;

export default function ForecastingPage() {
  const { t, lang } = useLanguage();
  const store = useStore();
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [newEv, setNewEv] = useState({ date: format(addDays(today(), 10), 'yyyy-MM-dd'), name: '', lift: 15 });
  const [accepted, setAccepted] = useState<Record<string, 'yes' | 'no'>>({});
  const demand = useDemand(events);

  const recs = demand.slice(0, 14).flatMap((d) =>
    TYPES.filter((tp) => tp !== 'Standard' || d.byType[tp] > 80).map((tp) => {
      const v = d.byType[tp];
      const change = v >= 92 ? 15 : v >= 82 ? 10 : v <= 40 ? -15 : v <= 50 ? -10 : 0;
      return { key: `${format(d.date, 'yyyy-MM-dd')}-${tp}`, date: d.date, tp, v, change };
    }),
  ).filter((r) => r.change !== 0).slice(0, 10);

  const risk = demand.filter((d) => TYPES.some((tp) => d.byType[tp] >= 95));
  const staffing = demand.slice(0, 7).map((d) => {
    const rooms = Math.round((d.occ / 100) * seedRooms.length);
    return { date: d.date, rooms, hk: Math.max(2, Math.ceil(rooms / 5)), fd: rooms > 9 ? 3 : 2, kitchen: Math.max(2, Math.ceil(rooms / 4)) };
  });

  // Forecast vs actual: last 8 weeks
  const accuracy = Array.from({ length: 8 }, (_, i) => {
    const mape = [7.9, 7.1, 6.8, 6.2, 6.5, 5.9, 5.4, MODEL_INFO.mape][i];
    return { wk: fmtDate(addDays(today(), -7 * (7 - i)), lang, 'd MMM'), mape, acc: +(100 - mape).toFixed(1) };
  });
  const history = baselineForecast(0).filter((d) => d.actual !== undefined).map((d) => ({ label: fmtDate(d.date, lang, 'EEE d'), actual: Math.round(d.actual!), predicted: Math.round(d.base) }));

  const exportCsv = () => {
    downloadCsv(`forecast-${fmtDate(today(), 'en', 'yyyy-MM-dd')}.csv`, [
      ['Date', 'Occupancy %', ...TYPES.map((tp) => `${tp} %`), 'Event'],
      ...demand.map((d) => [format(d.date, 'yyyy-MM-dd'), d.occ.toFixed(0), ...TYPES.map((tp) => d.byType[tp]), [d.event?.en, ...d.local.map((e) => e.name)].filter(Boolean).join('; ')]),
    ]);
    toast.success(t('Forecast exported', 'Prévision exportée'));
  };

  const next7 = demand.slice(0, 7).reduce((s, d) => s + d.occ, 0) / 7;
  const next28 = demand.reduce((s, d) => s + d.occ, 0) / demand.length;
  const roomNights = Math.round(demand.reduce((s, d) => s + (d.occ / 100) * seedRooms.length, 0));

  return (
    <AppShell
      title={t('AI occupancy forecasting', 'Prévisions d’occupation IA')}
      subtitle={`${MODEL_INFO.name} · ${t('trained on', 'entraîné sur')} ${MODEL_INFO.trainedOn} ${t('days of history', 'jours d’historique')}`}
      actions={<Button variant="outline" size="sm" onClick={exportCsv}><Download /> CSV</Button>}
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t('Next 7 days', '7 prochains jours')} value={`${next7.toFixed(0)}%`} sub={t('avg occupancy', 'occupation moyenne')} />
        <Stat label={t('Next 4 weeks', '4 prochaines semaines')} value={`${next28.toFixed(0)}%`} sub={t(`${roomNights} room-nights`, `${roomNights} nuitées`)} />
        <Stat label={t('Forecast accuracy', 'Précision')} value={`${MODEL_INFO.accuracy}%`} sub={`MAPE ${MODEL_INFO.mape}%`} tone="ok" />
        <Stat label={t('Overbooking risk days', 'Jours à risque')} value={risk.length} tone={risk.length ? 'bad' : 'ok'} sub={t('≥ 95% on a room type', '≥ 95 % sur un type')} />
      </div>

      <div className="space-y-5">
        <ForecastWhatIf />

        {/* Demand heat map */}
        <Card>
          <CardHeader icon={<Gauge />} title={t('Demand heat map · next 4 weeks', 'Carte de la demande · 4 semaines')} subtitle={t('Predicted occupancy by room type and day', 'Occupation prévue par type de chambre et par jour')} />
          <div className="overflow-x-auto p-5 scrollbar-thin">
            <div className="min-w-[860px]">
              <div className="grid gap-1" style={{ gridTemplateColumns: `90px repeat(${demand.length}, minmax(0,1fr))` }}>
                <div />
                {demand.map((d) => (
                  <div key={+d.date} className={cn('text-center text-[9px] font-semibold text-muted', isWeekend(d.date) && 'text-ink')}>
                    {fmtDate(d.date, lang, 'EEEEE')}<br />{fmtDate(d.date, lang, 'd')}
                  </div>
                ))}
                {TYPES.map((tp) => (
                  <div key={tp} className="contents">
                    <div className="flex items-center text-xs font-semibold text-foreground">{tp} <span className="ml-1 text-[10px] text-muted">×{COUNT[tp]}</span></div>
                    {demand.map((d) => (
                      <div key={+d.date} title={`${tp} · ${fmtDate(d.date, lang, 'EEE d MMM')}: ${d.byType[tp]}%`} className={cn('relative grid h-9 place-items-center rounded-md text-[10px] font-bold tabular', d.byType[tp] > 60 ? 'text-white' : 'text-foreground')} style={{ background: heat(d.byType[tp]) }}>
                        {d.byType[tp]}
                        {(d.event || d.local.length > 0) && tp === 'Solo' && <span className="absolute -top-1 right-0.5 text-[9px] text-ai">★</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3 text-[11px] text-muted">
                <span>0%</span><span className="h-2.5 w-40 rounded-full" style={{ background: `linear-gradient(90deg, ${heat(0)}, ${heat(50)}, ${heat(100)})` }} /><span>100%</span>
                <span className="ml-4 text-ai">★ {t('event', 'événement')}</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-5 xl:grid-cols-2">
          {/* Pricing recommendations */}
          <Card>
            <CardHeader icon={<Tag />} title={t('Dynamic pricing recommendations', 'Recommandations de prix dynamiques')} subtitle={t('Based on predicted demand per room type', 'Selon la demande prévue par type')} />
            <div className="overflow-x-auto p-3">
              <table className="w-full min-w-[480px] text-[13px]">
                <thead><tr><th className={th}>{t('Date', 'Date')}</th><th className={th}>{t('Type', 'Type')}</th><th className={cn(th, 'text-right')}>{t('Demand', 'Demande')}</th><th className={cn(th, 'text-right')}>{t('Suggested', 'Proposé')}</th><th className={th} /></tr></thead>
                <tbody>
                  {recs.map((r) => (
                    <tr key={r.key} className="border-t">
                      <td className={cn(td, 'text-foreground')}>{fmtDate(r.date, lang, 'EEE d MMM')}</td>
                      <td className={td}>{r.tp}</td>
                      <td className={cn(td, 'text-right tabular')}>{r.v}%</td>
                      <td className={cn(td, 'text-right')}>
                        <span className={cn('font-bold tabular', r.change > 0 ? 'text-ok' : 'text-bad')}>{r.change > 0 ? '+' : ''}{r.change}%</span>
                        <span className="block text-[11px] text-muted tabular">{fcfa(PRICE[r.tp] * (1 + r.change / 100))}</span>
                      </td>
                      <td className={cn(td, 'text-right')}>
                        {accepted[r.key] ? (
                          <Badge tone={accepted[r.key] === 'yes' ? 'ok' : 'neutral'}>{accepted[r.key] === 'yes' ? t('Applied', 'Appliqué') : t('Dismissed', 'Ignoré')}</Badge>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <button aria-label="Apply" className="grid size-7 place-items-center rounded-lg bg-ok-soft text-ok" onClick={() => { setAccepted({ ...accepted, [r.key]: 'yes' }); store.dispatch({ type: 'audit', cat: 'settings', en: `Rate ${r.tp} ${format(r.date, 'yyyy-MM-dd')} ${r.change > 0 ? '+' : ''}${r.change}% (AI)`, fr: `Tarif ${r.tp} ${format(r.date, 'yyyy-MM-dd')} ${r.change > 0 ? '+' : ''}${r.change} % (IA)` }); toast.success(t('Rate updated', 'Tarif mis à jour')); }}><Check className="size-3.5" /></button>
                            <button aria-label="Dismiss" className="grid size-7 place-items-center rounded-lg bg-surface-2 text-muted" onClick={() => setAccepted({ ...accepted, [r.key]: 'no' })}><X className="size-3.5" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!recs.length && <tr><td colSpan={5} className="py-8 text-center text-muted">{t('Prices are well aligned with demand.', 'Les prix sont alignés sur la demande.')}</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Events */}
          <Card>
            <CardHeader icon={<CalendarPlus />} title={t('Seasonal & event drivers', 'Saisonnalité & événements')} subtitle={t('Add a local event — the forecast updates instantly', 'Ajoutez un événement — la prévision se met à jour')} />
            <div className="space-y-2 p-5">
              {[...forecastEvents.filter((e) => e.date >= today()).map((e) => ({ date: e.date, name: t(e.en, e.fr), lift: e.lift, builtin: true })), ...events.map((e) => ({ date: new Date(e.date + 'T00:00'), name: e.name, lift: e.lift, builtin: false }))]
                .sort((a, b) => +a.date - +b.date)
                .map((e, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm">
                    <span className="w-24 text-xs text-muted">{fmtDate(e.date, lang, 'EEE d MMM')}</span>
                    <span className="flex-1 font-semibold text-foreground">{e.name}</span>
                    <Badge tone="ai">+{e.lift} pts</Badge>
                    {!e.builtin && <button aria-label="Remove event" onClick={() => setEvents(events.filter((x) => !(x.name === e.name && x.date === format(e.date, 'yyyy-MM-dd'))))}><X className="size-3.5 text-muted" /></button>}
                  </div>
                ))}
              <form
                className="grid gap-2 pt-2 sm:grid-cols-[140px_1fr_90px_auto] sm:items-end"
                onSubmit={(e) => { e.preventDefault(); if (newEv.name.trim()) { setEvents([...events, { ...newEv, name: newEv.name.trim() }]); toast.success(t('Event added — forecast updated', 'Événement ajouté — prévision mise à jour')); setNewEv({ ...newEv, name: '' }); } }}
              >
                <Field label={t('Date', 'Date')}><Input type="date" value={newEv.date} min={format(today(), 'yyyy-MM-dd')} max={format(addDays(today(), 27), 'yyyy-MM-dd')} onChange={(e) => setNewEv({ ...newEv, date: e.target.value })} /></Field>
                <Field label={t('Event', 'Événement')}><Input value={newEv.name} onChange={(e) => setNewEv({ ...newEv, name: e.target.value })} placeholder={t('e.g. Oil & gas conference', 'ex. Conférence pétrolière')} /></Field>
                <Field label={t('Impact', 'Impact')}><Input type="number" min={1} max={40} value={newEv.lift} onChange={(e) => setNewEv({ ...newEv, lift: +e.target.value })} /></Field>
                <Button type="submit" disabled={!newEv.name.trim()}>{t('Add', 'Ajouter')}</Button>
              </form>
            </div>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {/* Alerts & staffing */}
          <Card>
            <CardHeader icon={<Users />} title={t('Staffing suggestions · next 7 days', 'Personnel suggéré · 7 jours')} />
            <div className="overflow-x-auto p-3">
              <table className="w-full min-w-[420px] text-[13px]">
                <thead><tr><th className={th}>{t('Day', 'Jour')}</th><th className={cn(th, 'text-right')}>{t('Rooms', 'Chambres')}</th><th className={cn(th, 'text-right')}>Housekeeping</th><th className={cn(th, 'text-right')}>{t('Front desk', 'Accueil')}</th><th className={cn(th, 'text-right')}>{t('Kitchen', 'Cuisine')}</th></tr></thead>
                <tbody>
                  {staffing.map((s) => (
                    <tr key={+s.date} className="border-t">
                      <td className={cn(td, 'text-foreground')}>{fmtDate(s.date, lang, 'EEE d')}</td>
                      <td className={cn(td, 'text-right tabular')}>{s.rooms}/12</td>
                      <td className={cn(td, 'text-right font-semibold tabular', s.hk > 2 && 'text-warn')}>{s.hk}</td>
                      <td className={cn(td, 'text-right tabular')}>{s.fd}</td>
                      <td className={cn(td, 'text-right tabular')}>{s.kitchen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {risk.length > 0 && (
              <div className="m-4 mt-0 space-y-1.5 rounded-xl border border-bad/25 bg-bad-soft p-3 text-xs">
                <p className="flex items-center gap-1.5 font-bold text-bad"><AlertTriangle className="size-3.5" /> {t('Overbooking risk', 'Risque de surréservation')}</p>
                {risk.slice(0, 4).map((d) => (
                  <p key={+d.date} className="text-foreground">{fmtDate(d.date, lang, 'EEE d MMM')}: {TYPES.filter((tp) => d.byType[tp] >= 95).join(', ')} — {t('stop OTA sales, keep waitlist open', 'fermer les ventes OTA, garder la liste d’attente')}</p>
                ))}
              </div>
            )}
          </Card>

          {/* Accuracy */}
          <Card>
            <CardHeader icon={<Sparkles />} title={t('Forecast vs actual', 'Prévision vs réel')} subtitle={t('Last 14 days, and weekly accuracy trend', '14 derniers jours et tendance hebdomadaire')} />
            <div className="flex gap-4 px-5 pt-3 text-[11px] font-semibold text-muted">
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-[var(--series-1)]" /> {t('Actual', 'Réel')}</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-[var(--series-2)]" /> {t('Predicted', 'Prévu')}</span>
            </div>
            <div className="h-[180px] px-2 pt-2">
              <ResponsiveContainer>
                <LineChart data={history} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} interval={2} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                  <Line dataKey="actual" stroke="var(--series-1)" strokeWidth={2} dot={false} />
                  <Line dataKey="predicted" stroke="var(--series-2)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-8 gap-1 px-5 pb-5 pt-2">
              {accuracy.map((a) => (
                <div key={a.wk} className="text-center">
                  <div className="mx-auto flex h-14 w-full items-end overflow-hidden rounded-md bg-surface-2"><div className="w-full rounded-md bg-[var(--series-1)]" style={{ height: `${(a.acc - 85) * 6.6}%` }} /></div>
                  <p className="mt-1 text-[10px] font-bold text-foreground tabular">{a.acc}%</p>
                  <p className="text-[9px] text-muted">{a.wk}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
