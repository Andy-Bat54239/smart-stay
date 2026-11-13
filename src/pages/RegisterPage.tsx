import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { OTPInput, type SlotProps } from 'input-otp';
import { ArrowLeft, Check, Eye, EyeOff, MailCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/context/LanguageContext';
import { useSession } from '@/context/SessionContext';
import { useStore } from '@/data/store';
import { Button } from '@/components/ui/button';
import { Chip, Field, Input, Select } from '@/components/ui/form';
import { Wordmark } from '@/components/Logo';
import { LangSwitch, ThemeSwitch } from '@/components/layout/AppShell';
import { cn, sleep } from '@/lib/utils';
import evFathers from '@/assets/event-fathers-day.jpeg';

const NATIONALITIES = ['Gabon', 'Cameroon', 'Congo', 'Equatorial Guinea', 'France', 'Belgium', 'Ghana', 'Nigeria', 'Other'];

/** 0–4 password score with the rules that failed. */
export function scorePassword(pw: string) {
  const rules = [
    { ok: pw.length >= 8, en: '8+ characters', fr: '8 caractères min.' },
    { ok: /[A-Z]/.test(pw) && /[a-z]/.test(pw), en: 'Upper & lower case', fr: 'Majuscules & minuscules' },
    { ok: /\d/.test(pw), en: 'A number', fr: 'Un chiffre' },
    { ok: /[^A-Za-z0-9]/.test(pw), en: 'A symbol', fr: 'Un symbole' },
  ];
  return { score: rules.filter((r) => r.ok).length, rules };
}

function Slot(p: SlotProps) {
  return (
    <div className={cn('grid h-12 w-10 place-items-center rounded-xl border bg-surface-2 font-mono text-lg font-semibold text-foreground sm:w-11', p.isActive && 'border-gold-500 ring-2 ring-gold-500/30')}>
      {p.char ?? (p.hasFakeCaret && <span className="h-5 w-px animate-pulse bg-foreground" />)}
    </div>
  );
}

export default function RegisterPage() {
  const { t } = useLanguage();
  const { signInAs } = useSession();
  const store = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [f, setF] = useState({ name: '', email: '', phone: '', address: '', nationality: 'Gabon', idType: 'CNI' as 'CNI' | 'Passport', idNumber: '', pw: '', pw2: '' });
  const [prefs, setPrefs] = useState<string[]>([]);
  const [roomPref, setRoomPref] = useState('');
  const [verifyBy, setVerifyBy] = useState<'email' | 'sms'>('sms');
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState(false);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [agree, setAgree] = useState(false);

  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const pw = scorePassword(f.pw);
  const errors = {
    name: f.name.trim().split(' ').length < 2 ? t('First and last name', 'Prénom et nom') : '',
    email: !/^\S+@\S+\.\S+$/.test(f.email) ? t('Valid email required', 'Email valide requis') : '',
    phone: f.phone.replace(/\D/g, '').length < 8 ? t('Valid phone required', 'Téléphone valide requis') : '',
    idNumber: f.idNumber.length < 5 ? t('Required for check-in', 'Requis pour l’enregistrement') : '',
    pw: pw.score < 3 ? t('Too weak', 'Trop faible') : '',
    pw2: f.pw2 !== f.pw ? t('Passwords don’t match', 'Les mots de passe diffèrent') : '',
  };
  const valid = Object.values(errors).every((e) => !e) && agree;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    setBusy(true);
    await sleep(500);
    setBusy(false);
    setStep('verify');
  };

  const verify = async () => {
    setBusy(true);
    await sleep(500);
    const id = `G${Date.now()}`;
    const preferences = [...prefs, ...(roomPref ? [`${roomPref} room`] : [])];
    store.dispatch({ type: 'guest-add', guest: { id, name: f.name.trim(), email: f.email, phone: f.phone, nationality: f.nationality, loyalty: 100, stays: 0, preferences, address: f.address, idType: f.idType, idNumber: f.idNumber, marketing: true } });
    signInAs({ role: 'guest', name: f.name.trim(), email: f.email, guestId: id });
    toast.success(t('Welcome to Le Philo! +100 welcome points', 'Bienvenue au Philo ! +100 points offerts'));
    navigate('/dashboard');
  };

  const bars = ['bg-bad', 'bg-bad', 'bg-warn', 'bg-ok', 'bg-ok'];
  const err = (k: keyof typeof errors) => (touched ? errors[k] : '');

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[0.9fr_1.1fr]">
      <div className="grain relative hidden overflow-hidden bg-forest-900 lg:block">
        <img src={evFathers} alt="" className="absolute inset-0 size-full object-cover opacity-[0.07] blur-[3px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-900/70 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/"><Wordmark light /></Link>
          <div>
            <p className="font-display text-5xl font-semibold leading-tight text-cream-50">
              {t('Join the', 'Rejoignez le')} <em className="text-gold-300">Club Le Philo</em>
            </p>
            <ul className="mt-8 space-y-3 text-sm text-cream-100/80">
              {[
                { en: '100 welcome points, a free VIP night at 5 000', fr: '100 points offerts, une nuit VIP à 5 000' },
                { en: 'Book in seconds, pay with Airtel or Moov Money', fr: 'Réservez en quelques secondes, payez par Airtel ou Moov Money' },
                { en: 'Your digital key and bill on your phone', fr: 'Votre clé digitale et votre facture sur votre téléphone' },
              ].map((x) => (
                <li key={x.en} className="flex items-center gap-3"><span className="grid size-6 place-items-center rounded-full bg-gold-500/20 text-gold-300"><Check className="size-3.5" /></span>{t(x.en, x.fr)}</li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-cream-100/40">{t('Staff accounts are created by the administrator.', 'Les comptes du personnel sont créés par l’administrateur.')}</p>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center justify-between px-6 py-5">
          <Link to="/login" className="flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-foreground"><ArrowLeft className="size-4" /> {t('Sign in instead', 'Déjà inscrit ?')}</Link>
          <div className="flex items-center gap-1.5"><LangSwitch /><ThemeSwitch /></div>
        </div>
        <div className="flex flex-1 justify-center px-6 pb-16">
          <div className="w-full max-w-xl">
            <AnimatePresence mode="wait">
              {step === 'form' ? (
                <motion.form key="form" onSubmit={submit} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} noValidate>
                  <h1 className="font-display text-4xl font-semibold text-ink">{t('Create your account', 'Créer votre compte')}</h1>
                  <p className="mt-2 text-sm text-muted">{t('Guests only. It takes about a minute.', 'Réservé aux clients. Une minute suffit.')}</p>

                  <div className="mt-6 grid grid-cols-2 gap-2">
                    {['Google', 'Facebook'].map((p) => <Button key={p} type="button" variant="outline" onClick={() => toast(t(`${p} sign-up is simulated in this demo.`, `L’inscription ${p} est simulée dans cette démo.`))}>{t(`Continue with ${p}`, `Continuer avec ${p}`)}</Button>)}
                  </div>
                  <div className="my-5 flex items-center gap-3 text-[11px] text-muted"><div className="h-px flex-1 bg-line-strong" />{t('or with your details', 'ou avec vos informations')}<div className="h-px flex-1 bg-line-strong" /></div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={t('Full name', 'Nom complet')} error={err('name')} className="sm:col-span-2"><Input value={f.name} onChange={up('name')} autoComplete="name" /></Field>
                    <Field label="Email" error={err('email')}><Input type="email" value={f.email} onChange={up('email')} autoComplete="email" /></Field>
                    <Field label={t('Phone', 'Téléphone')} error={err('phone')}><Input type="tel" value={f.phone} onChange={up('phone')} placeholder="+241 07 …" autoComplete="tel" /></Field>
                    <Field label={t('Address', 'Adresse')} className="sm:col-span-2"><Input value={f.address} onChange={up('address')} autoComplete="street-address" /></Field>
                    <Field label={t('Nationality', 'Nationalité')}>
                      <Select value={f.nationality} onChange={up('nationality')}>{NATIONALITIES.map((n) => <option key={n}>{n}</option>)}</Select>
                    </Field>
                    <Field label={t('ID document', 'Pièce d’identité')} error={err('idNumber')}>
                      <div className="flex gap-2">
                        <Select value={f.idType} onChange={up('idType')} className="w-28"><option value="CNI">CNI</option><option value="Passport">{t('Passport', 'Passeport')}</option></Select>
                        <Input value={f.idNumber} onChange={up('idNumber')} placeholder="GA…" />
                      </div>
                    </Field>
                    <Field label={t('Password', 'Mot de passe')} error={err('pw')} className="sm:col-span-2">
                      <div className="relative">
                        <Input type={show ? 'text' : 'password'} value={f.pw} onChange={up('pw')} autoComplete="new-password" className="pr-10" />
                        <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
                      </div>
                      <div className="mt-2 flex gap-1">{[0, 1, 2, 3].map((i) => <div key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors', i < pw.score ? bars[pw.score] : 'bg-line-strong')} />)}</div>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                        {pw.rules.map((r) => <span key={r.en} className={cn('flex items-center gap-1 text-[11px]', r.ok ? 'text-ok' : 'text-muted')}><Check className="size-3" />{t(r.en, r.fr)}</span>)}
                      </div>
                    </Field>
                    <Field label={t('Confirm password', 'Confirmer le mot de passe')} error={err('pw2')} className="sm:col-span-2"><Input type="password" value={f.pw2} onChange={up('pw2')} autoComplete="new-password" /></Field>
                  </div>

                  <div className="mt-5 rounded-2xl border bg-surface p-4">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-foreground"><Sparkles className="size-3.5 text-ai" /> {t('Preferences (optional) — the AI uses these to pick your room', 'Préférences (facultatif) — l’IA s’en sert pour choisir votre chambre')}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {['Solo', 'Duo', 'VIP'].map((r) => <Chip key={r} active={roomPref === r} onClick={() => setRoomPref(roomPref === r ? '' : r)}>{r}</Chip>)}
                      <span className="mx-1 w-px bg-line-strong" />
                      {[
                        { v: 'Non-smoking', fr: 'Non-fumeur' },
                        { v: 'Sea view', fr: 'Vue mer' },
                        { v: 'Ground floor', fr: 'Rez-de-chaussée' },
                        { v: 'Vegetarian', fr: 'Végétarien' },
                        { v: 'Halal', fr: 'Halal' },
                        { v: 'Quiet room', fr: 'Chambre calme' },
                      ].map((p) => <Chip key={p.v} active={prefs.includes(p.v)} onClick={() => setPrefs(prefs.includes(p.v) ? prefs.filter((x) => x !== p.v) : [...prefs, p.v])}>{t(p.v, p.fr)}</Chip>)}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted">{t('Verify by', 'Vérifier par')}</span>
                    <div className="flex gap-1.5"><Chip active={verifyBy === 'sms'} onClick={() => setVerifyBy('sms')}>SMS</Chip><Chip active={verifyBy === 'email'} onClick={() => setVerifyBy('email')}>Email</Chip></div>
                  </div>
                  <label className="mt-4 flex items-start gap-2.5 text-xs text-muted">
                    <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-4 accent-[var(--gold-500)]" />
                    {t('I agree to the terms and to Le Philo storing my ID details for check-in.', 'J’accepte les conditions et la conservation de ma pièce d’identité pour l’enregistrement.')}
                  </label>
                  {touched && !agree && <p className="mt-1 text-[11px] text-bad">{t('Please accept to continue', 'Veuillez accepter pour continuer')}</p>}
                  <Button type="submit" size="lg" className="mt-5 w-full" disabled={busy}>{busy ? t('Creating…', 'Création…') : t('Create account', 'Créer le compte')}</Button>
                </motion.form>
              ) : (
                <motion.div key="verify" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-10">
                  <div className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-ink"><MailCheck className="size-6" /></div>
                  <h1 className="mt-5 font-display text-3xl font-semibold text-ink">{t('Verify your account', 'Vérifiez votre compte')}</h1>
                  <p className="mt-2 text-sm text-muted">
                    {verifyBy === 'sms' ? t(`We sent a 6-digit code to ${f.phone}.`, `Nous avons envoyé un code à 6 chiffres au ${f.phone}.`) : t(`We sent a 6-digit code to ${f.email}.`, `Nous avons envoyé un code à 6 chiffres à ${f.email}.`)}
                  </p>
                  <OTPInput maxLength={6} value={otp} onChange={setOtp} onComplete={verify} autoFocus containerClassName="mt-7 flex items-center gap-2" render={({ slots }) => <>{slots.map((s, i) => <Slot key={i} {...s} />)}</>} />
                  <p className="mt-3 text-[11px] text-muted">{t('Demo: type any 6 digits.', 'Démo : saisissez 6 chiffres.')}</p>
                  <Button size="lg" className="mt-6 w-full max-w-sm" disabled={otp.length < 6 || busy} onClick={verify}>{t('Verify', 'Vérifier')}</Button>
                  <div className="mt-4 flex gap-4 text-xs font-semibold text-muted">
                    <button onClick={() => toast(t('Code re-sent', 'Code renvoyé'))} className="hover:text-foreground">{t('Resend code', 'Renvoyer le code')}</button>
                    <button onClick={() => setStep('form')} className="hover:text-foreground">← {t('Edit details', 'Modifier')}</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
