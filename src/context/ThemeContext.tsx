import { createContext, useContext, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'light', toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );
  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    const apply = () => {
      document.documentElement.classList.toggle('dark', next === 'dark');
      setTheme(next);
    };
    try {
      localStorage.setItem('smartstay_theme', next);
    } catch {}
    // Smooth cross-fade where the View Transitions API exists
    const d = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (d.startViewTransition) d.startViewTransition(apply);
    else apply();
  };
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
