import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, Lightbulb, Mic, RotateCcw, Sparkles, ThumbsDown, ThumbsUp, X, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/context/LanguageContext';
import { useSession } from '@/context/SessionContext';
import { useStore } from '@/data/store';
import { cn } from '@/lib/utils';
import { useAI } from './AIContext';
import { suggestedPrompts } from './brain';
import { pageInsights } from './insights';

const toneCls = {
  ai: 'border-ai/25 bg-ai-soft',
  warn: 'border-warn/25 bg-warn-soft',
  ok: 'border-ok/25 bg-ok-soft',
  bad: 'border-bad/25 bg-bad-soft',
};

/** Renders **bold** segments in AI replies. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/).map((p, i) =>
        p.startsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>,
      )}
    </>
  );
}

export function CopilotPanel() {
  const { copilotOpen, setCopilotOpen, messages, thinking, ask, rate, reset, setBookingOpen } = useAI();
  const { t, lang } = useLanguage();
  const { session } = useSession();
  const store = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const role = session?.role ?? null;
  const insights = pageInsights(location.pathname, role, store, lang);
  const prompts = suggestedPrompts(role, lang);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  useEffect(() => {
    if (copilotOpen) setTimeout(() => inputRef.current?.focus(), 250);
  }, [copilotOpen]);

  const submit = () => {
    if (!input.trim()) return;
    ask(input);
    setInput('');
  };

  const voice = () => {
    type SR = { lang: string; onresult: (e: { results: { 0: { 0: { transcript: string } } } }) => void; onend: () => void; start: () => void };
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) {
      toast(t('Voice input is not supported in this browser.', "La saisie vocale n'est pas prise en charge par ce navigateur."));
      return;
    }
    const rec = new Ctor();
    rec.lang = lang === 'fr' ? 'fr-FR' : 'en-GB';
    rec.onresult = (e) => setInput(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  return (
    <AnimatePresence>
      {copilotOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-forest-950/30 backdrop-blur-[2px] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCopilotOpen(false)}
          />
          <motion.aside
            role="complementary"
            aria-label="Philo AI"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col border-l bg-surface shadow-pop"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="relative overflow-hidden border-b px-5 py-4">
              <div className="ai-gradient absolute inset-x-0 top-0 h-0.5" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="ai-gradient grid size-9 place-items-center rounded-xl text-white shadow-sm">
                    <Sparkles className="size-4" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground">Philo AI</div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted">
                      <span className="size-1.5 rounded-full bg-ok" />
                      {role && role !== 'guest' ? t('Copilot · sees this page', 'Copilote · voit cette page') : t('Virtual assistant · 24/7', 'Assistant virtuel · 24h/24')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {messages.length > 0 && (
                    <button onClick={reset} className="rounded-lg p-2 text-muted hover:bg-accent-soft hover:text-foreground" aria-label={t('New chat', 'Nouvelle conversation')}>
                      <RotateCcw className="size-4" />
                    </button>
                  )}
                  <button onClick={() => setCopilotOpen(false)} className="rounded-lg p-2 text-muted hover:bg-accent-soft hover:text-foreground" aria-label={t('Close', 'Fermer')}>
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 scrollbar-thin">
              {insights.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
                    <Lightbulb className="size-3.5" /> {t('Insights for this page', 'Analyses pour cette page')}
                  </div>
                  {insights.map((ins, i) => (
                    <motion.button
                      key={ins.en}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * i }}
                      onClick={() => ins.ask && ask(t(ins.ask.en, ins.ask.fr))}
                      className={cn('block w-full rounded-xl border px-3.5 py-2.5 text-left text-[13px] leading-snug text-foreground', toneCls[ins.tone], ins.ask ? 'hover:brightness-95' : 'cursor-default')}
                    >
                      {t(ins.en, ins.fr)}
                      {ins.ask && <span className="mt-1 block text-[11px] font-semibold text-muted">{t('Ask about this →', 'En savoir plus →')}</span>}
                    </motion.button>
                  ))}
                </div>
              )}

              {messages.length === 0 && (
                <div className="pt-2 text-center">
                  <p className="font-display text-xl font-semibold text-ink">{t('How can I help?', 'Comment puis-je aider ?')}</p>
                  <p className="mt-1 text-xs text-muted">{t('Ask in English or French — by text or voice.', 'Posez vos questions en français ou en anglais — à l’écrit ou à la voix.')}</p>
                </div>
              )}

              {messages.map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-2.5', m.from === 'user' && 'justify-end')}>
                  {m.from === 'ai' && (
                    <div className="ai-gradient mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg text-white">
                      <Sparkles className="size-3.5" />
                    </div>
                  )}
                  <div className={cn('max-w-[85%]', m.from === 'user' && 'order-first')}>
                    <div
                      className={cn(
                        'rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed',
                        m.from === 'user' ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-tl-md border bg-surface-2 text-foreground',
                      )}
                    >
                      <Rich text={m.text} />
                      {m.streaming && <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-ai" />}
                    </div>
                    {m.actions && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.actions.map((a) => (
                          <button
                            key={a.en}
                            onClick={() => {
                              if (a.event === 'new-booking') setBookingOpen(true);
                              if (a.to) navigate(a.to);
                              if (window.innerWidth < 1024) setCopilotOpen(false);
                            }}
                            className="rounded-full border border-ai/30 bg-ai-soft px-3 py-1 text-[11px] font-semibold text-ai hover:brightness-95"
                          >
                            {t(a.en, a.fr)} →
                          </button>
                        ))}
                      </div>
                    )}
                    {m.from === 'ai' && !m.streaming && (
                      <div className="mt-1.5 flex items-center gap-1 text-muted">
                        <button onClick={() => rate(m.id, 'up')} className={cn('rounded p-1 hover:text-ok', m.rating === 'up' && 'text-ok')} aria-label="Helpful">
                          <ThumbsUp className="size-3" />
                        </button>
                        <button onClick={() => rate(m.id, 'down')} className={cn('rounded p-1 hover:text-bad', m.rating === 'down' && 'text-bad')} aria-label="Not helpful">
                          <ThumbsDown className="size-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {thinking && (
                <div className="flex items-center gap-2.5">
                  <div className="ai-gradient grid size-7 place-items-center rounded-lg text-white">
                    <Sparkles className="size-3.5 animate-spin [animation-duration:2.5s]" />
                  </div>
                  <div className="ai-shimmer rounded-2xl border px-4 py-2.5 text-xs text-muted">{t('Thinking…', 'Réflexion…')}</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t px-4 pb-4 pt-3">
              <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {prompts.map((p) => (
                  <button key={p} onClick={() => ask(p)} className="shrink-0 rounded-full border bg-surface-2 px-3 py-1 text-[11px] font-medium text-muted hover:border-ai/40 hover:text-ai">
                    {p}
                  </button>
                ))}
                {(!role || role === 'guest') && (
                  <button onClick={() => ask(t('Talk to a receptionist', 'Parler à un réceptionniste'))} className="flex shrink-0 items-center gap-1 rounded-full border bg-surface-2 px-3 py-1 text-[11px] font-medium text-muted hover:text-foreground">
                    <UserRound className="size-3" /> {t('Human', 'Humain')}
                  </button>
                )}
              </div>
              <div className="flex items-end gap-2 rounded-2xl border bg-surface-2 p-2 focus-within:border-ai/50 focus-within:ring-2 focus-within:ring-ai/15">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  placeholder={t('Ask Philo AI…', 'Demandez à Philo AI…')}
                  className="max-h-28 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-2 text-[13px] text-foreground outline-none placeholder:text-muted"
                />
                <button onClick={voice} className={cn('grid size-9 place-items-center rounded-xl text-muted hover:bg-accent-soft', listening && 'pulse-ring bg-accent-soft text-ink')} aria-label={t('Voice input', 'Saisie vocale')}>
                  <Mic className="size-4" />
                </button>
                <button onClick={submit} disabled={!input.trim()} className="ai-gradient grid size-9 place-items-center rounded-xl text-white disabled:opacity-40" aria-label={t('Send', 'Envoyer')}>
                  <ArrowUp className="size-4" />
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-muted">{t('Demo assistant · answers use sample data', 'Assistant de démonstration · données fictives')}</p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
