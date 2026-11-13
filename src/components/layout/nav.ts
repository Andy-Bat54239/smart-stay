import {
  BedDouble, Bell, CalendarRange, FileBarChart, LayoutDashboard, MessageSquareText, Receipt, ShieldCheck,
  Sparkles, TrendingUp, Users, type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/context/SessionContext';
import type { Module, Perm } from '@/data/seed2';

export interface NavItem {
  en: string;
  fr: string;
  to: string;
  icon: LucideIcon;
  group: 'main' | 'ops' | 'comms' | 'admin';
  module: Module;
}

/** Visibility is driven by the editable permission matrix (Security → Permissions). */
export const canSee = (perms: Record<Role, Record<Module, Perm>>, role: Role, item: NavItem) => perms[role]?.[item.module] !== 'none';

export const NAV: NavItem[] = [
  { en: 'Dashboard', fr: 'Tableau de bord', to: '/dashboard', icon: LayoutDashboard, group: 'main', module: 'dashboard' },
  { en: 'Reservations', fr: 'Réservations', to: '/reservations', icon: CalendarRange, group: 'main', module: 'reservations' },
  { en: 'Rooms', fr: 'Chambres', to: '/rooms', icon: BedDouble, group: 'main', module: 'rooms' },
  { en: 'Guests', fr: 'Clients', to: '/guests', icon: Users, group: 'main', module: 'guests' },
  { en: 'Housekeeping', fr: 'Housekeeping', to: '/housekeeping', icon: Sparkles, group: 'ops', module: 'housekeeping' },
  { en: 'Billing', fr: 'Facturation', to: '/billing', icon: Receipt, group: 'ops', module: 'billing' },
  { en: 'AI Forecasting', fr: 'Prévisions IA', to: '/forecasting', icon: TrendingUp, group: 'ops', module: 'forecasting' },
  { en: 'Reports & BI', fr: 'Rapports & BI', to: '/reports', icon: FileBarChart, group: 'ops', module: 'reports' },
  { en: 'Assistant', fr: 'Assistant', to: '/assistant', icon: MessageSquareText, group: 'comms', module: 'assistant' },
  { en: 'Notifications', fr: 'Notifications', to: '/notifications', icon: Bell, group: 'comms', module: 'notifications' },
  { en: 'Security & Access', fr: 'Sécurité & accès', to: '/security', icon: ShieldCheck, group: 'admin', module: 'security' },
];

export const GROUPS = [
  { id: 'main', en: 'Front office', fr: 'Accueil' },
  { id: 'ops', en: 'Operations', fr: 'Gestion' },
  { id: 'comms', en: 'Communication', fr: 'Communication' },
  { id: 'admin', en: 'Administration', fr: 'Administration' },
] as const;
