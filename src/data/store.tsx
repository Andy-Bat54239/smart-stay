import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import { isSameDay } from 'date-fns';
import {
  ADD_ONS,
  seedGuests,
  seedReservations,
  seedRooms,
  TAX_RATE,
  type Guest,
  type Reservation,
  type ResStatus,
  type Room,
  type RoomStatus,
} from './seed';
import { nights, today } from '@/lib/utils';
import { useSession, ROLE_PROFILES, type Role } from '@/context/SessionContext';
import {
  seedAudit, seedBroadcasts, seedCharges, seedLost, seedNotices, seedPermissions, seedRules, seedStock, seedUsers,
  type AuditCat, type AuditEntry, type AutoRule, type Broadcast, type Charge, type LostItem, type Module, type Notice,
  type Payment, type Perm, type StaffUser, type StockItem,
} from './seed2';

export interface ActivityItem {
  id: string;
  at: Date;
  en: string;
  fr: string;
  kind: 'checkin' | 'checkout' | 'booking' | 'room' | 'payment' | 'ai';
}

interface State {
  rooms: Room[];
  guests: Guest[];
  reservations: Reservation[];
  activity: ActivityItem[];
  charges: Charge[];
  payments: Payment[];
  users: StaffUser[];
  audit: AuditEntry[];
  notices: Notice[];
  permissions: Record<Role, Record<Module, Perm>>;
  broadcasts: Broadcast[];
  rules: AutoRule[];
  lost: LostItem[];
  stock: StockItem[];
}

export type Action =
  | { type: 'assign'; resId: string; roomId: string }
  | { type: 'status'; resId: string; status: ResStatus }
  | { type: 'room'; roomId: string; status: RoomStatus }
  | { type: 'create'; res: Reservation; guest?: Guest }
  | { type: 'charge'; charge: Charge }
  | { type: 'pay'; payment: Payment }
  | { type: 'guest'; id: string; patch: Partial<Guest> }
  | { type: 'guest-add'; guest: Guest }
  | { type: 'user-add'; user: StaffUser }
  | { type: 'user'; id: string; patch: Partial<StaffUser> }
  | { type: 'notice-read'; id: string | 'all'; role: Role }
  | { type: 'notice-add'; notice: Notice }
  | { type: 'perm'; role: Role; module: Module; perm: Perm }
  | { type: 'broadcast'; b: Broadcast }
  | { type: 'rule'; id: string; on: boolean }
  | { type: 'lost-add'; item: LostItem }
  | { type: 'lost'; id: string; status: LostItem['status'] }
  | { type: 'stock'; id: string; delta: number }
  | { type: 'audit'; cat: AuditCat; en: string; fr: string; risk?: AuditEntry['risk'] };

type Actor = { actor: string; role: Role | 'system' };

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

const initial: State = {
  rooms: seedRooms,
  guests: seedGuests.map((g) =>
    g.id === 'G003' ? { ...g, idType: 'Passport', idNumber: 'CM9876543', address: 'Douala, Cameroun' } : { ...g, idType: 'CNI', idNumber: `GA${g.id.slice(1)}48${g.phone.slice(-2)}`, address: 'Port-Gentil', marketing: true },
  ),
  reservations: seedReservations,
  charges: seedCharges,
  payments: seedReservations
    .filter((r) => r.paid > 0)
    .map((r, i) => ({
      id: `P${i}`,
      resId: r.id,
      at: r.status === 'checked-in' ? new Date(Date.now() - (i + 1) * 18 * 60000) : new Date(r.checkIn.getTime() - 5 * 86400000),
      method: (['airtel', 'moov', 'card', 'cash', 'bank'] as const)[i % 5],
      amount: r.paid,
      ref: `TX${70412 + i * 37}`,
      kind: (r.status === 'checked-in' || r.status === 'checked-out') && r.paid > 0 ? 'payment' : 'deposit',
    })),
  users: seedUsers,
  audit: seedAudit,
  notices: seedNotices,
  permissions: seedPermissions,
  broadcasts: seedBroadcasts,
  rules: seedRules,
  lost: seedLost,
  stock: seedStock,
  activity: [
    { id: 'a1', at: minutesAgo(6), en: 'Christelle Mba checked out of 102', fr: 'Christelle Mba a quitté la 102', kind: 'checkout' },
    { id: 'a2', at: minutesAgo(18), en: 'Airtel Money payment 38 499 FCFA · LP-4811', fr: 'Paiement Airtel Money 38 499 FCFA · LP-4811', kind: 'payment' },
    { id: 'a3', at: minutesAgo(42), en: 'AI flagged overbooking risk on Saturday', fr: "L'IA signale un risque de surréservation samedi", kind: 'ai' },
    { id: 'a4', at: minutesAgo(75), en: 'New OTA booking from Kofi Mensah', fr: 'Nouvelle réservation OTA de Kofi Mensah', kind: 'booking' },
    { id: 'a5', at: minutesAgo(130), en: 'Room 103 set to maintenance (A/C)', fr: 'Chambre 103 en maintenance (clim)', kind: 'room' },
  ],
};

let actId = 100;
const log = (en: string, fr: string, kind: ActivityItem['kind']): ActivityItem => ({
  id: `a${actId++}`,
  at: new Date(),
  en,
  fr,
  kind,
});

let auditId = 1000;
function withAudit(s: State, who: Actor, cat: AuditCat, en: string, fr: string, risk?: AuditEntry['risk']): State {
  const ip = { admin: '41.158.12.4', manager: '41.158.12.3', receptionist: '41.158.12.9', housekeeping: '41.158.12.11', finance: '41.158.12.5', guest: 'web', system: undefined }[who.role];
  return { ...s, audit: [{ id: `L${auditId++}`, at: new Date(), actor: who.actor, role: who.role, cat, en, fr, ip, risk }, ...s.audit] };
}

function reducer(state: State, act: Action & Actor): State {
  const s = core(state, act);
  const g = (id: string) => state.guests.find((x) => x.id === id)?.name ?? '—';
  const res = 'resId' in act ? state.reservations.find((r) => r.id === act.resId) : undefined;
  switch (act.type) {
    case 'assign':
      return withAudit(s, act, 'room', `Assigned ${res?.ref} to room ${state.rooms.find((r) => r.id === act.roomId)?.number}`, `${res?.ref} attribuée à la chambre ${state.rooms.find((r) => r.id === act.roomId)?.number}`);
    case 'status':
      return withAudit(s, act, 'reservation', `${res?.ref} (${g(res!.guestId)}) → ${act.status}`, `${res?.ref} (${g(res!.guestId)}) → ${act.status}`);
    case 'create':
      return withAudit(s, act, 'reservation', `Created booking ${act.res.ref}`, `Réservation ${act.res.ref} créée`);
    case 'room':
      return withAudit(s, act, 'room', `Room ${state.rooms.find((r) => r.id === act.roomId)?.number} → ${act.status}`, `Chambre ${state.rooms.find((r) => r.id === act.roomId)?.number} → ${act.status}`);
    case 'charge':
      return withAudit(s, act, 'billing', `${act.charge.amount < 0 ? 'Discount' : 'Charge'} ${act.charge.amount} FCFA on ${res?.ref}: ${act.charge.en}`, `${act.charge.amount < 0 ? 'Remise' : 'Débit'} ${act.charge.amount} FCFA sur ${res?.ref} : ${act.charge.fr}`, act.charge.amount < 0 ? 'medium' : undefined);
    case 'pay':
      return withAudit(s, act, 'billing', `${act.payment.kind} ${act.payment.amount} FCFA via ${act.payment.method} on ${res?.ref}`, `${act.payment.kind} ${act.payment.amount} FCFA via ${act.payment.method} sur ${res?.ref}`, act.payment.amount < 0 ? 'medium' : undefined);
    case 'guest':
      return withAudit(s, act, 'guest-data', `Updated guest ${g(act.id)}${act.patch.blacklisted ? ' (blacklisted)' : ''}`, `Client ${g(act.id)} modifié${act.patch.blacklisted ? ' (liste noire)' : ''}`, act.patch.blacklisted ? 'medium' : undefined);
    case 'guest-add':
      return withAudit(s, act, 'guest-data', `Registered guest ${act.guest.name}`, `Client ${act.guest.name} enregistré`);
    case 'user-add':
      return withAudit(s, act, 'user', `Created staff account ${act.user.email} (${act.user.role})`, `Compte ${act.user.email} créé (${act.user.role})`);
    case 'user': {
      const u = state.users.find((x) => x.id === act.id);
      return withAudit(s, act, 'user', `Updated ${u?.email}: ${Object.entries(act.patch).map(([k, v]) => `${k}=${String(v)}`).join(', ')}`, `${u?.email} modifié : ${Object.entries(act.patch).map(([k, v]) => `${k}=${String(v)}`).join(', ')}`, act.patch.status === 'suspended' || act.patch.role ? 'medium' : undefined);
    }
    case 'perm':
      return withAudit(s, act, 'settings', `Permission ${act.role}/${act.module} → ${act.perm}`, `Permission ${act.role}/${act.module} → ${act.perm}`, 'medium');
    case 'broadcast':
      return withAudit(s, act, 'settings', `Broadcast sent: ${act.b.title}`, `Diffusion envoyée : ${act.b.title}`);
    case 'audit':
      return withAudit(s, act, act.cat, act.en, act.fr, act.risk);
    default:
      return s;
  }
}

function core(s: State, a: Action): State {
  const guestName = (id: string) => s.guests.find((g) => g.id === id)?.name ?? '—';
  switch (a.type) {
    case 'assign': {
      const room = s.rooms.find((r) => r.id === a.roomId)!;
      const res = s.reservations.find((r) => r.id === a.resId)!;
      const startsToday = isSameDay(res.checkIn, today());
      return {
        ...s,
        reservations: s.reservations.map((r) =>
          r.id === a.resId
            ? { ...r, roomId: a.roomId, roomType: room.type, status: r.status === 'pending' ? 'confirmed' : r.status }
            : r,
        ),
        rooms: startsToday
          ? s.rooms.map((r) => (r.id === a.roomId && r.status === 'available' ? { ...r, status: 'reserved' } : r))
          : s.rooms,
        activity: [
          log(`${guestName(res.guestId)} assigned to room ${room.number}`, `${guestName(res.guestId)} assigné(e) à la chambre ${room.number}`, 'room'),
          ...s.activity,
        ],
      };
    }
    case 'status': {
      const res = s.reservations.find((r) => r.id === a.resId)!;
      let rooms = s.rooms;
      let entry: ActivityItem | null = null;
      if (a.status === 'checked-in' && res.roomId) {
        rooms = rooms.map((r) => (r.id === res.roomId ? { ...r, status: 'occupied' } : r));
        entry = log(`${guestName(res.guestId)} checked in`, `${guestName(res.guestId)} est arrivé(e)`, 'checkin');
      }
      if (a.status === 'checked-out' && res.roomId) {
        rooms = rooms.map((r) => (r.id === res.roomId ? { ...r, status: 'dirty' } : r));
        entry = log(`${guestName(res.guestId)} checked out`, `${guestName(res.guestId)} est parti(e)`, 'checkout');
      }
      if (a.status === 'cancelled') {
        entry = log(`Booking ${res.ref} cancelled`, `Réservation ${res.ref} annulée`, 'booking');
        if (res.roomId && isSameDay(res.checkIn, today()))
          rooms = rooms.map((r) => (r.id === res.roomId && r.status === 'reserved' ? { ...r, status: 'available' } : r));
      }
      if (a.status === 'confirmed') entry = log(`Booking ${res.ref} confirmed`, `Réservation ${res.ref} confirmée`, 'booking');
      return {
        ...s,
        rooms,
        reservations: s.reservations.map((r) => (r.id === a.resId ? { ...r, status: a.status } : r)),
        activity: entry ? [entry, ...s.activity] : s.activity,
      };
    }
    case 'room': {
      const room = s.rooms.find((r) => r.id === a.roomId)!;
      return {
        ...s,
        rooms: s.rooms.map((r) => (r.id === a.roomId ? { ...r, status: a.status } : r)),
        activity: [log(`Room ${room.number} → ${a.status}`, `Chambre ${room.number} → ${a.status}`, 'room'), ...s.activity],
      };
    }
    case 'create': {
      const guests = a.guest ? [a.guest, ...s.guests] : s.guests;
      const name = guests.find((g) => g.id === a.res.guestId)?.name ?? '—';
      return {
        ...s,
        guests,
        reservations: [a.res, ...s.reservations],
        activity: [log(`New booking ${a.res.ref} for ${name}`, `Nouvelle réservation ${a.res.ref} pour ${name}`, 'booking'), ...s.activity],
      };
    }
    case 'charge':
      return { ...s, charges: [...s.charges, a.charge] };
    case 'pay':
      return {
        ...s,
        payments: [...s.payments, a.payment],
        reservations: s.reservations.map((r) => (r.id === a.payment.resId ? { ...r, paid: r.paid + a.payment.amount } : r)),
        activity: [log(`${a.payment.amount < 0 ? 'Refund' : 'Payment'} ${Math.abs(a.payment.amount)} FCFA · ${a.payment.method}`, `${a.payment.amount < 0 ? 'Remboursement' : 'Paiement'} ${Math.abs(a.payment.amount)} FCFA · ${a.payment.method}`, 'payment'), ...s.activity],
      };
    case 'guest':
      return { ...s, guests: s.guests.map((g) => (g.id === a.id ? { ...g, ...a.patch } : g)) };
    case 'guest-add':
      return { ...s, guests: [a.guest, ...s.guests] };
    case 'user-add':
      return { ...s, users: [...s.users, a.user] };
    case 'user':
      return { ...s, users: s.users.map((u) => (u.id === a.id ? { ...u, ...a.patch } : u)) };
    case 'notice-read':
      return { ...s, notices: s.notices.map((n) => (a.id === 'all' ? (n.roles.includes(a.role) ? { ...n, read: true } : n) : n.id === a.id ? { ...n, read: true } : n)) };
    case 'notice-add':
      return { ...s, notices: [a.notice, ...s.notices] };
    case 'perm':
      return { ...s, permissions: { ...s.permissions, [a.role]: { ...s.permissions[a.role], [a.module]: a.perm } } };
    case 'broadcast':
      return { ...s, broadcasts: [a.b, ...s.broadcasts] };
    case 'rule':
      return { ...s, rules: s.rules.map((r) => (r.id === a.id ? { ...r, on: a.on } : r)) };
    case 'lost-add':
      return { ...s, lost: [a.item, ...s.lost] };
    case 'lost':
      return { ...s, lost: s.lost.map((l) => (l.id === a.id ? { ...l, status: a.status } : l)) };
    case 'stock':
      return { ...s, stock: s.stock.map((x) => (x.id === a.id ? { ...x, qty: Math.max(0, x.qty + a.delta) } : x)) };
    case 'audit':
      return s;
  }
}

interface Ctx extends State {
  dispatch: (a: Action) => void;
  guest: (id: string) => Guest | undefined;
  room: (id: string | null) => Room | undefined;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, raw] = useReducer(reducer, initial);
  const { session } = useSession();
  const value = useMemo<Ctx>(
    () => ({
      ...state,
      dispatch: (a: Action) => raw({ ...a, actor: session ? ROLE_PROFILES[session.role].name : 'Guest (web)', role: session?.role ?? 'guest' }),
      guest: (id) => state.guests.find((g) => g.id === id),
      room: (id) => (id ? state.rooms.find((r) => r.id === id) : undefined),
    }),
    [state, session],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

// ── Pricing ──────────────────────────────────────────────────────────────────
export function quote(nightly: number, n: number, adults: number, addOnIds: string[], discountPct = 0) {
  const room = nightly * n;
  const extras = addOnIds.reduce((sum, id) => {
    const a = ADD_ONS.find((x) => x.id === id);
    if (!a) return sum;
    return sum + a.price * (a.per === 'person' ? adults : a.per === 'night' ? n : 1);
  }, 0);
  const discount = Math.round((room + extras) * (discountPct / 100));
  const subtotal = room + extras - discount;
  const tax = Math.round(subtotal * TAX_RATE);
  return { room, extras, discount, subtotal, tax, total: subtotal + tax };
}

export function resTotal(r: Reservation, rooms: Room[]) {
  const nightly = rooms.find((x) => x.id === r.roomId)?.price ?? rooms.find((x) => x.type === r.roomType)!.price;
  return quote(nightly, nights(r.checkIn, r.checkOut), r.adults, r.addOns).total;
}

/** Rooms free for the whole [from, to) range. */
export function availableRooms(rooms: Room[], reservations: Reservation[], from: Date, to: Date, ignoreResId?: string) {
  return rooms.filter((room) => {
    if (room.status === 'maintenance') return false;
    return !reservations.some(
      (r) =>
        r.id !== ignoreResId &&
        r.roomId === room.id &&
        r.status !== 'cancelled' &&
        r.status !== 'checked-out' &&
        r.checkIn < to &&
        r.checkOut > from,
    );
  });
}

/** AI-style room suggestion: scores free rooms by fit with guest preferences and party size. */
export function suggestRooms(rooms: Room[], reservations: Reservation[], res: Reservation, guest?: Guest) {
  const free = availableRooms(rooms, reservations, res.checkIn, res.checkOut, res.id);
  const prefs = (guest?.preferences ?? []).join(' ').toLowerCase();
  return free
    .map((room) => {
      let score = 50;
      const reasons: { en: string; fr: string }[] = [];
      if (room.type === res.roomType) {
        score += 25;
        reasons.push({ en: `Matches booked ${room.type} type`, fr: `Correspond au type ${room.type} réservé` });
      }
      if (room.capacity >= res.adults) score += 8;
      else score -= 40;
      if (prefs.includes('sea') && room.view?.en === 'Sea') {
        score += 12;
        reasons.push({ en: 'Guest prefers sea view', fr: 'Le client préfère la vue mer' });
      }
      if (prefs.includes('high floor') && room.floor >= 3) {
        score += 10;
        reasons.push({ en: 'Guest prefers a high floor', fr: 'Le client préfère un étage élevé' });
      }
      if (prefs.includes('ground floor') && room.floor === 1) {
        score += 10;
        reasons.push({ en: 'Guest prefers ground floor', fr: 'Le client préfère le rez-de-chaussée' });
      }
      if (prefs.includes('quiet') && room.floor >= 2) {
        score += 6;
        reasons.push({ en: 'Quieter upper floor', fr: 'Étage plus calme' });
      }
      if (room.status === 'available') {
        score += 5;
        reasons.push({ en: 'Clean and ready now', fr: 'Propre et prête' });
      }
      if (room.status === 'dirty') score -= 8;
      return { room, score: Math.min(99, score), reasons };
    })
    .sort((a, b) => b.score - a.score);
}

// ── Folio (guest bill) ───────────────────────────────────────────────────────
export function folio(r: Reservation, s: { rooms: Room[]; charges: Charge[]; payments: Payment[] }) {
  const room = s.rooms.find((x) => x.id === r.roomId) ?? s.rooms.find((x) => x.type === r.roomType)!;
  const n = nights(r.checkIn, r.checkOut);
  const lines: { en: string; fr: string; qty: number; unit: number; amount: number; kind: string; at?: Date }[] = [
    { en: r.roomId ? `${r.roomType} room ${room.number}` : `${r.roomType} room (to be assigned)`, fr: r.roomId ? `Chambre ${r.roomType} ${room.number}` : `Chambre ${r.roomType} (à attribuer)`, qty: n, unit: room.price, amount: room.price * n, kind: 'room' },
  ];
  r.addOns.forEach((id) => {
    const a = ADD_ONS.find((x) => x.id === id);
    if (!a) return;
    const qty = a.per === 'person' ? r.adults : a.per === 'night' ? n : 1;
    lines.push({ en: a.en, fr: a.fr, qty, unit: a.price, amount: a.price * qty, kind: 'addon' });
  });
  s.charges.filter((c) => c.resId === r.id).forEach((c) => lines.push({ en: c.en, fr: c.fr, qty: 1, unit: c.amount, amount: c.amount, kind: c.kind, at: c.at }));
  const subtotal = lines.reduce((t, l) => t + l.amount, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;
  const pays = s.payments.filter((p) => p.resId === r.id);
  const paid = pays.reduce((t, p) => t + p.amount, 0);
  return { lines, subtotal, tax, total, payments: pays, paid, balance: total - paid };
}
