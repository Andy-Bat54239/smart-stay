export function tierOf(points: number) {
  if (points >= 5000) return { en: 'Platinum', fr: 'Platine', next: null as number | null };
  if (points >= 2000) return { en: 'Gold', fr: 'Or', next: 5000 };
  if (points >= 500) return { en: 'Silver', fr: 'Argent', next: 2000 };
  return { en: 'Member', fr: 'Membre', next: 500 };
}
