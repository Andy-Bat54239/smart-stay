import { useLanguage } from '@/context/LanguageContext';
import type { ResStatus, RoomStatus } from '@/data/seed';
import { Badge, type Tone } from './badge';

export const ROOM_STATUS: Record<RoomStatus, { tone: Tone; en: string; fr: string; color: string }> = {
  available: { tone: 'ok', en: 'Available', fr: 'Disponible', color: 'var(--ok)' },
  occupied: { tone: 'info', en: 'Occupied', fr: 'Occupée', color: 'var(--info)' },
  reserved: { tone: 'warn', en: 'Reserved', fr: 'Réservée', color: 'var(--warn)' },
  dirty: { tone: 'ai', en: 'To clean', fr: 'À nettoyer', color: 'var(--ai)' },
  maintenance: { tone: 'bad', en: 'Maintenance', fr: 'Maintenance', color: 'var(--bad)' },
};

export const RES_STATUS: Record<ResStatus, { tone: Tone; en: string; fr: string }> = {
  pending: { tone: 'warn', en: 'Pending', fr: 'En attente' },
  confirmed: { tone: 'gold', en: 'Confirmed', fr: 'Confirmée' },
  'checked-in': { tone: 'info', en: 'Checked in', fr: 'Arrivé' },
  'checked-out': { tone: 'neutral', en: 'Checked out', fr: 'Parti' },
  cancelled: { tone: 'bad', en: 'Cancelled', fr: 'Annulée' },
};

export function RoomStatusBadge({ status }: { status: RoomStatus }) {
  const { t } = useLanguage();
  const s = ROOM_STATUS[status];
  return <Badge tone={s.tone} dot>{t(s.en, s.fr)}</Badge>;
}

export function ResStatusBadge({ status }: { status: ResStatus }) {
  const { t } = useLanguage();
  const s = RES_STATUS[status];
  return <Badge tone={s.tone} dot>{t(s.en, s.fr)}</Badge>;
}
