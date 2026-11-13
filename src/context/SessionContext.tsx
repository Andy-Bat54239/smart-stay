import { createContext, useContext, useState, type ReactNode } from 'react';

export type Role = 'guest' | 'receptionist' | 'housekeeping' | 'finance' | 'manager' | 'admin';

export interface Session {
  role: Role;
  name: string;
  email: string;
  guestId?: string;
}

export const ROLE_PROFILES: Record<Role, Session> = {
  guest: { role: 'guest', name: 'Jean Amvam', email: 'client@lephilo.ga', guestId: 'G001' },
  receptionist: { role: 'receptionist', name: 'Marc Obono', email: 'marc@lephilo.ga' },
  housekeeping: { role: 'housekeeping', name: 'Amina Mba', email: 'amina@lephilo.ga' },
  finance: { role: 'finance', name: 'Pierre Mvé', email: 'pierre@lephilo.ga' },
  manager: { role: 'manager', name: 'Sophie Nzamba', email: 'sophie@lephilo.ga' },
  admin: { role: 'admin', name: 'Admin Le Philo', email: 'admin@lephilo.ga' },
};

export const ROLE_LABEL: Record<Role, { en: string; fr: string }> = {
  guest: { en: 'Guest', fr: 'Client' },
  receptionist: { en: 'Receptionist', fr: 'Réceptionniste' },
  housekeeping: { en: 'Housekeeping', fr: 'Housekeeping' },
  finance: { en: 'Finance', fr: 'Finance' },
  manager: { en: 'Manager', fr: 'Manager' },
  admin: { en: 'Administrator', fr: 'Administrateur' },
};

interface Ctx {
  session: Session | null;
  signIn: (role: Role) => void;
  signInAs: (s: Session) => void;
  signOut: () => void;
}

const SessionContext = createContext<Ctx | null>(null);

function read(): Session | null {
  try {
    const r = localStorage.getItem('smartstay_role') as Role | null;
    return r && ROLE_PROFILES[r] ? ROLE_PROFILES[r] : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(read);
  const signIn = (role: Role) => {
    try {
      localStorage.setItem('smartstay_role', role);
    } catch {}
    setSession(ROLE_PROFILES[role]);
  };
  const signInAs = (s: Session) => {
    try {
      localStorage.setItem('smartstay_role', s.role);
    } catch {}
    setSession(s);
  };
  const signOut = () => {
    try {
      localStorage.removeItem('smartstay_role');
    } catch {}
    setSession(null);
  };
  return <SessionContext.Provider value={{ session, signIn, signInAs, signOut }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
