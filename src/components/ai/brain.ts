// Scripted "AI" for the demo. Answers are computed from the live mock store,
// so they stay consistent with what the user sees on screen. No network calls.
import { isSameDay } from 'date-fns';
import type { Lang } from '@/context/LanguageContext';
import type { Role } from '@/context/SessionContext';
import { availableRooms, resTotal } from '@/data/store';
import { baselineForecast, forecastEvents, PACKAGES, type Guest, type Reservation, type Room } from '@/data/seed';
import { dayOffset, fcfa, fmtDate, today } from '@/lib/utils';
import { ROOM_STATUS } from '@/components/ui/status';

export interface AIAction {
  en: string;
  fr: string;
  to?: string;
  event?: 'new-booking';
}

export interface AIReply {
  text: string;
  actions?: AIAction[];
}

export interface BrainCtx {
  lang: Lang;
  role: Role | null;
  rooms: Room[];
  reservations: Reservation[];
  guests: Guest[];
}

const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w));

export function think(raw: string, c: BrainCtx): AIReply {
  const q = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const L = (en: string, fr: string) => (c.lang === 'en' ? en : fr);
  const staff = c.role && c.role !== 'guest';
  const active = c.reservations.filter((r) => r.status !== 'cancelled');
  const guestName = (id: string) => c.guests.find((g) => g.id === id)?.name ?? '—';

  // Room number lookup: "room 302", "chambre 204"
  const roomMatch = q.match(/\b([1-4]0[1-5])\b/);
  if (roomMatch && staff) {
    const room = c.rooms.find((r) => r.number === roomMatch[1]);
    if (room) {
      const cur = active.find((r) => r.roomId === room.id && r.checkIn <= today() && r.checkOut > today());
      const next = active
        .filter((r) => r.roomId === room.id && r.checkIn > today())
        .sort((a, b) => +a.checkIn - +b.checkIn)[0];
      return {
        text: L(
          `Room ${room.number} is a ${room.type} on floor ${room.floor} (${fcfa(room.price)}/night) and is currently **${ROOM_STATUS[room.status].en.toLowerCase()}**.` +
            (cur ? ` ${guestName(cur.guestId)} is staying until ${fmtDate(cur.checkOut, 'en', 'EEE d MMM')}.` : '') +
            (next ? ` Next arrival: ${guestName(next.guestId)} on ${fmtDate(next.checkIn, 'en', 'EEE d MMM')}.` : ' No upcoming arrivals.'),
          `La chambre ${room.number} est une ${room.type} au niveau ${room.floor} (${fcfa(room.price)}/nuit), actuellement **${ROOM_STATUS[room.status].fr.toLowerCase()}**.` +
            (cur ? ` ${guestName(cur.guestId)} y séjourne jusqu'au ${fmtDate(cur.checkOut, 'fr', 'EEE d MMM')}.` : '') +
            (next ? ` Prochaine arrivée : ${guestName(next.guestId)} le ${fmtDate(next.checkIn, 'fr', 'EEE d MMM')}.` : ' Aucune arrivée prévue.'),
        ),
        actions: [{ en: 'Open room map', fr: 'Ouvrir le plan', to: '/rooms' }],
      };
    }
  }

  // Guest lookup by name
  if (staff) {
    const g = c.guests.find((g) => g.name.toLowerCase().split(' ').some((part) => part.length > 3 && q.includes(part.normalize('NFD').replace(/[̀-ͯ]/g, ''))));
    if (g) {
      const rs = active.filter((r) => r.guestId === g.id).sort((a, b) => +a.checkIn - +b.checkIn);
      const cur = rs.find((r) => r.status === 'checked-in') ?? rs.find((r) => r.checkOut > today());
      return {
        text: L(
          `${g.name} (${g.nationality}) — ${g.stays} past stays, ${g.loyalty} loyalty points${g.vip ? ', VIP' : ''}. ` +
            (cur
              ? `Booking ${cur.ref}: ${fmtDate(cur.checkIn, 'en')} → ${fmtDate(cur.checkOut, 'en')}, room ${c.rooms.find((r) => r.id === cur.roomId)?.number ?? 'not assigned yet'}, status ${cur.status}. `
              : 'No upcoming stay. ') +
            (g.preferences.length ? `Preferences: ${g.preferences.join(', ')}.` : ''),
          `${g.name} (${g.nationality}) — ${g.stays} séjours, ${g.loyalty} points fidélité${g.vip ? ', VIP' : ''}. ` +
            (cur
              ? `Réservation ${cur.ref} : ${fmtDate(cur.checkIn, 'fr')} → ${fmtDate(cur.checkOut, 'fr')}, chambre ${c.rooms.find((r) => r.id === cur.roomId)?.number ?? 'non attribuée'}, statut ${cur.status}. `
              : 'Aucun séjour à venir. ') +
            (g.preferences.length ? `Préférences : ${g.preferences.join(', ')}.` : ''),
        ),
        actions: [{ en: 'View reservations', fr: 'Voir les réservations', to: '/reservations' }],
      };
    }
  }

  if (has(q, 'unassigned', 'assign', 'pending', 'attente', 'attribu', 'sans chambre', 'without a room')) {
    const un = active.filter((r) => !r.roomId);
    return {
      text: un.length
        ? L(
            `${un.length} booking(s) still need a room: ${un.map((r) => `${guestName(r.guestId)} (${r.roomType}, ${fmtDate(r.checkIn, 'en')})`).join('; ')}. Drag them onto the room map — I'll highlight the best match.`,
            `${un.length} réservation(s) sans chambre : ${un.map((r) => `${guestName(r.guestId)} (${r.roomType}, ${fmtDate(r.checkIn, 'fr')})`).join(' ; ')}. Glissez-les sur le plan — je surlignerai la meilleure chambre.`,
          )
        : L('Every booking has a room. Nice work!', 'Toutes les réservations ont une chambre. Bravo !'),
      actions: [{ en: 'Open room map', fr: 'Ouvrir le plan', to: '/rooms' }],
    };
  }

  if (has(q, 'check-in', 'checkin', 'arriv', 'today', "aujourd", 'depart', 'check-out', 'checkout') && staff) {
    const ins = active.filter((r) => isSameDay(r.checkIn, today()));
    const outs = active.filter((r) => isSameDay(r.checkOut, today()));
    return {
      text: L(
        `Today: ${ins.length} arrival(s) — ${ins.map((r) => guestName(r.guestId)).join(', ') || 'none'} — and ${outs.length} departure(s) — ${outs.map((r) => guestName(r.guestId)).join(', ') || 'none'}.`,
        `Aujourd'hui : ${ins.length} arrivée(s) — ${ins.map((r) => guestName(r.guestId)).join(', ') || 'aucune'} — et ${outs.length} départ(s) — ${outs.map((r) => guestName(r.guestId)).join(', ') || 'aucun'}.`,
      ),
      actions: [{ en: 'Open front desk', fr: "Ouvrir l'accueil", to: '/dashboard' }],
    };
  }

  if (has(q, 'forecast', 'occupancy', 'occupation', 'prevision', 'demand', 'demande', 'weekend', 'week-end', 'busy') && !has(q, 'free', 'libre', 'dispo', 'available')) {
    const f = baselineForecast(30).filter((d) => d.date >= today());
    const avg7 = f.slice(0, 7).reduce((s, d) => s + d.base, 0) / 7;
    const peak = [...f].sort((a, b) => b.base - a.base)[0];
    const ev = forecastEvents.filter((e) => e.date >= today()).sort((a, b) => +a.date - +b.date)[0];
    return {
      text: L(
        `Next 7 days average ${avg7.toFixed(0)}% occupancy. Peak in the next 30 days: ${fmtDate(peak.date, 'en', 'EEE d MMM')} at ${peak.base.toFixed(0)}%.` +
          (ev ? ` Upcoming driver: ${ev.en} (${fmtDate(ev.date, 'en')}, +${ev.lift} pts).` : '') +
          ' Try the what-if simulator to test a price change.',
        `Moyenne sur 7 jours : ${avg7.toFixed(0)} % d'occupation. Pic sur 30 jours : ${fmtDate(peak.date, 'fr', 'EEE d MMM')} à ${peak.base.toFixed(0)} %.` +
          (ev ? ` Événement à venir : ${ev.fr} (${fmtDate(ev.date, 'fr')}, +${ev.lift} pts).` : '') +
          ' Testez un changement de prix avec le simulateur.',
      ),
      actions: c.role === 'manager' || c.role === 'admin' || c.role === 'finance' ? [{ en: 'Open what-if simulator', fr: 'Ouvrir le simulateur', to: '/dashboard#whatif' }] : undefined,
    };
  }

  if (has(q, 'revenue', 'revenu', 'chiffre', 'money', 'paid', 'paye', 'outstanding', 'impaye', 'balance')) {
    if (!staff) return { text: L('You can see your own bills in your dashboard under “Billing”.', 'Vos factures sont visibles dans votre tableau de bord, rubrique « Facturation ».') };
    const totals = active.filter((r) => r.status !== 'checked-out').map((r) => ({ r, total: resTotal(r, c.rooms) }));
    const due = totals.reduce((s, x) => s + Math.max(0, x.total - x.r.paid), 0);
    const booked = totals.reduce((s, x) => s + x.total, 0);
    return {
      text: L(
        `On the books: ${fcfa(booked)} across ${totals.length} active bookings. Outstanding balance: ${fcfa(due)}. Most guests pay by Airtel Money (38%).`,
        `En portefeuille : ${fcfa(booked)} sur ${totals.length} réservations actives. Solde dû : ${fcfa(due)}. La plupart des clients paient par Airtel Money (38 %).`,
      ),
    };
  }

  if (has(q, 'available', 'availability', 'dispo', 'free room', 'libre', 'book', 'reserv', 'room', 'chambre')) {
    const from = today();
    const to = dayOffset(2);
    const free = availableRooms(c.rooms, c.reservations, from, to);
    const byType = ['Solo', 'Duo', 'VIP', 'Standard'].map((t) => `${t}: ${free.filter((r) => r.type === t).length}`).join(' · ');
    return {
      text: L(
        `For tonight and tomorrow I see ${free.length} free room(s) — ${byType}. 2-night packages start at ${fcfa(PACKAGES[0].price)} (Solo) and include shuttle, meals and games.`,
        `Pour ce soir et demain : ${free.length} chambre(s) libre(s) — ${byType}. Les forfaits 2 nuits commencent à ${fcfa(PACKAGES[0].price)} (Solo), navette, repas et jeux inclus.`,
      ),
      actions: [{ en: 'Start a booking', fr: 'Réserver', event: 'new-booking' }],
    };
  }

  if (has(q, 'price', 'prix', 'tarif', 'cost', 'combien', 'how much', 'package', 'forfait')) {
    return {
      text: L(
        `Our 2-night stays: Solo ${fcfa(PACKAGES[0].price)}, Duo ${fcfa(PACKAGES[1].price)}, VIP ${fcfa(PACKAGES[2].price)}. Each includes restaurant, return transport and free billiards / baby-foot.`,
        `Nos séjours 2 nuits : Solo ${fcfa(PACKAGES[0].price)}, Duo ${fcfa(PACKAGES[1].price)}, VIP ${fcfa(PACKAGES[2].price)}. Restauration, transport aller/retour et billard / baby-foot inclus.`,
      ),
      actions: [{ en: 'Book a stay', fr: 'Réserver un séjour', event: 'new-booking' }],
    };
  }

  if (has(q, 'where', 'ou se', 'adresse', 'address', 'get there', 'venir', 'transport', 'navette', 'shuttle', 'bus')) {
    return {
      text: L(
        'Auberge Le Philo is in Ozouri, about 37 km from Port-Gentil. Our shuttle leaves from in front of CECADO Matanda (5 000 FCFA per person, return). Call +241 074 10 60 80 to reserve a seat.',
        "L'Auberge Le Philo se trouve à Ozouri, à environ 37 km de Port-Gentil. Notre navette part devant le CECADO Matanda (5 000 FCFA par personne, aller/retour). Réservez au +241 074 10 60 80.",
      ),
    };
  }

  if (has(q, 'activit', 'quad', 'boat', 'bateau', 'pool', 'billard', 'concert', 'event', 'evenement', 'tombola', 'buffet')) {
    return {
      text: L(
        'Guests can enjoy quad excursions, estuary boat trips, billiards and baby-foot, open-air grills, buffets and live concerts on weekends. Ask me to add any of them to your booking.',
        "Au programme : excursions en quad, balades en bateau sur l'estuaire, billard et baby-foot, grillades, buffets et concerts live le week-end. Je peux les ajouter à votre réservation.",
      ),
    };
  }

  if (has(q, 'pay', 'paiement', 'airtel', 'moov', 'card', 'carte', 'cash', 'especes')) {
    return {
      text: L(
        'We accept Airtel Money, Moov Money, Visa/Mastercard, cash at the front desk and bank transfer.',
        'Nous acceptons Airtel Money, Moov Money, Visa/Mastercard, les espèces à la réception et le virement bancaire.',
      ),
    };
  }

  if (has(q, 'human', 'humain', 'agent', 'reception', 'staff', 'person', 'call', 'appeler')) {
    return {
      text: L(
        "I've notified the front desk — a receptionist will join this chat shortly. You can also call +241 074 10 60 80.",
        "J'ai prévenu la réception — un(e) réceptionniste va rejoindre la conversation. Vous pouvez aussi appeler le +241 074 10 60 80.",
      ),
    };
  }

  if (has(q, 'hello', 'hi', 'bonjour', 'salut', 'hey')) {
    return { text: L('Hello! 👋 How can I help you today?', 'Bonjour ! 👋 Comment puis-je vous aider ?') };
  }

  return {
    text: staff
      ? L(
          'I can look up guests, rooms (try “room 302”), today’s arrivals, unassigned bookings, revenue and the occupancy forecast.',
          'Je peux rechercher un client, une chambre (essayez « chambre 302 »), les arrivées du jour, les réservations sans chambre, le chiffre d’affaires et les prévisions.',
        )
      : L(
          'I can help with availability, prices, activities, getting to Ozouri and payment options. Or ask me to reach a receptionist.',
          'Je peux vous renseigner sur les disponibilités, les tarifs, les activités, l’accès à Ozouri et les moyens de paiement — ou contacter la réception.',
        ),
  };
}

export function suggestedPrompts(role: Role | null, lang: Lang): string[] {
  const L = (en: string, fr: string) => (lang === 'en' ? en : fr);
  if (!role || role === 'guest')
    return [L('Which rooms are free this weekend?', 'Quelles chambres sont libres ce week-end ?'), L('How do I get to Ozouri?', 'Comment venir à Ozouri ?'), L('What activities are included?', 'Quelles activités sont incluses ?'), L('Can I pay with Airtel Money?', 'Puis-je payer par Airtel Money ?')];
  if (role === 'housekeeping') return [L('Status of room 102', 'Statut de la chambre 102'), L("Today's departures", 'Départs du jour'), L('Status of room 103', 'Statut de la chambre 103')];
  if (role === 'finance') return [L('Outstanding balance?', 'Solde impayé ?'), L('Occupancy forecast', 'Prévision d’occupation'), L('Revenue on the books', 'Chiffre d’affaires prévu')];
  return [L("Who arrives today?", 'Qui arrive aujourd’hui ?'), L('Unassigned bookings', 'Réservations sans chambre'), L('Forecast for next week', 'Prévision semaine prochaine'), L('Tell me about Jean Amvam', 'Parle-moi de Jean Amvam')];
}
