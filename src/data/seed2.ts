// Phase 2 demo data: staff accounts, audit trail, housekeeping, billing ledger,
// notifications and chat transcripts. Dates are relative to "today".
import type { Role } from '@/context/SessionContext';
import type { PayMethod } from './seed';

const ago = (min: number) => new Date(Date.now() - min * 60_000);
const daysAgo = (d: number, h = 10) => {
  const x = new Date();
  x.setDate(x.getDate() - d);
  x.setHours(h, (d * 7) % 60, 0, 0);
  return x;
};

// ── Staff & access ──────────────────────────────────────────────────────────
export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: Exclude<Role, 'guest'>;
  status: 'active' | 'suspended' | 'invited';
  mfa: boolean;
  lastLogin: Date | null;
  shift?: 'morning' | 'evening' | 'night';
}

export const seedUsers: StaffUser[] = [
  { id: 'U01', name: 'Admin Le Philo', email: 'admin@lephilo.ga', role: 'admin', status: 'active', mfa: true, lastLogin: ago(4) },
  { id: 'U02', name: 'Sophie Nzamba', email: 'sophie@lephilo.ga', role: 'manager', status: 'active', mfa: true, lastLogin: ago(35) },
  { id: 'U03', name: 'Marc Obono', email: 'marc@lephilo.ga', role: 'receptionist', status: 'active', mfa: true, lastLogin: ago(12), shift: 'morning' },
  { id: 'U04', name: 'Nadège Ella', email: 'nadege@lephilo.ga', role: 'receptionist', status: 'active', mfa: true, lastLogin: daysAgo(1, 19), shift: 'evening' },
  { id: 'U05', name: 'Amina Mba', email: 'amina@lephilo.ga', role: 'housekeeping', status: 'active', mfa: true, lastLogin: ago(50), shift: 'morning' },
  { id: 'U06', name: 'Rodrigue Nguema', email: 'rodrigue@lephilo.ga', role: 'housekeeping', status: 'active', mfa: true, lastLogin: ago(95), shift: 'morning' },
  { id: 'U07', name: 'Estelle Moussavou', email: 'estelle@lephilo.ga', role: 'housekeeping', status: 'active', mfa: false, lastLogin: daysAgo(2, 8), shift: 'evening' },
  { id: 'U08', name: 'Pierre Mvé', email: 'pierre@lephilo.ga', role: 'finance', status: 'active', mfa: true, lastLogin: ago(180) },
  { id: 'U09', name: 'Hervé Bouanga', email: 'herve@lephilo.ga', role: 'receptionist', status: 'suspended', mfa: false, lastLogin: daysAgo(21, 22), shift: 'night' },
];

export type Module =
  | 'dashboard' | 'reservations' | 'rooms' | 'guests' | 'housekeeping' | 'billing'
  | 'forecasting' | 'reports' | 'assistant' | 'notifications' | 'security';
export type Perm = 'none' | 'view' | 'edit';

export const MODULES: { id: Module; en: string; fr: string }[] = [
  { id: 'dashboard', en: 'Dashboard', fr: 'Tableau de bord' },
  { id: 'reservations', en: 'Reservations', fr: 'Réservations' },
  { id: 'rooms', en: 'Rooms', fr: 'Chambres' },
  { id: 'guests', en: 'Guests', fr: 'Clients' },
  { id: 'housekeeping', en: 'Housekeeping', fr: 'Housekeeping' },
  { id: 'billing', en: 'Billing', fr: 'Facturation' },
  { id: 'forecasting', en: 'AI Forecasting', fr: 'Prévisions IA' },
  { id: 'reports', en: 'Reports & BI', fr: 'Rapports & BI' },
  { id: 'assistant', en: 'Assistant', fr: 'Assistant' },
  { id: 'notifications', en: 'Notifications', fr: 'Notifications' },
  { id: 'security', en: 'Security', fr: 'Sécurité' },
];

const P = (s: string): Record<Module, Perm> => {
  const ids = MODULES.map((m) => m.id);
  const map = { n: 'none', v: 'view', e: 'edit' } as const;
  return Object.fromEntries(ids.map((id, i) => [id, map[s[i] as 'n' | 'v' | 'e']])) as Record<Module, Perm>;
};

// order: dash, res, rooms, guests, hk, billing, fcst, reports, assistant, notif, security
export const seedPermissions: Record<Role, Record<Module, Perm>> = {
  guest: P('vennnnnneen'),
  receptionist: P('eeeevenneen'),
  housekeeping: P('vnenennnvvn'),
  finance: P('vnnnnevevvn'),
  manager: P('eeeeeeeeeen'),
  admin: P('eeeeeeeeeee'),
};

// ── Audit trail ─────────────────────────────────────────────────────────────
export type AuditCat = 'auth' | 'reservation' | 'billing' | 'room' | 'guest-data' | 'user' | 'settings';
export interface AuditEntry {
  id: string;
  at: Date;
  actor: string;
  role: Role | 'system';
  cat: AuditCat;
  en: string;
  fr: string;
  ip?: string;
  risk?: 'low' | 'medium' | 'high';
}

export const seedAudit: AuditEntry[] = [
  { id: 'L01', at: ago(4), actor: 'Admin Le Philo', role: 'admin', cat: 'auth', en: 'Signed in with MFA', fr: 'Connexion avec MFA', ip: '41.158.12.4' },
  { id: 'L02', at: ago(12), actor: 'Marc Obono', role: 'receptionist', cat: 'auth', en: 'Signed in with MFA', fr: 'Connexion avec MFA', ip: '41.158.12.9' },
  { id: 'L03', at: ago(18), actor: 'Marc Obono', role: 'receptionist', cat: 'billing', en: 'Recorded Airtel Money payment 38 499 FCFA on LP-4811', fr: 'Paiement Airtel Money 38 499 FCFA enregistré sur LP-4811', ip: '41.158.12.9' },
  { id: 'L04', at: ago(27), actor: 'Marc Obono', role: 'receptionist', cat: 'guest-data', en: 'Viewed ID document of Paul Obame', fr: 'Pièce d’identité de Paul Obame consultée', ip: '41.158.12.9' },
  { id: 'L05', at: ago(41), actor: 'system', role: 'system', cat: 'reservation', en: 'AI flagged overbooking risk on Saturday', fr: 'L’IA signale un risque de surréservation samedi' },
  { id: 'L06', at: ago(63), actor: 'unknown', role: 'system', cat: 'auth', en: '3 failed logins for herve@lephilo.ga (account suspended)', fr: '3 échecs de connexion pour herve@lephilo.ga (compte suspendu)', ip: '102.89.44.17', risk: 'high' },
  { id: 'L07', at: ago(75), actor: 'system', role: 'system', cat: 'reservation', en: 'OTA booking LP-4816 imported (Kofi Mensah)', fr: 'Réservation OTA LP-4816 importée (Kofi Mensah)' },
  { id: 'L08', at: ago(130), actor: 'Amina Mba', role: 'housekeeping', cat: 'room', en: 'Room 103 set to maintenance (A/C)', fr: 'Chambre 103 en maintenance (clim)', ip: '41.158.12.11' },
  { id: 'L09', at: ago(180), actor: 'Pierre Mvé', role: 'finance', cat: 'billing', en: 'Applied 10% discount on LP-4812', fr: 'Remise de 10 % appliquée sur LP-4812', ip: '41.158.12.5', risk: 'medium' },
  { id: 'L10', at: ago(220), actor: 'Sophie Nzamba', role: 'manager', cat: 'settings', en: 'Changed VIP weekend rate +8%', fr: 'Tarif VIP week-end modifié +8 %', ip: '41.158.12.3' },
  { id: 'L11', at: ago(300), actor: 'Pierre Mvé', role: 'finance', cat: 'guest-data', en: 'Exported guest list (CSV)', fr: 'Liste clients exportée (CSV)', ip: '154.72.3.200', risk: 'medium' },
  { id: 'L12', at: daysAgo(1, 23), actor: 'Nadège Ella', role: 'receptionist', cat: 'reservation', en: 'Moved Marie Nzé from 202 to 205', fr: 'Marie Nzé déplacée de la 202 à la 205', ip: '41.158.12.9' },
  { id: 'L13', at: daysAgo(1, 2), actor: 'unknown', role: 'system', cat: 'auth', en: 'Login attempt from new country (NG) blocked', fr: 'Tentative de connexion depuis un nouveau pays (NG) bloquée', ip: '197.210.54.8', risk: 'high' },
  { id: 'L14', at: daysAgo(2, 9), actor: 'Admin Le Philo', role: 'admin', cat: 'user', en: 'Suspended account herve@lephilo.ga', fr: 'Compte herve@lephilo.ga suspendu', ip: '41.158.12.4' },
  { id: 'L15', at: daysAgo(3, 15), actor: 'Admin Le Philo', role: 'admin', cat: 'user', en: 'Created staff account estelle@lephilo.ga', fr: 'Compte estelle@lephilo.ga créé', ip: '41.158.12.4' },
];

// ── Housekeeping ────────────────────────────────────────────────────────────
export interface LostItem {
  id: string;
  found: Date;
  room: string;
  en: string;
  fr: string;
  by: string;
  status: 'stored' | 'claimed' | 'disposed';
}

export const seedLost: LostItem[] = [
  { id: 'LF1', found: daysAgo(0, 9), room: '102', en: 'Phone charger (USB-C)', fr: 'Chargeur de téléphone (USB-C)', by: 'Amina Mba', status: 'stored' },
  { id: 'LF2', found: daysAgo(3, 11), room: '301', en: 'Sunglasses, black case', fr: 'Lunettes de soleil, étui noir', by: 'Rodrigue Nguema', status: 'stored' },
  { id: 'LF3', found: daysAgo(6, 12), room: '205', en: 'Children’s sandals', fr: 'Sandales d’enfant', by: 'Estelle Moussavou', status: 'claimed' },
  { id: 'LF4', found: daysAgo(40, 10), room: '401', en: 'Paperback novel', fr: 'Roman de poche', by: 'Amina Mba', status: 'disposed' },
];

export interface StockItem {
  id: string;
  en: string;
  fr: string;
  qty: number;
  par: number; // target level
  unit: string;
  usePerDay: number;
}

export const seedStock: StockItem[] = [
  { id: 'S1', en: 'Bed sheets (sets)', fr: 'Draps (parures)', qty: 46, par: 60, unit: 'sets', usePerDay: 6 },
  { id: 'S2', en: 'Bath towels', fr: 'Serviettes de bain', qty: 22, par: 72, unit: 'pcs', usePerDay: 9 },
  { id: 'S3', en: 'Toilet paper', fr: 'Papier toilette', qty: 140, par: 200, unit: 'rolls', usePerDay: 12 },
  { id: 'S4', en: 'Soap & shampoo kits', fr: 'Kits savon & shampoing', qty: 18, par: 80, unit: 'kits', usePerDay: 7 },
  { id: 'S5', en: 'Mosquito repellent', fr: 'Anti-moustique', qty: 35, par: 30, unit: 'cans', usePerDay: 2 },
  { id: 'S6', en: 'Drinking water (1.5 L)', fr: 'Eau minérale (1,5 L)', qty: 96, par: 120, unit: 'btl', usePerDay: 14 },
];

export const cleanerStats = [
  { name: 'Amina Mba', rooms: [6, 7, 5, 8, 7, 6, 4], avgMin: 31, score: 4.8 },
  { name: 'Rodrigue Nguema', rooms: [5, 5, 6, 4, 6, 7, 3], avgMin: 36, score: 4.6 },
  { name: 'Estelle Moussavou', rooms: [4, 6, 5, 5, 3, 5, 2], avgMin: 34, score: 4.7 },
];

// ── Billing ledger ──────────────────────────────────────────────────────────
export interface Charge {
  id: string;
  resId: string;
  at: Date;
  en: string;
  fr: string;
  amount: number; // before tax; negative = discount
  kind: 'service' | 'fnb' | 'damage' | 'discount';
}

export interface Payment {
  id: string;
  resId: string;
  at: Date;
  method: PayMethod;
  amount: number; // negative = refund
  ref: string;
  kind: 'deposit' | 'payment' | 'refund';
  payer?: string;
}

export const seedCharges: Charge[] = [
  { id: 'C1', resId: 'B01', at: daysAgo(1, 20), en: 'Dinner buffet × 2', fr: 'Buffet du soir × 2', amount: 20000, kind: 'fnb' },
  { id: 'C2', resId: 'B01', at: daysAgo(0, 8), en: 'Laundry', fr: 'Blanchisserie', amount: 6500, kind: 'service' },
  { id: 'C3', resId: 'B02', at: daysAgo(0, 13), en: 'Bar — drinks', fr: 'Bar — boissons', amount: 8500, kind: 'fnb' },
  { id: 'C4', resId: 'B03', at: daysAgo(1, 9), en: 'Broken glass', fr: 'Verre cassé', amount: 3000, kind: 'damage' },
];

export const TAX_LINES = [
  { en: 'VAT', fr: 'TVA', rate: 0.1, note: { en: 'Applied to rooms and services', fr: 'Appliquée aux chambres et services' } },
  { en: 'Service charge', fr: 'Frais de service', rate: 0, note: { en: 'Disabled', fr: 'Désactivé' } },
];

// ── Notifications ───────────────────────────────────────────────────────────
export type Channel = 'email' | 'sms' | 'inapp' | 'whatsapp';
export interface Notice {
  id: string;
  at: Date;
  en: string;
  fr: string;
  kind: 'booking' | 'checkin' | 'housekeeping' | 'maintenance' | 'payment' | 'promo' | 'system' | 'ai';
  roles: Role[];
  read: boolean;
  priority?: 'high';
}

const STAFF: Role[] = ['receptionist', 'manager', 'admin'];
export const seedNotices: Notice[] = [
  { id: 'N1', at: ago(6), en: 'Room 102 needs cleaning before a Solo arrival tomorrow', fr: 'La chambre 102 doit être nettoyée avant une arrivée Solo demain', kind: 'housekeeping', roles: ['housekeeping', 'receptionist', 'manager'], read: false },
  { id: 'N2', at: ago(18), en: 'Payment received: 38 499 FCFA via Airtel Money (LP-4811)', fr: 'Paiement reçu : 38 499 FCFA via Airtel Money (LP-4811)', kind: 'payment', roles: ['finance', 'receptionist', 'manager', 'admin'], read: false },
  { id: 'N3', at: ago(42), en: 'Overbooking risk on Saturday — 2 VIP requests above capacity', fr: 'Risque de surréservation samedi — 2 demandes VIP de trop', kind: 'ai', roles: STAFF, read: false, priority: 'high' },
  { id: 'N4', at: ago(75), en: 'New OTA booking from Kofi Mensah (no room assigned)', fr: 'Nouvelle réservation OTA de Kofi Mensah (sans chambre)', kind: 'booking', roles: STAFF, read: true },
  { id: 'N5', at: ago(130), en: 'Maintenance: A/C fault reported in room 103', fr: 'Maintenance : panne de clim signalée en chambre 103', kind: 'maintenance', roles: ['housekeeping', 'manager', 'admin', 'receptionist'], read: true, priority: 'high' },
  { id: 'N6', at: ago(240), en: 'Sylvie Koumba and Paul Obame arrive today', fr: 'Sylvie Koumba et Paul Obame arrivent aujourd’hui', kind: 'checkin', roles: ['receptionist', 'manager'], read: true },
  { id: 'N7', at: daysAgo(1, 9), en: 'Weekly forecast report is ready', fr: 'Le rapport de prévision hebdomadaire est prêt', kind: 'system', roles: ['manager', 'finance', 'admin'], read: true },
  { id: 'N8', at: daysAgo(1, 7), en: 'Linen stock below 40% — reorder towels', fr: 'Stock de linge sous 40 % — commander des serviettes', kind: 'housekeeping', roles: ['housekeeping', 'manager'], read: false },
  { id: 'N9', at: daysAgo(2, 16), en: 'Unpaid balance over 7 days: Paul Obame (LP-4814)', fr: 'Solde impayé depuis 7 jours : Paul Obame (LP-4814)', kind: 'payment', roles: ['finance', 'manager'], read: true },
];

export interface Broadcast {
  id: string;
  at: Date;
  title: string;
  channels: Channel[];
  audience: string;
  sent: number;
  opened: number;
  by: string;
}

export const seedBroadcasts: Broadcast[] = [
  { id: 'BC1', at: daysAgo(4, 11), title: 'Grande Tombola — tickets 2 500 FCFA', channels: ['sms', 'whatsapp'], audience: 'All guests', sent: 412, opened: 268, by: 'Sophie Nzamba' },
  { id: 'BC2', at: daysAgo(12, 10), title: 'Fête des pères — 49 990 FCFA', channels: ['email', 'sms'], audience: 'Past guests (12 months)', sent: 286, opened: 141, by: 'Sophie Nzamba' },
  { id: 'BC3', at: daysAgo(30, 15), title: 'Journée portes ouvertes', channels: ['whatsapp', 'inapp'], audience: 'All guests', sent: 398, opened: 301, by: 'Admin Le Philo' },
];

export interface AutoRule {
  id: string;
  en: string;
  fr: string;
  when: { en: string; fr: string };
  channels: Channel[];
  on: boolean;
  sent30: number;
}

export const seedRules: AutoRule[] = [
  { id: 'R1', en: 'Booking confirmation', fr: 'Confirmation de réservation', when: { en: 'Immediately after booking', fr: 'Juste après la réservation' }, channels: ['email', 'sms'], on: true, sent30: 64 },
  { id: 'R2', en: 'Pre-arrival + directions', fr: 'Pré-arrivée + itinéraire', when: { en: '2 days before check-in', fr: '2 jours avant l’arrivée' }, channels: ['whatsapp', 'email'], on: true, sent30: 58 },
  { id: 'R3', en: 'Check-in reminder', fr: 'Rappel d’arrivée', when: { en: 'Morning of check-in', fr: 'Matin de l’arrivée' }, channels: ['sms'], on: true, sent30: 57 },
  { id: 'R4', en: 'Check-out reminder', fr: 'Rappel de départ', when: { en: '08:00 on departure day', fr: '8h le jour du départ' }, channels: ['inapp', 'sms'], on: true, sent30: 55 },
  { id: 'R5', en: 'Post-stay thank you + review', fr: 'Remerciement + avis', when: { en: '1 day after check-out', fr: '1 jour après le départ' }, channels: ['email', 'whatsapp'], on: true, sent30: 49 },
  { id: 'R6', en: 'Deposit reminder', fr: 'Rappel d’acompte', when: { en: '24 h after booking if unpaid', fr: '24 h après la réservation si impayé' }, channels: ['sms', 'whatsapp'], on: false, sent30: 0 },
];

export const integrations = [
  { id: 'email', en: 'Email (SMTP)', fr: 'Email (SMTP)', ok: true, detail: 'contact@lephilo.ga' },
  { id: 'sms', en: 'SMS gateway', fr: 'Passerelle SMS', ok: true, detail: 'Airtel Gabon · 1 840 credits' },
  { id: 'whatsapp', en: 'WhatsApp Business', fr: 'WhatsApp Business', ok: true, detail: '+241 074 10 60 80' },
  { id: 'push', en: 'In-app push', fr: 'Notifications in-app', ok: false, detail: 'Mobile app not yet published' },
];

// ── Assistant transcripts ───────────────────────────────────────────────────
export interface Transcript {
  id: string;
  at: Date;
  guest: string;
  lang: 'en' | 'fr';
  channel: 'web' | 'whatsapp';
  topic: { en: string; fr: string };
  status: 'resolved' | 'escalated' | 'open';
  rating?: 'up' | 'down';
  turns: { from: 'guest' | 'ai' | 'staff'; text: string }[];
}

export const seedTranscripts: Transcript[] = [
  {
    id: 'T1', at: ago(22), guest: 'Amélie Dubois', lang: 'fr', channel: 'web', topic: { en: 'Airport transfer', fr: 'Transfert aéroport' }, status: 'escalated',
    turns: [
      { from: 'guest', text: 'Bonjour, est-ce que vous pouvez venir me chercher à l’aéroport de Port-Gentil le 15 ?' },
      { from: 'ai', text: 'Notre navette part devant le CECADO Matanda. Pour un transfert depuis l’aéroport, je transmets votre demande à la réception.' },
      { from: 'guest', text: 'Merci, j’arrive à 14h20 vol AF 0950.' },
    ],
  },
  {
    id: 'T2', at: ago(95), guest: 'Website visitor', lang: 'en', channel: 'web', topic: { en: 'Prices & availability', fr: 'Tarifs & disponibilités' }, status: 'resolved', rating: 'up',
    turns: [
      { from: 'guest', text: 'How much is a weekend for two?' },
      { from: 'ai', text: 'Our 2-night Duo Stay is 139 990 FCFA, including restaurant, return transport and games.' },
      { from: 'guest', text: 'Great, thanks!' },
    ],
  },
  {
    id: 'T3', at: ago(160), guest: 'Kofi Mensah', lang: 'en', channel: 'whatsapp', topic: { en: 'Quad excursion', fr: 'Excursion quad' }, status: 'resolved', rating: 'up',
    turns: [
      { from: 'guest', text: 'Can I add a quad ride to my booking?' },
      { from: 'ai', text: 'Done — a quad excursion has been added for 2 people on your booking LP-4816.' },
    ],
  },
  {
    id: 'T4', at: ago(400), guest: 'Website visitor', lang: 'fr', channel: 'web', topic: { en: 'Pets', fr: 'Animaux' }, status: 'resolved', rating: 'down',
    turns: [
      { from: 'guest', text: 'Les chiens sont acceptés ?' },
      { from: 'ai', text: 'Je peux vous renseigner sur les disponibilités, les tarifs, les activités…' },
    ],
  },
  {
    id: 'T5', at: ago(600), guest: 'Grâce Ndong', lang: 'fr', channel: 'whatsapp', topic: { en: 'Late checkout', fr: 'Départ tardif' }, status: 'open',
    turns: [{ from: 'guest', text: 'Est-ce possible de partir à 16h demain ?' }],
  },
];

export const NATIONALITY_MIX = [
  { en: 'Gabon', fr: 'Gabon', share: 71 },
  { en: 'Cameroon', fr: 'Cameroun', share: 8 },
  { en: 'France', fr: 'France', share: 7 },
  { en: 'Congo', fr: 'Congo', share: 5 },
  { en: 'Equatorial Guinea', fr: 'Guinée équatoriale', share: 4 },
  { en: 'Other', fr: 'Autres', share: 5 },
];

export const LOS_DIST = [
  { nights: '1', share: 18 },
  { nights: '2', share: 46 },
  { nights: '3', share: 17 },
  { nights: '4', share: 9 },
  { nights: '5–6', share: 6 },
  { nights: '7+', share: 4 },
];
