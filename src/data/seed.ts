// Demo data for Auberge Le Philo — Ozouri · Port-Gentil, Gabon.
// Rooms, guests and prices come from the original prototype; dates are generated
// relative to "today" so the demo always looks live.
import { addDays, format, subMonths } from 'date-fns';
import { dayOffset, today } from '@/lib/utils';

export type RoomType = 'Solo' | 'Duo' | 'VIP' | 'Standard';
export type RoomStatus = 'available' | 'occupied' | 'reserved' | 'dirty' | 'maintenance';
export type ResStatus = 'pending' | 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled';
export type Channel = 'direct' | 'walk-in' | 'phone' | 'ota';
export type PayMethod = 'airtel' | 'moov' | 'card' | 'cash' | 'bank';

export interface Room {
  id: string;
  number: string;
  type: RoomType;
  floor: number;
  price: number; // per night, FCFA
  capacity: number;
  status: RoomStatus;
  amenities: string[];
  view?: { en: string; fr: string };
}

export interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string;
  nationality: string;
  loyalty: number;
  stays: number;
  vip?: boolean;
  preferences: string[];
  address?: string;
  idType?: 'CNI' | 'Passport';
  idNumber?: string;
  notes?: string;
  blacklisted?: { reason: string; at: Date };
  marketing?: boolean;
}

export interface AddOn {
  id: string;
  en: string;
  fr: string;
  price: number;
  per: 'stay' | 'person' | 'night';
}

export interface Reservation {
  id: string;
  ref: string;
  guestId: string;
  roomId: string | null;
  roomType: RoomType;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  status: ResStatus;
  channel: Channel;
  addOns: string[];
  paid: number;
  note?: string;
}

export const TAX_RATE = 0.1; // matches the prototype's invoices (10 %)

export const ROOM_TYPE_INFO: Record<RoomType, { en: string; fr: string; capacity: number; color: string }> = {
  Solo: { en: 'Solo', fr: 'Solo', capacity: 1, color: '#4a8060' },
  Duo: { en: 'Duo', fr: 'Duo', capacity: 2, color: '#2d5a3d' },
  VIP: { en: 'VIP', fr: 'VIP', capacity: 2, color: '#c9a227' },
  Standard: { en: 'Standard', fr: 'Standard', capacity: 3, color: '#8b6914' },
};

const base = ['WiFi', 'A/C', 'TV', 'Hot water'];
const duo = [...base, 'Mini bar', 'Room service'];
const vip = [...duo, 'Balcony', 'Kitchenette', 'Sea view'];

export const seedRooms: Room[] = [
  { id: 'R101', number: '101', type: 'Solo', floor: 1, price: 49995, capacity: 1, status: 'available', amenities: base, view: { en: 'Garden', fr: 'Jardin' } },
  { id: 'R102', number: '102', type: 'Solo', floor: 1, price: 49995, capacity: 1, status: 'dirty', amenities: base, view: { en: 'Garden', fr: 'Jardin' } },
  { id: 'R103', number: '103', type: 'Duo', floor: 1, price: 69995, capacity: 2, status: 'maintenance', amenities: duo, view: { en: 'Courtyard', fr: 'Cour' } },
  { id: 'R201', number: '201', type: 'Duo', floor: 2, price: 69995, capacity: 2, status: 'occupied', amenities: duo, view: { en: 'Garden', fr: 'Jardin' } },
  { id: 'R202', number: '202', type: 'Duo', floor: 2, price: 69995, capacity: 2, status: 'available', amenities: duo, view: { en: 'Garden', fr: 'Jardin' } },
  { id: 'R203', number: '203', type: 'Duo', floor: 2, price: 69995, capacity: 2, status: 'reserved', amenities: duo, view: { en: 'Courtyard', fr: 'Cour' } },
  { id: 'R204', number: '204', type: 'Standard', floor: 2, price: 99990, capacity: 3, status: 'available', amenities: [...duo, 'Balcony', 'Kitchenette'], view: { en: 'Estuary', fr: 'Estuaire' } },
  { id: 'R205', number: '205', type: 'Duo', floor: 2, price: 69995, capacity: 2, status: 'occupied', amenities: duo, view: { en: 'Garden', fr: 'Jardin' } },
  { id: 'R301', number: '301', type: 'VIP', floor: 3, price: 79995, capacity: 2, status: 'occupied', amenities: vip, view: { en: 'Sea', fr: 'Mer' } },
  { id: 'R302', number: '302', type: 'VIP', floor: 3, price: 79995, capacity: 2, status: 'available', amenities: vip, view: { en: 'Sea', fr: 'Mer' } },
  { id: 'R401', number: '401', type: 'VIP', floor: 4, price: 79995, capacity: 2, status: 'available', amenities: [...vip, 'Jacuzzi'], view: { en: 'Panoramic', fr: 'Panoramique' } },
  { id: 'R402', number: '402', type: 'VIP', floor: 4, price: 79995, capacity: 2, status: 'reserved', amenities: [...vip, 'Jacuzzi'], view: { en: 'Panoramic', fr: 'Panoramique' } },
];

export const seedGuests: Guest[] = [
  { id: 'G001', name: 'Jean Amvam', email: 'jean.amvam@email.com', phone: '+241 07 12 34 56', nationality: 'Gabon', loyalty: 2450, stays: 6, vip: true, preferences: ['Sea view', 'Late checkout', 'Non-smoking'] },
  { id: 'G002', name: 'Marie Nzé', email: 'marie.nze@email.com', phone: '+241 06 98 76 54', nationality: 'Gabon', loyalty: 980, stays: 3, preferences: ['Quiet room', 'Vegetarian'] },
  { id: 'G003', name: 'Paul Obame', email: 'paul.obame@email.com', phone: '+241 07 45 67 89', nationality: 'Cameroon', loyalty: 320, stays: 1, preferences: ['High floor'] },
  { id: 'G004', name: 'Sylvie Koumba', email: 'sylvie.k@email.com', phone: '+241 06 23 45 67', nationality: 'Gabon', loyalty: 1210, stays: 4, preferences: ['Twin beds'] },
  { id: 'G005', name: 'Christelle Mba', email: 'christelle.mba@email.com', phone: '+241 07 89 01 23', nationality: 'Gabon', loyalty: 640, stays: 2, preferences: ['Garden view'] },
  { id: 'G006', name: 'Luc Ondo', email: 'luc.ondo@email.com', phone: '+241 07 33 21 90', nationality: 'Gabon', loyalty: 150, stays: 1, preferences: [] },
  { id: 'G007', name: 'Amélie Dubois', email: 'amelie.dubois@email.fr', phone: '+33 6 12 44 80 21', nationality: 'France', loyalty: 0, stays: 0, preferences: ['Boat tour'] },
  { id: 'G008', name: 'Kofi Mensah', email: 'kofi.mensah@email.com', phone: '+233 24 555 0192', nationality: 'Ghana', loyalty: 410, stays: 2, preferences: ['Quad excursion'] },
  { id: 'G009', name: 'Grâce Ndong', email: 'grace.ndong@email.com', phone: '+241 06 77 10 45', nationality: 'Gabon', loyalty: 860, stays: 3, preferences: ['Ground floor'] },
  { id: 'G010', name: 'Thomas Leroy', email: 'thomas.leroy@email.be', phone: '+32 470 12 34 56', nationality: 'Belgium', loyalty: 0, stays: 0, preferences: [] },
];

// Add-on services. Transport (5 000) and buffet (10 000) come from Le Philo's
// own flyers; the other prices are demo placeholders to confirm with the client.
export const ADD_ONS: AddOn[] = [
  { id: 'buffet', en: 'Buffet', fr: 'Buffet', price: 10000, per: 'person' },
  { id: 'shuttle', en: 'Shuttle (return)', fr: 'Navette (aller/retour)', price: 5000, per: 'person' },
  { id: 'boat', en: 'Estuary boat tour', fr: "Balade sur l'estuaire", price: 20000, per: 'person' },
  { id: 'quad', en: 'Quad excursion', fr: 'Excursion en quad', price: 15000, per: 'person' },
  { id: 'late', en: 'Late checkout (16:00)', fr: 'Départ tardif (16h)', price: 10000, per: 'stay' },
];

export const PACKAGES = [
  { type: 'Solo' as RoomType, price: 99990, nights: 2, en: 'Solo Stay', fr: 'Séjour Solo' },
  { type: 'Duo' as RoomType, price: 139990, nights: 2, en: 'Duo Stay', fr: 'Séjour Duo' },
  { type: 'VIP' as RoomType, price: 159990, nights: 2, en: 'VIP Stay', fr: 'Séjour VIP' },
];

let refN = 4810;
const mk = (
  id: string,
  guestId: string,
  roomId: string | null,
  roomType: RoomType,
  inOff: number,
  len: number,
  status: ResStatus,
  channel: Channel,
  adults: number,
  paidRatio: number,
  addOns: string[] = [],
  note?: string,
): Reservation => {
  const room = seedRooms.find((r) => r.id === roomId);
  const price = room?.price ?? seedRooms.find((r) => r.type === roomType)!.price;
  return {
    id,
    ref: `LP-${refN++}`,
    guestId,
    roomId,
    roomType,
    checkIn: dayOffset(inOff),
    checkOut: dayOffset(inOff + len),
    adults,
    status,
    channel,
    addOns,
    paid: Math.round(price * len * (1 + TAX_RATE) * paidRatio),
    note,
  };
};

export const seedReservations: Reservation[] = [
  mk('B01', 'G001', 'R301', 'VIP', -2, 4, 'checked-in', 'direct', 2, 1, ['boat', 'late'], 'Anniversary — champagne on arrival'),
  mk('B02', 'G002', 'R205', 'Duo', -1, 5, 'checked-in', 'phone', 2, 0.5, ['shuttle']),
  mk('B03', 'G009', 'R201', 'Duo', -3, 3, 'checked-in', 'walk-in', 1, 1),
  mk('B04', 'G004', 'R203', 'Duo', 0, 3, 'confirmed', 'direct', 2, 0.5, ['buffet']),
  mk('B05', 'G003', 'R402', 'VIP', 0, 4, 'confirmed', 'ota', 2, 0.25, ['quad']),
  mk('B06', 'G005', 'R102', 'Solo', -4, 4, 'checked-out', 'direct', 1, 1),
  mk('B07', 'G008', null, 'Duo', 1, 2, 'pending', 'ota', 2, 0, ['quad', 'boat']),
  mk('B08', 'G007', null, 'VIP', 2, 5, 'pending', 'direct', 2, 0, ['boat'], 'First visit to Gabon'),
  mk('B09', 'G006', null, 'Solo', 1, 1, 'confirmed', 'phone', 1, 1),
  mk('B10', 'G010', 'R204', 'Standard', 3, 4, 'confirmed', 'ota', 3, 0.3, ['shuttle', 'buffet']),
  mk('B11', 'G002', 'R302', 'VIP', 6, 2, 'confirmed', 'direct', 2, 0.5),
  mk('B12', 'G004', 'R101', 'Solo', 8, 3, 'pending', 'direct', 1, 0),
  mk('B13', 'G001', 'R401', 'VIP', 12, 3, 'confirmed', 'direct', 2, 0.5, ['late']),
  mk('B14', 'G009', 'R202', 'Duo', 5, 2, 'cancelled', 'phone', 2, 0),
  mk('B15', 'G008', 'R205', 'Duo', 4, 3, 'confirmed', 'ota', 2, 0.25),
  mk('B16', 'G003', 'R202', 'Duo', 9, 4, 'confirmed', 'direct', 2, 0.5),
];

// ── Analytics series ────────────────────────────────────────────────────────
// Deterministic pseudo-random so charts don't jump on every render.
function rng(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

export const revenueByMonth = (() => {
  const r = rng(7);
  return Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(today(), 5 - i);
    const rooms = 9_500_000 + r() * 4_000_000 + i * 350_000;
    const services = 1_800_000 + r() * 1_200_000;
    return { month: d, rooms: Math.round(rooms), services: Math.round(services) };
  });
})();

export const paymentMix: { method: PayMethod; share: number }[] = [
  { method: 'airtel', share: 38 },
  { method: 'moov', share: 22 },
  { method: 'cash', share: 18 },
  { method: 'card', share: 14 },
  { method: 'bank', share: 8 },
];

export const channelMix: { channel: Channel; share: number }[] = [
  { channel: 'direct', share: 46 },
  { channel: 'phone', share: 24 },
  { channel: 'ota', share: 19 },
  { channel: 'walk-in', share: 11 },
];

export interface ForecastEvent {
  date: Date;
  en: string;
  fr: string;
  lift: number; // occupancy points added
}

function nextDate(month: number, day: number) {
  const t = today();
  const d = new Date(t.getFullYear(), month, day);
  return d < t ? new Date(t.getFullYear() + 1, month, day) : d;
}

export const forecastEvents: ForecastEvent[] = [
  { date: nextDate(11, 24), en: 'Christmas Eve', fr: 'Réveillon de Noël', lift: 22 },
  { date: nextDate(11, 31), en: "New Year's Eve", fr: 'Saint-Sylvestre', lift: 28 },
  { date: addDays(today(), ((6 - today().getDay() + 7) % 7) + 7), en: 'Live concert weekend', fr: 'Week-end concert live', lift: 18 },
];

/** Baseline daily occupancy (%) for the next `days` days plus 14 days of history. */
export function baselineForecast(days: number) {
  const r = rng(42);
  const out: { date: Date; base: number; actual?: number; low: number; high: number; event?: ForecastEvent }[] = [];
  for (let i = -14; i < days; i++) {
    const date = addDays(today(), i);
    const dow = date.getDay();
    const weekend = dow === 5 || dow === 6 ? 16 : dow === 0 ? 6 : 0;
    const season = 8 * Math.sin((date.getMonth() + date.getDate() / 30) / 1.9);
    const event = forecastEvents.find((e) => format(e.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
    const eventLift = event ? event.lift : 0;
    const base = Math.min(100, Math.max(18, 58 + weekend + season + eventLift + (r() - 0.5) * 8));
    const spread = 4 + Math.min(14, Math.max(0, i) * 0.12);
    out.push({
      date,
      base,
      actual: i < 0 ? Math.min(100, Math.max(10, base + (r() - 0.5) * 9)) : undefined,
      low: Math.max(0, base - spread),
      high: Math.min(100, base + spread),
      event,
    });
  }
  return out;
}

export const MODEL_INFO = { name: 'Gradient-boosted seasonal model', mape: 5.7, accuracy: 94.3, trainedOn: 730 };
