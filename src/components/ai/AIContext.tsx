import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSession } from '@/context/SessionContext';
import { useStore } from '@/data/store';
import { think, type AIAction } from './brain';

export interface ChatMsg {
  id: number;
  from: 'user' | 'ai';
  text: string;
  actions?: AIAction[];
  streaming?: boolean;
  rating?: 'up' | 'down';
}

interface Ctx {
  copilotOpen: boolean;
  setCopilotOpen: (v: boolean) => void;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  bookingOpen: boolean;
  setBookingOpen: (v: boolean) => void;
  messages: ChatMsg[];
  thinking: boolean;
  ask: (q: string) => void;
  rate: (id: number, r: 'up' | 'down') => void;
  reset: () => void;
}

const AICtx = createContext<Ctx | null>(null);
let mid = 1;

export function AIProvider({ children }: { children: ReactNode }) {
  const { lang } = useLanguage();
  const { session } = useSession();
  const store = useStore();
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [thinking, setThinking] = useState(false);
  const timers = useRef<number[]>([]);

  // keep latest store for async replies
  const ctxRef = useRef({ lang, role: session?.role ?? null, rooms: store.rooms, reservations: store.reservations, guests: store.guests });
  ctxRef.current = { lang, role: session?.role ?? null, rooms: store.rooms, reservations: store.reservations, guests: store.guests };

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Global shortcuts: ⌘K / Ctrl+K palette, ⌘J / Ctrl+J copilot
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setCopilotOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const ask = useCallback((q: string) => {
    if (!q.trim()) return;
    setCopilotOpen(true);
    const user: ChatMsg = { id: mid++, from: 'user', text: q.trim() };
    setMessages((m) => [...m, user]);
    setThinking(true);
    const reply = think(q, ctxRef.current);
    const id = mid++;
    // Simulated latency + token streaming
    const t0 = window.setTimeout(() => {
      setThinking(false);
      setMessages((m) => [...m, { id, from: 'ai', text: '', streaming: true }]);
      const words = reply.text.split(/(\s+)/);
      let i = 0;
      const step = () => {
        i += 3;
        const done = i >= words.length;
        setMessages((m) =>
          m.map((x) => (x.id === id ? { ...x, text: words.slice(0, i).join(''), streaming: !done, actions: done ? reply.actions : undefined } : x)),
        );
        if (!done) timers.current.push(window.setTimeout(step, 28));
      };
      step();
    }, 650);
    timers.current.push(t0);
  }, []);

  const rate = (id: number, r: 'up' | 'down') => setMessages((m) => m.map((x) => (x.id === id ? { ...x, rating: r } : x)));
  const reset = () => setMessages([]);

  return (
    <AICtx.Provider
      value={{ copilotOpen, setCopilotOpen, paletteOpen, setPaletteOpen, bookingOpen, setBookingOpen, messages, thinking, ask, rate, reset }}
    >
      {children}
    </AICtx.Provider>
  );
}

export function useAI() {
  const c = useContext(AICtx);
  if (!c) throw new Error('useAI must be used inside AIProvider');
  return c;
}
