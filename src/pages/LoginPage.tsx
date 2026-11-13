import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { OTPInput, type SlotProps } from 'input-otp';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/context/LanguageContext';
import { ROLE_LABEL, ROLE_PROFILES, useSession, type Role } from '@/context/SessionContext';
import { Button } from '@/components/ui/button';
import { Avatar, Segmented } from '@/components/ui/misc';
import { Wordmark } from '@/components/Logo';
import { LangSwitch, ThemeSwitch } from '@/components/layout/AppShell';
import { cn, sleep } from '@/lib/utils';
import evOpenDay from '@/assets/event-open-day.jpeg';

const STAFF: Role[] = ['receptionist', 'housekeeping', 'finance', 'manager', 'admin'];

function Slot(p: SlotProps) {
  return (
    <div className={cn('relative grid h-12 w-10 place-items-center rounded-xl border bg-surface-2 font-mono text-lg font-semibold text-foreground transition-all sm:w-11', p.isActive && 'border-gold-500 ring-2 ring-gold-500/30')}>
      {p.char ?? (p.hasFakeCaret && <span className="h-5 w-px animate-pulse bg-foreground" />)}
    </div>
  );
}

export default function LoginPage() {
  const { t } = useLanguage();
  const { signIn } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const [mode, setMode] = useState<'guest' | 'staff'>('guest');
  const [role, setRole] = useState<Role>('receptionist');
  const [email, setEmail] = useState(ROLE_PROFILES.guest.email);
  const [pw, setPw] = useState('demo-password');
  const [show, setShow] = useState(false);
  const [step, setStep] = useState<'creds' | 'mfa'>('creds');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const switchMode = (m: 'guest' | 'staff') => {
    setMode(m);
    setStep('creds');
    setEmail(m === 'guest' ? ROLE_PROFILES.guest.email : ROLE_PROFILES[role].email);
  };

  const finish = async (r: Role) => {
    setBusy(true);
    await sleep(500);
    signIn(r);
    toast.success(t(`Welcome, ${ROLE_PROFILES[r].name.split(' ')[0]}!`, `Bienvenue, ${ROLE_PROFILES[r].name.split(' ')[0]} !`));
    navigate(from, { replace: true });
  };

  const submitCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw) {
      setAttempts((a) => a + 1);
      toast.error(t('Enter your password', 'Saisissez votre mot de passe'));
      return;
    }
    if (mode === 'guest') return finish('guest');
    setBusy(true);
    await sleep(500);
    setBusy(false);
    setStep('mfa');
  };

  const verify = async (code: string) => {
    if (code.length < 6) return;
    await finish(role);
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1fr_1.05fr]">
      {/* Visual side */}
      <div className="grain relative hidden overflow-hidden bg-forest-900 lg:block">
        <img src={evOpenDay} alt="" className="absolute inset-0 size-full object-cover opacity-[0.12] blur-[2px] mix-blend-luminosity" />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-900/70 to-forest-900/30" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/"><Wordmark light /></Link>
          <div>
            <p className="font-display text-5xl font-semibold leading-tight text-cream-50">
              {t('Run the auberge', 'Pilotez l’auberge')}
              <br />
              <em className="font-medium text-gold-300">{t('with a copilot.', 'avec un copilote.')}</em>
            </p>
            <div className="mt-10 grid max-w-md gap-3">
              {[
                { en: 'Live room map with drag-and-drop assignment', fr: 'Plan des chambres en direct, attribution par glisser-déposer' },
                { en: 'Occupancy forecasts and what-if pricing', fr: 'Prévisions d’occupation et simulation de prix' },
                { en: 'Ask anything with ⌘K — in English or French', fr: 'Posez vos questions avec ⌘K — en français ou en anglais' },
              ].map((f, i) => (
                <motion.div key={f.en} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }} className="flex items-center gap-3 rounded-2xl border border-gold-500/15 bg-cream-100/[0.04] px-4 py-3 text-sm text-cream-100/85">
                  <Sparkles className="size-4 shrink-0 text-gold-300" /> {t(f.en, f.fr)}
                </motion.div>
              ))}
            </div>
          </div>
          <p className="text-xs text-cream-100/40">Ozouri · Port-Gentil · Gabon</p>
        </div>
      </div>

      {/* Form side */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-foreground">
            <ArrowLeft className="size-4" /> {t('Back to site', 'Retour au site')}
          </Link>
          <div className="flex items-center gap-1.5"><LangSwitch /><ThemeSwitch /></div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm">
            <div className="mb-8 lg:hidden"><Wordmark /></div>
            <AnimatePresence mode="wait">
              {step === 'creds' ? (
                <motion.div key="creds" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <h1 className="font-display text-4xl font-semibold text-ink">{t('Welcome back', 'Bon retour')}</h1>
                  <p className="mt-2 text-sm text-muted">{t('Sign in to manage your stay or your shift.', 'Connectez-vous pour gérer votre séjour ou votre service.')}</p>

                  <Segmented
                    className="mt-7 w-full [&>button]:flex-1"
                    value={mode}
                    onChange={switchMode}
                    options={[
                      { value: 'guest', label: t('Guest', 'Client') },
                      { value: 'staff', label: t('Staff', 'Personnel') },
                    ]}
                  />

                  {mode === 'staff' && (
                    <div className="mt-5">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">{t('Demo account', 'Compte de démo')}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {STAFF.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => { setRole(r); setEmail(ROLE_PROFILES[r].email); }}
                            className={cn('flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-xs font-semibold', role === r ? 'border-gold-500 bg-accent-soft text-ink' : 'text-muted hover:text-foreground')}
                          >
                            <Avatar name={ROLE_PROFILES[r].name} size={20} /> {t(ROLE_LABEL[r].en, ROLE_LABEL[r].fr)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <form onSubmit={submitCreds} className="mt-5 space-y-3">
                    <label className="block">
                      <span className="text-xs font-semibold text-muted">Email</span>
                      <div className="mt-1 flex h-11 items-center gap-2.5 rounded-xl border bg-surface px-3 focus-within:border-gold-500 focus-within:ring-2 focus-within:ring-gold-500/20">
                        <Mail className="size-4 text-muted" />
                        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" className="flex-1 bg-transparent text-sm text-foreground outline-none" />
                      </div>
                    </label>
                    <label className="block">
                      <span className="flex justify-between text-xs font-semibold text-muted">
                        {t('Password', 'Mot de passe')}
                        <button type="button" onClick={() => toast(t('A reset link was sent to your email.', 'Un lien de réinitialisation a été envoyé.'))} className="font-semibold text-gold-600 hover:underline dark:text-gold-300">{t('Forgot?', 'Oublié ?')}</button>
                      </span>
                      <div className="mt-1 flex h-11 items-center gap-2.5 rounded-xl border bg-surface px-3 focus-within:border-gold-500 focus-within:ring-2 focus-within:ring-gold-500/20">
                        <Lock className="size-4 text-muted" />
                        <input value={pw} onChange={(e) => setPw(e.target.value)} type={show ? 'text' : 'password'} autoComplete="current-password" className="flex-1 bg-transparent text-sm text-foreground outline-none" />
                        <button type="button" onClick={() => setShow(!show)} className="text-muted hover:text-foreground" aria-label={show ? 'Hide password' : 'Show password'}>
                          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </label>
                    {attempts > 0 && <p className="text-[11px] text-warn">{t(`${attempts} failed attempt(s) — locked after 5.`, `${attempts} tentative(s) échouée(s) — blocage après 5.`)}</p>}
                    <Button type="submit" size="lg" className="w-full" disabled={busy}>
                      {busy ? t('Signing in…', 'Connexion…') : mode === 'staff' ? t('Continue', 'Continuer') : t('Sign in', 'Se connecter')}
                    </Button>
                  </form>

                  {mode === 'guest' && (
                    <>
                      <div className="my-5 flex items-center gap-3 text-[11px] text-muted"><div className="h-px flex-1 bg-line-strong" />{t('or', 'ou')}<div className="h-px flex-1 bg-line-strong" /></div>
                      <div className="grid grid-cols-2 gap-2">
                        {['Google', 'Facebook'].map((p) => (
                          <Button key={p} variant="outline" onClick={() => finish('guest')}>{p}</Button>
                        ))}
                      </div>
                      <p className="mt-6 text-center text-xs text-muted">
                        {t('New here?', 'Nouveau ?')}{' '}
                        <Link to="/register" className="font-semibold text-gold-600 hover:underline dark:text-gold-300">
                          {t('Create an account', 'Créer un compte')}
                        </Link>
                      </p>
                    </>
                  )}
                  {mode === 'staff' && <p className="mt-5 text-center text-[11px] text-muted">{t('Staff accounts are created by the administrator.', 'Les comptes du personnel sont créés par l’administrateur.')}</p>}
                </motion.div>
              ) : (
                <motion.div key="mfa" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-ink"><ShieldCheck className="size-6" /></div>
                  <h1 className="mt-5 font-display text-3xl font-semibold text-ink">{t('Two-step verification', 'Vérification en deux étapes')}</h1>
                  <p className="mt-2 text-sm text-muted">{t('Enter the 6-digit code sent by SMS to the phone ending in •• 80.', 'Saisissez le code à 6 chiffres envoyé par SMS au numéro se terminant par •• 80.')}</p>
                  <OTPInput
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    onComplete={verify}
                    autoFocus
                    containerClassName="mt-7 flex items-center gap-2"
                    render={({ slots }) => <>{slots.map((s, i) => <Slot key={i} {...s} />)}</>}
                  />
                  <p className="mt-3 text-[11px] text-muted">{t('Demo: type any 6 digits.', 'Démo : saisissez 6 chiffres.')}</p>
                  <Button size="lg" className="mt-6 w-full" disabled={otp.length < 6 || busy} onClick={() => verify(otp)}>
                    {busy ? t('Verifying…', 'Vérification…') : t('Verify & sign in', 'Vérifier et se connecter')}
                  </Button>
                  <button onClick={() => setStep('creds')} className="mt-4 w-full text-center text-xs font-semibold text-muted hover:text-foreground">← {t('Use another account', 'Changer de compte')}</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
