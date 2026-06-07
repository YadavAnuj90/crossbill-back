/**
 * FEMA realisation: export proceeds must typically be realised within one year of the invoice
 * date (design §8, §12). We surface aging via risk buckets and send nudges at 9/10/11 months.
 */
export type FemaBucket = 'overdue' | 'critical' | 'urgent' | 'watch' | 'ontrack';

export interface FemaAging {
  daysToDue: number;        // days until femaDueDate (negative = overdue)
  monthsElapsed: number;    // whole months since the invoice date
  bucket: FemaBucket;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function daysToDue(femaDueDate: string, now: Date = new Date()): number {
  const due = new Date(`${femaDueDate}T00:00:00Z`).getTime();
  return Math.ceil((due - now.getTime()) / MS_PER_DAY);
}

export function monthsElapsed(invoiceDate: string, now: Date = new Date()): number {
  const d0 = new Date(`${invoiceDate}T00:00:00Z`);
  let months = (now.getUTCFullYear() - d0.getUTCFullYear()) * 12 + (now.getUTCMonth() - d0.getUTCMonth());
  if (now.getUTCDate() < d0.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

export function bucketFor(days: number): FemaBucket {
  if (days <= 0) return 'overdue';
  if (days <= 30) return 'critical';
  if (days <= 60) return 'urgent';
  if (days <= 90) return 'watch';
  return 'ontrack';
}

export function agingOf(invoiceDate: string, femaDueDate: string, now: Date = new Date()): FemaAging {
  const days = daysToDue(femaDueDate, now);
  return { daysToDue: days, monthsElapsed: monthsElapsed(invoiceDate, now), bucket: bucketFor(days) };
}

/** Reminder thresholds (months since invoice) and their stable keys for idempotency. */
export const REMINDER_THRESHOLDS: { key: string; months: number; label: string }[] = [
  { key: '9m', months: 9, label: '3 months to FEMA realisation deadline' },
  { key: '10m', months: 10, label: '2 months to FEMA realisation deadline' },
  { key: '11m', months: 11, label: '1 month to FEMA realisation deadline' },
  { key: 'overdue', months: 12, label: 'FEMA realisation deadline reached' },
];
