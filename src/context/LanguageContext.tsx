import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'fr';

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (en: string, fr: string) => string;
}

const LanguageContext = createContext<Ctx>({ lang: 'en', setLang: () => {}, t: (en) => en });

function read(): Lang {
  try {
    return (localStorage.getItem('smartstay_lang') as Lang) || 'en';
  } catch {
    return 'en';
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(read);
  const setLang = (l: Lang) => {
    try {
      localStorage.setItem('smartstay_lang', l);
    } catch {}
    document.documentElement.lang = l;
    setLangState(l);
  };
  const t = useCallback((en: string, fr: string) => (lang === 'en' ? en : fr), [lang]);
  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
