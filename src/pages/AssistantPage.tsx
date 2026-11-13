import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { formatDistanceToNowStrict } from 'date-fns';
import { enGB, fr } from 'date-fns/locale';
import { motion } from 'motion/react';
import { ArrowUp, BookOpen, Bot, CheckCircle2, Inbox, MessageSquareText, Mic, Plus, RotateCcw, Send, Sparkles, ThumbsDown, ThumbsUp, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { useAI } from '@/components/ai/AIContext';
import { suggestedPrompts } from '@/components/ai/brain';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, Segmented } from '@/components/ui/misc';
import { Chip, Field, Input, Stat, Textarea } from '@/components/ui/form';
import { useLanguage } from '@/context/LanguageContext';
import { useSession } from '@/context/SessionContext';
import { seedTranscripts, type Transcript } from '@/data/seed2';
import { cn } from '@/lib/utils';

function ChatPanel({ tall }: { tall?: boolean }) {
  const { t, lang, setLang } = useLanguage();
  const { session } = useSession();
  const { messages, thinking, ask, rate, reset, setBookingOpen } = useAI();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' }); }, [messages, thinking]);
  const prompts = suggestedPrompts(session?.role ?? null, lang);
  const send = () => { if (input.trim()) { ask(input); setInput(''); } };

  return (
    <Card className={cn('flex flex-col overflow-hidden', tall ? 'h-[calc(100vh-220px)] min-h-[520px]' : 'h-[560px]')}>
      <div className="flex items-center justify-between border-b px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="ai-gradient grid size-9 place-items-center rounded-xl text-white"><Sparkles className="size-4" /></div>
          <div><p className="text-sm font-bold text-foreground">Philo AI</p><p className="flex items-center gap-1.5 text-[11px] text-muted"><span className="size-1.5 rounded-full bg-ok" /> {t('Online · replies instantly', 'En ligne · répond instantanément')}</p></div>
        </div>
        <div className="flex items-center gap-2">
          <Segmented value={lang} onChange={setLang} options={[{ value: 'en', label: 'English' }, { value: 'fr', label: 'Français' }]} />
          {messages.length > 0 && <button onClick={reset} className="rounded-lg p-2 text-muted hover:bg-accent-soft" aria-label={t('New chat', 'Nouvelle conversation')}><RotateCcw className="size-4" /></button>}
        </div>
      </div>
      <div ref={ref} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 scrollbar-thin">
        {messages.length === 0 && (
          <div className="mx-auto max-w-md pt-6 text-center">
            <div className="ai-gradient mx-auto grid size-14 place-items-center rounded-2xl text-white"><Bot className="size-7" /></div>
            <p className="mt-4 font-display text-2xl font-semibold text-ink">{t('Hi! I’m Philo, your 24/7 assistant.', 'Bonjour ! Je suis Philo, votre assistant 24h/24.')}</p>
            <p className="mt-1 text-sm text-muted">{t('Availability, prices, activities, directions, your booking — just ask.', 'Disponibilités, tarifs, activités, itinéraire, votre réservation — demandez-moi.')}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">{prompts.map((p) => <button key={p} onClick={() => ask(p)} className="rounded-full border bg-surface-2 px-3 py-1.5 text-xs font-medium text-foreground hover:border-ai/40 hover:text-ai">{p}</button>)}</div>
          </div>
        )}
        {messages.map((m) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-2.5', m.from === 'user' && 'justify-end')}>
            {m.from === 'ai' && <div className="ai-gradient mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg text-white"><Sparkles className="size-3.5" /></div>}
            <div className="max-w-[78%]">
              <div className={cn('whitespace-pre-line rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed', m.from === 'user' ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-tl-md border bg-surface-2 text-foreground')}>
                {m.text.replace(/\*\*/g, '')}
                {m.streaming && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-ai align-middle" />}
              </div>
              {m.actions && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.actions.map((a) => <button key={a.en} onClick={() => { if (a.event === 'new-booking') setBookingOpen(true); if (a.to) navigate(a.to); }} className="rounded-full border border-ai/30 bg-ai-soft px-3 py-1 text-[11px] font-semibold text-ai">{t(a.en, a.fr)} →</button>)}
                </div>
              )}
              {m.from === 'ai' && !m.streaming && (
                <div className="mt-1 flex gap-1 text-muted">
                  <button onClick={() => rate(m.id, 'up')} className={cn('rounded p-1 hover:text-ok', m.rating === 'up' && 'text-ok')} aria-label="Helpful"><ThumbsUp className="size-3" /></button>
                  <button onClick={() => rate(m.id, 'down')} className={cn('rounded p-1 hover:text-bad', m.rating === 'down' && 'text-bad')} aria-label="Not helpful"><ThumbsDown className="size-3" /></button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {thinking && <div className="ai-shimmer ml-10 w-28 rounded-2xl border px-4 py-2.5 text-xs text-muted">{t('Thinking…', 'Réflexion…')}</div>}
      </div>
      <div className="border-t p-3">
        <div className="mb-2 flex gap-1.5 overflow-x-auto scrollbar-thin">
          <button onClick={() => ask(t('Talk to a receptionist', 'Parler à un réceptionniste'))} className="flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold text-muted hover:text-foreground"><UserRound className="size-3" /> {t('Talk to a human', 'Parler à un humain')}</button>
          {messages.length > 0 && prompts.slice(0, 3).map((p) => <button key={p} onClick={() => ask(p)} className="shrink-0 rounded-full border px-3 py-1 text-[11px] text-muted hover:text-ai">{p}</button>)}
        </div>
        <div className="flex items-end gap-2 rounded-2xl border bg-surface-2 p-2 focus-within:border-ai/50">
          <textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={t('Type your message…', 'Écrivez votre message…')} className="max-h-28 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-2 text-[13px] text-foreground outline-none placeholder:text-muted" />
          <button onClick={() => toast(t('Tip: the mic in the copilot panel (⌘J) supports voice.', 'Astuce : le micro du copilote (⌘J) gère la voix.'))} className="grid size-9 place-items-center rounded-xl text-muted hover:bg-accent-soft" aria-label="Voice"><Mic className="size-4" /></button>
          <button onClick={send} disabled={!input.trim()} className="ai-gradient grid size-9 place-items-center rounded-xl text-white disabled:opacity-40" aria-label="Send"><ArrowUp className="size-4" /></button>
        </div>
      </div>
    </Card>
  );
}

function StaffInbox() {
  const { t, lang } = useLanguage();
  const { session } = useSession();
  const [list, setList] = useState<Transcript[]>(seedTranscripts);
  const [filter, setFilter] = useState<'all' | 'escalated' | 'open' | 'resolved'>('escalated');
  const [sel, setSel] = useState('T1');
  const [reply, setReply] = useState('');
  const shown = list.filter((x) => filter === 'all' || x.status === filter);
  const cur = list.find((x) => x.id === sel) ?? shown[0];
  const tone = { escalated: 'bad', open: 'warn', resolved: 'ok' } as const;
  const loc = lang === 'fr' ? fr : enGB;

  return (
    <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap gap-1 border-b p-3">
          {(['escalated', 'open', 'resolved', 'all'] as const).map((k) => (
            <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>
              {k === 'escalated' ? t('Escalated', 'Escaladées') : k === 'open' ? t('Open', 'Ouvertes') : k === 'resolved' ? t('Resolved', 'Résolues') : t('All', 'Toutes')} <span className="opacity-60">{k === 'all' ? list.length : list.filter((x) => x.status === k).length}</span>
            </Chip>
          ))}
        </div>
        <div className="max-h-[560px] overflow-y-auto p-2 scrollbar-thin">
          {shown.map((x) => (
            <button key={x.id} onClick={() => setSel(x.id)} className={cn('flex w-full gap-3 rounded-xl px-3 py-2.5 text-left', cur?.id === x.id ? 'bg-accent-soft' : 'hover:bg-surface-2')}>
              <Avatar name={x.guest} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2"><span className="truncate text-[13px] font-semibold text-foreground">{x.guest}</span><span className="shrink-0 text-[10px] text-muted">{formatDistanceToNowStrict(x.at, { locale: loc })}</span></div>
                <p className="truncate text-[11px] text-muted">{t(x.topic.en, x.topic.fr)} · {x.channel === 'whatsapp' ? 'WhatsApp' : 'Web'} · {x.lang.toUpperCase()}</p>
              </div>
              <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', x.status === 'escalated' ? 'bg-bad' : x.status === 'open' ? 'bg-warn' : 'bg-ok')} />
            </button>
          ))}
          {!shown.length && <p className="p-6 text-center text-xs text-muted">{t('Inbox zero 🎉', 'Boîte vide 🎉')}</p>}
        </div>
      </Card>
      {cur && (
        <Card className="flex h-[620px] flex-col overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
            <div><p className="font-bold text-foreground">{cur.guest}</p><p className="text-[11px] text-muted">{t(cur.topic.en, cur.topic.fr)} · {cur.channel === 'whatsapp' ? 'WhatsApp' : t('Website chat', 'Chat du site')}</p></div>
            <div className="flex items-center gap-2">
              <Badge tone={tone[cur.status]}>{cur.status === 'escalated' ? t('Needs a human', 'Besoin d’un humain') : cur.status === 'open' ? t('Open', 'Ouverte') : t('Resolved', 'Résolue')}</Badge>
              {cur.rating && <Badge tone={cur.rating === 'up' ? 'ok' : 'bad'}>{cur.rating === 'up' ? '👍' : '👎'}</Badge>}
              {cur.status !== 'resolved' && <Button size="sm" variant="outline" onClick={() => { setList(list.map((x) => (x.id === cur.id ? { ...x, status: 'resolved' } : x))); toast.success(t('Conversation resolved', 'Conversation résolue')); }}><CheckCircle2 /> {t('Resolve', 'Résoudre')}</Button>}
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5 scrollbar-thin">
            {cur.turns.map((m, i) => (
              <div key={i} className={cn('flex gap-2', m.from === 'guest' ? '' : 'justify-end')}>
                <div className={cn('max-w-[75%] rounded-2xl px-4 py-2.5 text-[13px]', m.from === 'guest' ? 'rounded-tl-md border bg-surface-2 text-foreground' : m.from === 'ai' ? 'rounded-br-md bg-ai-soft text-foreground' : 'rounded-br-md bg-primary text-primary-foreground')}>
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider opacity-60">{m.from === 'guest' ? cur.guest : m.from === 'ai' ? 'Philo AI' : t('Staff', 'Personnel')}</p>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          {cur.status !== 'resolved' && (
            <div className="border-t p-3">
              <div className="mb-2 flex gap-1.5 overflow-x-auto">
                <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-ai"><Sparkles className="size-3" /> {t('Suggested:', 'Suggestion :')}</span>
                {[t('Of course! I’ve noted it — see you soon.', 'Bien sûr ! C’est noté — à très bientôt.'), t('Our driver will meet you at arrivals with a Le Philo sign.', 'Notre chauffeur vous attendra à l’arrivée avec une pancarte Le Philo.')].map((s) => (
                  <button key={s} onClick={() => setReply(s)} className="shrink-0 rounded-full border px-3 py-1 text-[11px] text-muted hover:text-foreground">{s}</button>
                ))}
              </div>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!reply.trim()) return; setList(list.map((x) => (x.id === cur.id ? { ...x, status: 'open', turns: [...x.turns, { from: 'staff', text: reply }] } : x))); setReply(''); toast.success(t(`Sent via ${cur.channel === 'whatsapp' ? 'WhatsApp' : 'web chat'} as ${session?.name}`, `Envoyé via ${cur.channel === 'whatsapp' ? 'WhatsApp' : 'chat'} par ${session?.name}`)); }}>
                <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t('Reply as staff…', 'Répondre en tant que personnel…')} />
                <Button type="submit" disabled={!reply.trim()}><Send /></Button>
              </form>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function Knowledge() {
  const { t } = useLanguage();
  const [faqs, setFaqs] = useState([
    { q: t('Check-in / check-out times?', 'Horaires d’arrivée / départ ?'), a: t('Check-in from 14:00, check-out by 12:00. Late checkout 16:00 for 10 000 FCFA.', 'Arrivée dès 14h, départ avant 12h. Départ tardif à 16h pour 10 000 FCFA.') },
    { q: t('Are pets allowed?', 'Les animaux sont-ils acceptés ?'), a: '' },
    { q: t('Cancellation policy?', 'Politique d’annulation ?'), a: t('Free cancellation up to 48 h before arrival; deposit kept after that.', 'Annulation gratuite jusqu’à 48 h avant l’arrivée ; l’acompte est conservé ensuite.') },
    { q: t('Is breakfast included?', 'Le petit-déjeuner est-il inclus ?'), a: t('Yes, in all 2-night packages.', 'Oui, dans tous les forfaits 2 nuits.') },
  ]);
  const [nq, setNq] = useState({ q: '', a: '' });
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
      <Card>
        <CardHeader icon={<BookOpen />} title={t('FAQ & policies the assistant uses', 'FAQ & règles utilisées par l’assistant')} subtitle={t('Unanswered questions are highlighted — fill them in to train the bot', 'Les questions sans réponse sont signalées — complétez-les pour former l’assistant')} />
        <div className="space-y-2 p-5">
          {faqs.map((f, i) => (
            <div key={i} className={cn('rounded-xl border p-3', !f.a && 'border-warn/50 bg-warn-soft/40')}>
              <p className="text-sm font-semibold text-foreground">{f.q} {!f.a && <Badge tone="warn" className="ml-1">{t('Unanswered ×3', 'Sans réponse ×3')}</Badge>}</p>
              <Textarea value={f.a} onChange={(e) => setFaqs(faqs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} className="mt-2 min-h-[60px]" placeholder={t('Write the answer…', 'Rédigez la réponse…')} />
            </div>
          ))}
          <div className="grid gap-2 rounded-xl border border-dashed p-3">
            <Field label={t('New question', 'Nouvelle question')}><Input value={nq.q} onChange={(e) => setNq({ ...nq, q: e.target.value })} /></Field>
            <Field label={t('Answer', 'Réponse')}><Textarea value={nq.a} onChange={(e) => setNq({ ...nq, a: e.target.value })} className="min-h-[60px]" /></Field>
            <Button size="sm" disabled={!nq.q || !nq.a} onClick={() => { setFaqs([...faqs, nq]); setNq({ q: '', a: '' }); }}><Plus /> {t('Add to knowledge base', 'Ajouter')}</Button>
          </div>
          <Button size="sm" variant="ai" onClick={() => toast.success(t('Assistant retrained with the latest answers', 'Assistant mis à jour avec les dernières réponses'))}><Sparkles /> {t('Publish to assistant', 'Publier vers l’assistant')}</Button>
        </div>
      </Card>
      <Card>
        <CardHeader icon={<MessageSquareText />} title={t('Top topics · 7 days', 'Sujets principaux · 7 jours')} />
        <div className="space-y-2.5 p-5">
          {[{ en: 'Prices & packages', fr: 'Tarifs & forfaits', n: 64 }, { en: 'Availability', fr: 'Disponibilités', n: 51 }, { en: 'Directions & shuttle', fr: 'Itinéraire & navette', n: 38 }, { en: 'Activities', fr: 'Activités', n: 27 }, { en: 'Payment', fr: 'Paiement', n: 19 }, { en: 'Other', fr: 'Autre', n: 12 }].map((x) => (
            <div key={x.en} className="flex items-center gap-3 text-xs">
              <span className="w-32 truncate font-semibold text-foreground">{t(x.en, x.fr)}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-[var(--series-1)]" style={{ width: `${(x.n / 64) * 100}%` }} /></div>
              <span className="w-6 text-right tabular text-muted">{x.n}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function AssistantPage() {
  const { t } = useLanguage();
  const { session } = useSession();
  const staff = session?.role !== 'guest';
  const [tab, setTab] = useState<'inbox' | 'test' | 'knowledge'>('inbox');
  const escalated = seedTranscripts.filter((x) => x.status === 'escalated').length;

  if (!staff)
    return (
      <AppShell title={t('Virtual assistant', 'Assistant virtuel')} subtitle={t('Ask in English or French — a receptionist can take over anytime', 'En français ou en anglais — un(e) réceptionniste peut prendre le relais')}>
        <ChatPanel tall />
      </AppShell>
    );

  const rated = seedTranscripts.filter((x) => x.rating);
  return (
    <AppShell
      title={t('Virtual assistant', 'Assistant virtuel')}
      subtitle={t('Conversations from the website and WhatsApp', 'Conversations du site web et de WhatsApp')}
      actions={<Segmented value={tab} onChange={setTab} options={[{ value: 'inbox', label: <span className="flex items-center gap-1.5"><Inbox className="size-3.5" /> {t('Inbox', 'Boîte')}{escalated > 0 && <span className="rounded-full bg-bad px-1.5 text-[10px] text-white">{escalated}</span>}</span> }, { value: 'test', label: t('Test the bot', 'Tester') }, { value: 'knowledge', label: t('Knowledge', 'Connaissances') }]} />}
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t('Chats · 7 days', 'Conversations · 7 j')} value={211} sub={t('68% outside office hours', '68 % hors heures de bureau')} />
        <Stat label={t('Resolved by AI', 'Résolues par l’IA')} value="84%" tone="ok" />
        <Stat label={t('Satisfaction', 'Satisfaction')} value={`${Math.round((rated.filter((x) => x.rating === 'up').length / rated.length) * 100)}%`} sub={t(`${rated.length} rated chats`, `${rated.length} notées`)} />
        <Stat label={t('Bookings via chat', 'Réservations via chat')} value={17} sub="≈ 2.1M FCFA" />
      </div>
      {tab === 'inbox' && <StaffInbox />}
      {tab === 'test' && <ChatPanel />}
      {tab === 'knowledge' && <Knowledge />}
    </AppShell>
  );
}
