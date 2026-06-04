/**
 * Indian financial year runs April–March (design §8).
 * For a date in Apr 2026..Mar 2027 the FY label is '2026-27'.
 */
export function financialYearOf(date: Date): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth(); // 0 = Jan
  const startYear = m >= 3 ? y : y - 1; // April (index 3) onward
  const endYY = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${endYY}`;
}

/** FEMA realisation clock = invoice date + 1 year (design §8, §12). */
export function femaDueDate(invoiceDate: Date): Date {
  const d = new Date(invoiceDate);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d;
}
