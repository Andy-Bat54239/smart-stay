import { isSameDay } from 'date-fns';
import type { Role } from '@/context/SessionContext';
import { resTotal } from '@/data/store';
import { baselineForecast, type Guest, type Reservation, type Room } from '@/data/seed';
import { fcfa, fmtDate, today } from '@/lib/utils';
import type { Lang } from '@/context/LanguageContext';

export interface Insight {
  tone: 'ai' | 'warn' | 'ok' | 'bad';
  en: string;
  fr: string;
  ask?: { en: string; fr: string };
}

/** Context-aware insights shown at the top of the copilot, per page. */
export function pageInsights(
  path: string,
  role: Role | null,
  d: { rooms: Room[]; reservations: Reservation[]; guests: Guest[] },
  _lang?: Lang,
): Insight[] {
  const active = d.reservations.filter((r) => r.status !== 'cancelled');
  const unassigned = active.filter((r) => !r.roomId);
  const arrivals = active.filter((r) => isSameDay(r.checkIn, today()) && r.status !== 'checked-in');
  const dirty = d.rooms.filter((r) => r.status === 'dirty');
  const out: Insight[] = [];

  if (!role || role === 'guest') {
    return [
      { tone: 'ai', en: 'Weekend demand is high — book early for the best rooms.', fr: 'Forte demande ce week-end — réservez tôt pour les meilleures chambres.', ask: { en: 'Which rooms are free this weekend?', fr: 'Quelles chambres sont libres ce week-end ?' } },
      { tone: 'ok', en: 'Shuttle from CECADO Matanda, 5 000 FCFA return.', fr: 'Navette depuis le CECADO Matanda, 5 000 FCFA A/R.', ask: { en: 'How do I get to Ozouri?', fr: 'Comment venir à Ozouri ?' } },
    ];
  }

  if (path.startsWith('/rooms')) {
    if (unassigned.length)
      out.push({ tone: 'warn', en: `${unassigned.length} booking(s) need a room. Drag them from the tray onto the map.`, fr: `${unassigned.length} réservation(s) sans chambre. Glissez-les sur le plan.`, ask: { en: 'Unassigned bookings', fr: 'Réservations sans chambre' } });
    if (dirty.length) {
      const urgent = dirty.find((room) => arrivals.some((a) => a.roomId === room.id || (!a.roomId && a.roomType === room.type)));
      out.push(
        urgent
          ? { tone: 'ai', en: `Clean ${urgent.number} first — a ${urgent.type} arrival is due today.`, fr: `Nettoyez d'abord la ${urgent.number} — une arrivée ${urgent.type} est prévue aujourd'hui.` }
          : { tone: 'ai', en: `${dirty.map((r) => r.number).join(', ')} to clean — no arrival depends on it today.`, fr: `${dirty.map((r) => r.number).join(', ')} à nettoyer — aucune arrivée n'en dépend aujourd'hui.` },
      );
    }
    out.push({ tone: 'ok', en: 'Floor 3–4 VIP rooms have the highest guest ratings.', fr: 'Les VIP des niveaux 3–4 sont les mieux notées.' });
    return out;
  }

  if (path.startsWith('/reservations')) {
    const pending = active.filter((r) => r.status === 'pending');
    if (pending.length) out.push({ tone: 'warn', en: `${pending.length} pending booking(s) waiting for confirmation.`, fr: `${pending.length} réservation(s) en attente de confirmation.` });
    const unpaid = active.filter((r) => r.status !== 'checked-out' && r.paid < resTotal(r, d.rooms) * 0.3);
    if (unpaid.length) out.push({ tone: 'bad', en: `${unpaid.length} booking(s) have less than 30% deposit. Send an Airtel/Moov payment link?`, fr: `${unpaid.length} réservation(s) avec moins de 30 % d'acompte. Envoyer un lien Airtel/Moov ?` });
    out.push({ tone: 'ai', en: 'OTA bookings cancel 3× more often than direct ones.', fr: 'Les réservations OTA sont annulées 3× plus souvent que les directes.' });
    return out;
  }

  if (path.startsWith('/billing')) {
    const due = active.filter((r) => r.status !== 'checked-out').reduce((s, r) => s + Math.max(0, resTotal(r, d.rooms) - r.paid), 0);
    out.push({ tone: 'warn', en: `${fcfa(due)} still to collect on open folios.`, fr: `${fcfa(due)} restent à encaisser sur les factures ouvertes.`, ask: { en: 'Outstanding balance?', fr: 'Solde impayé ?' } });
    out.push({ tone: 'ai', en: 'Guests who get an Airtel/Moov link pay 3× faster than at checkout.', fr: 'Les clients qui reçoivent un lien Airtel/Moov paient 3× plus vite qu’au départ.' });
    return out;
  }
  if (path.startsWith('/housekeeping')) {
    out.push(dirty.length ? { tone: 'warn', en: `${dirty.length} room(s) to clean — rooms with arrivals today are sorted first.`, fr: `${dirty.length} chambre(s) à nettoyer — celles avec arrivée sont en tête.` } : { tone: 'ok', en: 'Every vacant room is clean and ready to sell.', fr: 'Toutes les chambres libres sont prêtes.' });
    out.push({ tone: 'ai', en: 'Towels and soap kits run out in ~3 days at the forecast occupancy.', fr: 'Serviettes et kits épuisés dans ~3 jours selon la prévision.' });
    return out;
  }
  if (path.startsWith('/guests')) {
    const vip = d.guests.filter((g) => g.vip).map((g) => g.name);
    out.push({ tone: 'ai', en: `VIP guests: ${vip.join(', ') || 'none'} — preferences load automatically at booking.`, fr: `Clients VIP : ${vip.join(', ') || 'aucun'} — leurs préférences sont reprises à la réservation.` });
    out.push({ tone: 'ok', en: 'Revealing an ID number is logged in the audit trail.', fr: 'Afficher un numéro de pièce d’identité est journalisé.' });
    return out;
  }
  if (path.startsWith('/security')) {
    out.push({ tone: 'bad', en: 'One account is not using MFA (Estelle Moussavou).', fr: 'Un compte n’utilise pas le MFA (Estelle Moussavou).' });
    out.push({ tone: 'warn', en: 'A blocked sign-in from a new country happened last night.', fr: 'Une connexion depuis un nouveau pays a été bloquée cette nuit.' });
    return out;
  }

  // dashboard
  if (role === 'receptionist' || role === 'admin' || role === 'manager') {
    if (arrivals.length) out.push({ tone: 'ok', en: `${arrivals.length} arrival(s) today. ${arrivals.filter((r) => !r.roomId).length} without a room.`, fr: `${arrivals.length} arrivée(s) aujourd'hui, dont ${arrivals.filter((r) => !r.roomId).length} sans chambre.`, ask: { en: 'Who arrives today?', fr: 'Qui arrive aujourd’hui ?' } });
  }
  if (role === 'manager' || role === 'admin' || role === 'finance') {
    const f = baselineForecast(14).filter((x) => x.date >= today());
    const peak = [...f].sort((a, b) => b.base - a.base)[0];
    out.push({ tone: 'ai', en: `Demand peaks ${fmtDate(peak.date, 'en', 'EEE d MMM')} (${peak.base.toFixed(0)}%). Consider +10% on VIP that night.`, fr: `Pic de demande le ${fmtDate(peak.date, 'fr', 'EEE d MMM')} (${peak.base.toFixed(0)} %). Envisagez +10 % sur les VIP.`, ask: { en: 'Forecast for next week', fr: 'Prévision semaine prochaine' } });
  }
  if (role === 'finance') {
    const due = active.filter((r) => r.status !== 'checked-out').reduce((s, r) => s + Math.max(0, resTotal(r, d.rooms) - r.paid), 0);
    out.push({ tone: 'warn', en: `Outstanding balances: ${fcfa(due)}.`, fr: `Soldes impayés : ${fcfa(due)}.` });
  }
  if (role === 'housekeeping' && dirty.length) {
    out.push({ tone: 'warn', en: `${dirty.length} room(s) to clean before 14:00 check-ins.`, fr: `${dirty.length} chambre(s) à nettoyer avant les arrivées de 14h.` });
  }
  if (unassigned.length && role !== 'housekeeping' && role !== 'finance')
    out.push({ tone: 'warn', en: `${unassigned.length} booking(s) still need a room.`, fr: `${unassigned.length} réservation(s) sans chambre.`, ask: { en: 'Unassigned bookings', fr: 'Réservations sans chambre' } });
  return out;
}
