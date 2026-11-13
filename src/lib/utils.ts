import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { addDays, differenceInCalendarDays, format, startOfDay } from 'date-fns';
import { enGB, fr } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 139990 → "139 990 FCFA" */
export function fcfa(n: number, withUnit = true) {
  const s = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return withUnit ? `${s} FCFA` : s;
}

/** compact: 1 250 000 → "1.25M" */
export function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${n}`;
}

export const today = () => startOfDay(new Date());
export const dayOffset = (d: number) => addDays(today(), d);
export const nights = (a: Date, b: Date) => Math.max(0, differenceInCalendarDays(b, a));

export function fmtDate(d: Date, lang: 'en' | 'fr', pattern = 'd MMM') {
  return format(d, pattern, { locale: lang === 'fr' ? fr : enGB });
}

export function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Downloads rows as a UTF-8 CSV (Excel-friendly BOM). */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
