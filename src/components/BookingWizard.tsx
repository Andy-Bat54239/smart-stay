import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'motion/react';
import { BedDouble, Check, CreditCard, Landmark, Minus, Plus, Smartphone, Sparkles, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useAI } from './ai/AIContext';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useLanguage } from '@/context/LanguageContext';
import { useSession } from '@/context/SessionContext';
import { availableRooms, quote, suggestRooms, useStore } from '@/data/store';
import { ADD_ONS, ROOM_TYPE_INFO, TAX_RATE, type PayMethod, type Reservation, type RoomType } from '@/data/seed';
import { cn, dayOffset, fcfa, fmtDate, nights } from '@/lib/utils';

export const PAY_METHODS: { id: PayMethod; en: string; fr: string; icon: typeof Wallet; hint: { en: string; fr: string } }[] = [
  { id: 'airtel', en: 'Airtel Money', fr: 'Airtel Money', icon: Smartphone, hint: { en: 'Push request to your phone', fr: 'Demande envoyée sur votre téléphone' } },
  { id: 'moov', en: 'Moov Money', fr: 'Moov Money', icon: Smartphone, hint: { en: 'Push request to your phone', fr: 'Demande envoyée sur votre téléphone' } },
  { id: 'card', en: 'Card', fr: 'Carte', icon: CreditCard, hint: { en: 'Visa / Mastercard', fr: 'Visa / Mastercard' } },
  { id: 'cash', en: 'Cash at desk', fr: 'Espèces', icon: Wallet, hint: { en: 'Pay on arrival', fr: 'À régler à l’arrivée' } },
  { id: 'bank', en: 'Bank transfer', fr: 'Virement', icon: Landmark, hint: { en: 'Details sent by email', fr: 'Coordonnées par email' } },
];

const iso = (d: Date) => format(d, 'yyyy-MM-dd');
let refSeq = 5100;

export function BookingWizard() {
  const { bookingOpen, setBookingOpen } = useAI();
  const { t, lang } = useLanguage();
  const { session } = useSession();
  const store = useStore();
  const staff = session && session.role !== 'guest';

  const [step, setStep] = useState(0);
  const [checkIn, setCheckIn] = useState(iso(dayOffset(1)));
  const [checkOut, setCheckOut] = useState(iso(dayOffset(3)));
  const [adults, setAdults] = useState(2);
  const [type, setType] = useState<RoomType>('Duo');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [guestId, setGuestId] = useState<string>(session?.guestId ?? '');
  const [newGuest, setNewGuest] = useState({ name: '', phone: '', email: '' });
  const [addOns, setAddOns] = useState<string[]>(['shuttle']);
  const [pay, setPay] = useState<PayMethod>('airtel');
  const [done, setDone] = useState<Reservation | null>(null);

  const from = new Date(checkIn + 'T00:00');
  const to = new Date(checkOut + 'T00:00');
  const n = nights(from, to);
  const validDates = n > 0;

  const free = useMemo(() => (validDates ? availableRooms(store.rooms, store.reservations, from, to) : []), [checkIn, checkOut, store.rooms, store.reservations]); // eslint-disable-line
  const freeByType = (tp: RoomType) => free.filter((r) => r.type === tp && r.capacity >= adults);
  const nightly = store.rooms.find((r) => r.id === roomId)?.price ?? store.rooms.find((r) => r.type === type)!.price;
  const q = quote(nightly, n, adults, addOns);

  const draft: Reservation = {
    id: 'draft',
    ref: '',
    guestId: guestId || 'G001',
    roomId: null,
    roomType: type,
    checkIn: from,
    checkOut: to,
    adults,
    status: 'pending',
    channel: 'direct',
    addOns,
    paid: 0,
  };
  const suggestions = validDates ? suggestRooms(store.rooms, store.reservations, draft, store.guest(guestId)).filter((s) => s.room.type === type).slice(0, 3) : [];

  const reset = () => {
    setStep(0);
    setDone(null);
    setRoomId(null);
    setGuestId(session?.guestId ?? '');
    setNewGuest({ name: '', phone: '', email: '' });
  };

  const confirm = () => {
    let gid = guestId;
    let guest;
    if (!gid) {
      gid = `G${Date.now()}`;
      guest = { id: gid, name: newGuest.name || 'Walk-in guest', email: newGuest.email, phone: newGuest.phone, nationality: 'Gabon', loyalty: 0, stays: 0, preferences: [] };
    }
    const res: Reservation = {
      ...draft,
      id: `B${Date.now()}`,
      ref: `LP-${refSeq++}`,
      guestId: gid,
      roomId,
      status: roomId ? 'confirmed' : 'pending',
      channel: staff ? 'walk-in' : 'direct',
    };
    store.dispatch({ type: 'create', res, guest });
    setDone(res);
    toast.success(t(`Booking ${res.ref} created`, `Réservation ${res.ref} créée`));
  };

  const guestValid = !!guestId || newGuest.name.trim().length > 1;
  const steps = [t('Stay', 'Séjour'), t('Guest', 'Client'), t('Extras & payment', 'Options & paiement')];

  return (
    <Dialog
      open={bookingOpen}
      onOpenChange={(o) => {
        setBookingOpen(o);
        if (!o) setTimeout(reset, 300);
      }}
    >
      <DialogContent
        className="max-w-2xl"
        title={done ? t('Booking confirmed', 'Réservation confirmée') : t('New reservation', 'Nouvelle réservation')}
        description={done ? undefined : t('Live availability · prices in FCFA incl. 10% tax', 'Disponibilité en direct · prix en FCFA TTC (10 %)')}
      >
        {done ? (
          <div className="px-6 py-8 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 15 }} className="mx-auto grid size-16 place-items-center rounded-full bg-ok-soft text-ok">
              <Check className="size-8" />
            </motion.div>
            <p className="mt-4 font-mono text-2xl font-semibold text-ink">{done.ref}</p>
            <p className="mt-1 text-sm text-muted">
              {fmtDate(done.checkIn, lang, 'EEE d MMM')} → {fmtDate(done.checkOut, lang, 'EEE d MMM')} · {done.roomType}
              {done.roomId ? ` · ${t('Room', 'Chambre')} ${store.room(done.roomId)?.number}` : ''}
            </p>
            <p className="mt-4 text-sm text-foreground">
              {pay === 'airtel' || pay === 'moov'
                ? t('A payment request was sent to the guest’s phone.', 'Une demande de paiement a été envoyée sur le téléphone du client.')
                : t('Confirmation sent by email and SMS.', 'Confirmation envoyée par email et SMS.')}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="outline" onClick={reset}>{t('Book another', 'Autre réservation')}</Button>
              <Button onClick={() => setBookingOpen(false)}>{t('Done', 'Terminé')}</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Stepper */}
            <div className="flex items-center gap-2 px-6 pt-4">
              {steps.map((s, i) => (
                <button key={s} onClick={() => i < step && setStep(i)} className="flex flex-1 flex-col gap-1.5 text-left">
                  <div className={cn('h-1 rounded-full transition-colors', i <= step ? 'bg-gold-500' : 'bg-line-strong')} />
                  <span className={cn('text-[11px] font-semibold', i === step ? 'text-ink' : 'text-muted')}>{i + 1}. {s}</span>
                </button>
              ))}
            </div>

            <div className="min-h-[360px] px-6 py-5">
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}>
                  {step === 0 && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">{t('Check-in', 'Arrivée')}</span>
                          <input type="date" value={checkIn} min={iso(dayOffset(0))} onChange={(e) => { setCheckIn(e.target.value); setRoomId(null); }} className="mt-1 h-10 w-full rounded-xl border bg-surface-2 px-3 text-sm text-foreground" />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">{t('Check-out', 'Départ')}</span>
                          <input type="date" value={checkOut} min={checkIn} onChange={(e) => { setCheckOut(e.target.value); setRoomId(null); }} className="mt-1 h-10 w-full rounded-xl border bg-surface-2 px-3 text-sm text-foreground" />
                        </label>
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-xs font-semibold text-muted">{t('Guests', 'Personnes')}</span>
                          <div className="mt-1 flex h-10 items-center justify-between rounded-xl border bg-surface-2 px-1.5">
                            <button onClick={() => setAdults(Math.max(1, adults - 1))} className="grid size-7 place-items-center rounded-lg hover:bg-accent-soft" aria-label="-"><Minus className="size-3.5" /></button>
                            <span className="font-semibold tabular">{adults}</span>
                            <button onClick={() => setAdults(Math.min(3, adults + 1))} className="grid size-7 place-items-center rounded-lg hover:bg-accent-soft" aria-label="+"><Plus className="size-3.5" /></button>
                          </div>
                        </div>
                      </div>
                      {!validDates && <p className="text-xs text-bad">{t('Check-out must be after check-in.', 'Le départ doit suivre l’arrivée.')}</p>}

                      <div>
                        <p className="mb-2 text-xs font-semibold text-muted">{t('Room type', 'Type de chambre')} · {n} {t('night(s)', 'nuit(s)')}</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {(Object.keys(ROOM_TYPE_INFO) as RoomType[]).map((tp) => {
                            const left = freeByType(tp).length;
                            const price = store.rooms.find((r) => r.type === tp)!.price;
                            const disabled = left === 0;
                            return (
                              <button
                                key={tp}
                                disabled={disabled}
                                onClick={() => { setType(tp); setRoomId(null); }}
                                className={cn('rounded-xl border p-3 text-left transition-all disabled:opacity-40', type === tp ? 'border-gold-500 bg-accent-soft ring-2 ring-gold-500/30' : 'hover:border-line-strong')}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-foreground">{tp}</span>
                                  <span className="size-2.5 rounded-full" style={{ background: ROOM_TYPE_INFO[tp].color }} />
                                </div>
                                <div className="mt-1 text-xs text-muted tabular">{fcfa(price)} / {t('night', 'nuit')}</div>
                                <div className={cn('mt-2 text-[11px] font-semibold', left <= 1 ? 'text-warn' : 'text-ok')}>
                                  {disabled ? (ROOM_TYPE_INFO[tp].capacity < adults ? t(`Max ${ROOM_TYPE_INFO[tp].capacity} guest(s)`, `${ROOM_TYPE_INFO[tp].capacity} pers. max`) : t('Sold out', 'Complet')) : `${left} ${t('left', 'libre(s)')}`}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {suggestions.length > 0 && (
                        <div className="rounded-xl border border-ai/25 bg-ai-soft/60 p-3">
                          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ai"><Sparkles className="size-3.5" /> {t('AI room match', 'Suggestion IA')}</p>
                          <div className="flex flex-wrap gap-2">
                            {suggestions.map((s, i) => (
                              <button
                                key={s.room.id}
                                onClick={() => setRoomId(roomId === s.room.id ? null : s.room.id)}
                                className={cn('flex items-center gap-2 rounded-lg border bg-surface px-3 py-2 text-left text-xs', roomId === s.room.id && 'border-ai ring-2 ring-ai/25')}
                              >
                                <BedDouble className="size-4 text-muted" />
                                <span>
                                  <span className="font-bold text-foreground">{s.room.number}</span>
                                  <span className="text-muted"> · {t(s.room.view!.en, s.room.view!.fr)} · {t('floor', 'niv.')} {s.room.floor}</span>
                                </span>
                                <Badge tone={i === 0 ? 'ai' : 'neutral'}>{s.score}%</Badge>
                              </button>
                            ))}
                          </div>
                          {!roomId && <p className="mt-2 text-[11px] text-muted">{t('Optional — leave empty and assign later on the room map.', 'Optionnel — attribuez plus tard sur le plan.')}</p>}
                        </div>
                      )}
                    </div>
                  )}

                  {step === 1 && (
                    <div className="space-y-4">
                      {staff && (
                        <div>
                          <p className="mb-2 text-xs font-semibold text-muted">{t('Returning guest', 'Client existant')}</p>
                          <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto scrollbar-thin">
                            {store.guests.map((g) => (
                              <button key={g.id} onClick={() => setGuestId(guestId === g.id ? '' : g.id)} className={cn('rounded-full border px-3 py-1.5 text-xs font-medium', guestId === g.id ? 'border-gold-500 bg-accent-soft text-ink' : 'text-foreground hover:bg-surface-2')}>
                                {g.name} {g.vip && '★'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {session?.role === 'guest' ? (
                        <div className="rounded-xl border bg-surface-2 p-4 text-sm">
                          <p className="font-semibold text-foreground">{session.name}</p>
                          <p className="text-muted">{session.email}</p>
                        </div>
                      ) : (
                        !guestId && (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <p className="text-xs font-semibold text-muted sm:col-span-2">{staff ? t('…or a new guest', '…ou un nouveau client') : t('Your details', 'Vos coordonnées')}</p>
                            {(['name', 'phone', 'email'] as const).map((f) => (
                              <label key={f} className={cn('block', f === 'name' && 'sm:col-span-2')}>
                                <span className="text-xs font-semibold text-muted">{f === 'name' ? t('Full name', 'Nom complet') : f === 'phone' ? t('Phone', 'Téléphone') : 'Email'}</span>
                                <input
                                  value={newGuest[f]}
                                  onChange={(e) => setNewGuest({ ...newGuest, [f]: e.target.value })}
                                  placeholder={f === 'phone' ? '+241 07 …' : ''}
                                  type={f === 'email' ? 'email' : 'text'}
                                  className="mt-1 h-10 w-full rounded-xl border bg-surface-2 px-3 text-sm text-foreground outline-none focus:border-gold-500"
                                />
                              </label>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {step === 2 && (
                    <div className="grid gap-5 sm:grid-cols-[1fr_220px]">
                      <div className="space-y-4">
                        <div>
                          <p className="mb-2 text-xs font-semibold text-muted">{t('Add-ons', 'Options')}</p>
                          <div className="space-y-1.5">
                            {ADD_ONS.map((a) => {
                              const on = addOns.includes(a.id);
                              return (
                                <button key={a.id} onClick={() => setAddOns(on ? addOns.filter((x) => x !== a.id) : [...addOns, a.id])} className={cn('flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm', on && 'border-gold-500 bg-accent-soft')}>
                                  <span className={cn('grid size-4 place-items-center rounded border', on && 'border-gold-500 bg-gold-500 text-forest-900')}>{on && <Check className="size-3" />}</span>
                                  <span className="flex-1 text-foreground">{t(a.en, a.fr)}</span>
                                  <span className="text-xs text-muted tabular">{fcfa(a.price)}{a.per === 'person' ? t('/pers.', '/pers.') : ''}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-semibold text-muted">{t('Payment method', 'Moyen de paiement')}</p>
                          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                            {PAY_METHODS.map((p) => (
                              <button key={p.id} onClick={() => setPay(p.id)} className={cn('flex items-center gap-2 rounded-xl border px-2.5 py-2 text-xs font-semibold text-foreground', pay === p.id && 'border-gold-500 bg-accent-soft')}>
                                <p.icon className="size-4 text-muted" /> {t(p.en, p.fr)}
                              </button>
                            ))}
                          </div>
                          <p className="mt-1.5 text-[11px] text-muted">{t(PAY_METHODS.find((p) => p.id === pay)!.hint.en, PAY_METHODS.find((p) => p.id === pay)!.hint.fr)}</p>
                        </div>
                      </div>
                      <div className="h-fit rounded-xl border bg-surface-2 p-4 text-sm">
                        <p className="mb-3 font-bold text-foreground">{t('Price breakdown', 'Détail du prix')}</p>
                        <Row l={`${type} × ${n} ${t('nt', 'nuit')}`} v={fcfa(q.room)} />
                        <Row l={t('Add-ons', 'Options')} v={fcfa(q.extras)} />
                        <Row l={`${t('Tax', 'TVA')} ${TAX_RATE * 100}%`} v={fcfa(q.tax)} />
                        <div className="my-2 border-t" />
                        <Row l={t('Total', 'Total')} v={fcfa(q.total)} strong />
                        <p className="mt-3 text-[11px] text-muted">{t('30% deposit secures the booking.', 'Un acompte de 30 % confirme la réservation.')}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between border-t bg-surface-2 px-6 py-3">
              <div className="text-xs text-muted">
                {validDates && (
                  <>
                    {fmtDate(from, lang)} → {fmtDate(to, lang)} · <span className="font-bold text-foreground tabular">{fcfa(q.total)}</span>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>{t('Back', 'Retour')}</Button>}
                {step < 2 ? (
                  <Button onClick={() => setStep(step + 1)} disabled={!validDates || freeByType(type).length === 0 || (step === 1 && !guestValid && session?.role !== 'guest')}>
                    {t('Continue', 'Continuer')}
                  </Button>
                ) : (
                  <Button variant="gold" onClick={confirm}>{t('Confirm booking', 'Confirmer')}</Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ l, v, strong }: { l: string; v: string; strong?: boolean }) {
  return (
    <div className={cn('flex justify-between py-0.5 tabular', strong ? 'text-base font-bold text-ink' : 'text-muted')}>
      <span>{l}</span>
      <span className={strong ? '' : 'text-foreground'}>{v}</span>
    </div>
  );
}
