import { useMemo, useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Megaphone, Sparkles, Users, Wand2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { baselineForecast, MODEL_INFO, seedRooms } from '@/data/seed';
import { Card, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';
import { Segmented } from '../ui/misc';
import { Button } from '../ui/button';
import { cn, compact, fcfa, fmtDate, today } from '@/lib/utils';

const ELASTICITY = -0.9; // occupancy response to price (demo assumption)
const ROOMS = seedRooms.length;
const ADR = Math.round(seedRooms.reduce((s, r) => s + r.price, 0) / ROOMS);

function simulate(base: number, priceChange: number, marketing: boolean) {
  return Math.max(5, Math.min(100, base * (1 + ELASTICITY * priceChange) + (marketing ? 4 : 0)));
}

export function ForecastWhatIf() {
  const { t, lang } = useLanguage();
  const [horizon, setHorizon] = useState<'7' | '30' | '90'>('30');
  const [price, setPrice] = useState(0); // percent
  const [marketing, setMarketing] = useState(false);

  const raw = useMemo(() => baselineForecast(+horizon), [horizon]);
  const data = raw.map((d) => ({
    ...d,
    label: fmtDate(d.date, lang, +horizon > 30 ? 'd MMM' : 'EEE d'),
    band: [d.low, d.high] as [number, number],
    forecast: d.date >= today() ? d.base : undefined,
    scenario: d.date >= today() && (price !== 0 || marketing) ? simulate(d.base, price / 100, marketing) : undefined,
  }));

  const future = raw.filter((d) => d.date >= today());
  const baseOcc = future.reduce((s, d) => s + d.base, 0) / future.length;
  const scenOcc = future.reduce((s, d) => s + simulate(d.base, price / 100, marketing), 0) / future.length;
  const rev = (occ: number, p: number) => future.length * (occ / 100) * ROOMS * ADR * (1 + p);
  const baseRev = rev(baseOcc, 0);
  const scenRev = rev(scenOcc, price / 100) - (marketing ? 150_000 : 0);
  const delta = scenRev - baseRev;
  const riskDays = future.filter((d) => simulate(d.base, price / 100, marketing) > 92).length;
  const peakRooms = Math.round((Math.max(...future.map((d) => simulate(d.base, price / 100, marketing))) / 100) * ROOMS);
  const housekeepers = Math.max(2, Math.ceil(peakRooms / 5));

  const best = useMemo(() => {
    let b = { p: 0, r: -Infinity };
    for (let p = -20; p <= 20; p += 1) {
      const occ = future.reduce((s, d) => s + simulate(d.base, p / 100, marketing), 0) / future.length;
      const r = rev(occ, p / 100);
      if (r > b.r) b = { p, r };
    }
    return b.p;
  }, [horizon, marketing]); // eslint-disable-line

  return (
    <Card id="whatif" className="scroll-mt-24">
      <CardHeader
        icon={<Sparkles />}
        title={t('Occupancy forecast & what-if', 'Prévision d’occupation & simulation')}
        subtitle={`${MODEL_INFO.name} · ${t('accuracy', 'précision')} ${MODEL_INFO.accuracy}% · MAPE ${MODEL_INFO.mape}%`}
        action={
          <Segmented
            value={horizon}
            onChange={setHorizon}
            options={[
              { value: '7', label: t('7 d', '7 j') },
              { value: '30', label: t('30 d', '30 j') },
              { value: '90', label: t('90 d', '90 j') },
            ]}
          />
        }
      />
      <div className="grid gap-5 p-5 xl:grid-cols-[1fr_280px]">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] font-semibold text-muted">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-[var(--series-1)]" /> {t('Actual', 'Réel')}</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded border-t-2 border-dashed border-[var(--series-2)]" /> {t('Forecast', 'Prévision')}</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-[var(--series-2)] opacity-20" /> {t('Confidence band', 'Intervalle de confiance')}</span>
            {(price !== 0 || marketing) && <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-[var(--series-3)]" /> {t('Your scenario', 'Votre scénario')}</span>}
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer>
              <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} interval="preserveStartEnd" minTickGap={24} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as (typeof data)[number];
                    return (
                      <div className="rounded-xl border bg-surface px-3 py-2 text-xs shadow-pop">
                        <p className="mb-1 font-bold text-foreground">{fmtDate(d.date, lang, 'EEEE d MMM')}</p>
                        {d.actual !== undefined && <p className="text-muted">{t('Actual', 'Réel')}: <b className="text-foreground tabular">{d.actual.toFixed(0)}%</b></p>}
                        {d.forecast !== undefined && <p className="text-muted">{t('Forecast', 'Prévision')}: <b className="text-foreground tabular">{d.forecast.toFixed(0)}%</b> <span className="tabular">({d.low.toFixed(0)}–{d.high.toFixed(0)})</span></p>}
                        {d.scenario !== undefined && <p className="text-muted">{t('Scenario', 'Scénario')}: <b className="text-foreground tabular">{d.scenario.toFixed(0)}%</b></p>}
                        {d.event && <p className="mt-1 font-semibold text-ai">★ {t(d.event.en, d.event.fr)}</p>}
                      </div>
                    );
                  }}
                />
                <Area dataKey="band" stroke="none" fill="var(--series-2)" fillOpacity={0.14} isAnimationActive={false} />
                <ReferenceLine x={data.find((d) => d.date >= today())?.label} stroke="var(--border-strong)" strokeDasharray="3 3" label={{ value: t('Today', 'Aujourd’hui'), position: 'insideTopLeft', fontSize: 10, fill: 'var(--muted-foreground)' }} />
                <Line dataKey="actual" stroke="var(--series-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line dataKey="forecast" stroke="var(--series-2)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
                <Line dataKey="scenario" stroke="var(--series-3)" strokeWidth={2} dot={false} animationDuration={400} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4 rounded-2xl border bg-surface-2 p-4">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-muted">{t('Price change', 'Variation de prix')}</span>
              <span className={cn('tabular', price > 0 ? 'text-ok' : price < 0 ? 'text-bad' : 'text-foreground')}>{price > 0 ? '+' : ''}{price}%</span>
            </div>
            <Slider.Root value={[price]} onValueChange={([v]) => setPrice(v)} min={-20} max={20} step={1} className="relative mt-3 flex h-5 touch-none items-center" aria-label={t('Price change', 'Variation de prix')}>
              <Slider.Track className="relative h-1.5 flex-1 rounded-full bg-line-strong">
                <Slider.Range className="absolute h-full rounded-full bg-[var(--series-3)]" />
              </Slider.Track>
              <Slider.Thumb className="block size-5 rounded-full border-2 border-[var(--series-3)] bg-surface shadow-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ai/25" />
            </Slider.Root>
            <div className="mt-1 flex justify-between text-[10px] text-muted"><span>−20%</span><span>0</span><span>+20%</span></div>
          </div>

          <button onClick={() => setMarketing(!marketing)} className={cn('flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-xs', marketing ? 'border-ai/40 bg-ai-soft' : 'bg-surface')}>
            <Megaphone className="size-4 text-muted" />
            <span className="flex-1">
              <span className="block font-semibold text-foreground">{t('Social media campaign', 'Campagne réseaux sociaux')}</span>
              <span className="text-muted">{t('TikTok & WhatsApp · 150k FCFA', 'TikTok & WhatsApp · 150k FCFA')}</span>
            </span>
            <span className={cn('h-5 w-9 rounded-full p-0.5 transition-colors', marketing ? 'bg-ai' : 'bg-line-strong')}>
              <span className={cn('block size-4 rounded-full bg-white transition-transform', marketing && 'translate-x-4')} />
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-surface p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{t('Avg occupancy', 'Occupation moy.')}</p>
              <p className="mt-1 text-lg font-bold text-foreground tabular">{scenOcc.toFixed(0)}%</p>
              <p className="text-[11px] text-muted tabular">{t('base', 'base')} {baseOcc.toFixed(0)}%</p>
            </div>
            <div className="rounded-xl bg-surface p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{t('Revenue impact', 'Impact CA')}</p>
              <p className={cn('mt-1 text-lg font-bold tabular', delta >= 0 ? 'text-ok' : 'text-bad')}>{delta >= 0 ? '+' : '−'}{compact(Math.abs(delta))}</p>
              <p className="text-[11px] text-muted tabular">{compact(scenRev)} FCFA</p>
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            {riskDays > 0 && (
              <p className="flex items-start gap-2 text-warn"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {t(`${riskDays} day(s) above 92% — overbooking risk`, `${riskDays} jour(s) au-dessus de 92 % — risque de surréservation`)}</p>
            )}
            <p className="flex items-start gap-2 text-muted"><Users className="mt-0.5 size-3.5 shrink-0" /> {t(`Peak needs ${housekeepers} housekeepers on shift`, `Le pic nécessite ${housekeepers} agents d’entretien`)}</p>
          </div>

          <Button variant="ai" size="sm" className="w-full" onClick={() => setPrice(best)} disabled={price === best}>
            <Wand2 /> {t(`Apply AI price: ${best > 0 ? '+' : ''}${best}%`, `Prix IA : ${best > 0 ? '+' : ''}${best} %`)}
          </Button>
          <p className="text-center text-[10px] text-muted">{t(`ADR ${fcfa(ADR)} · demo elasticity −0.9`, `Prix moyen ${fcfa(ADR)} · élasticité démo −0,9`)}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t px-5 py-3">
        <span className="text-[11px] font-semibold text-muted">{t('Demand drivers:', 'Facteurs de demande :')}</span>
        {raw.filter((d) => d.event && d.date >= today()).map((d) => (
          <Badge key={d.event!.en} tone="ai">★ {t(d.event!.en, d.event!.fr)} · {fmtDate(d.date, lang)} · +{d.event!.lift}</Badge>
        ))}
        {!raw.some((d) => d.event && d.date >= today()) && <Badge tone="neutral">{t('Weekends +16 pts', 'Week-ends +16 pts')}</Badge>}
      </div>
    </Card>
  );
}
