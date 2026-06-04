import { financialYearOf, femaDueDate } from './financial-year';

describe('financialYearOf', () => {
  it('maps April–Dec to the starting year', () => {
    expect(financialYearOf(new Date('2026-04-01T00:00:00Z'))).toBe('2026-27');
    expect(financialYearOf(new Date('2026-12-31T00:00:00Z'))).toBe('2026-27');
  });
  it('maps Jan–Mar to the previous starting year', () => {
    expect(financialYearOf(new Date('2027-03-31T00:00:00Z'))).toBe('2026-27');
    expect(financialYearOf(new Date('2026-01-15T00:00:00Z'))).toBe('2025-26');
  });
  it('handles the Mar 31 / Apr 1 boundary', () => {
    expect(financialYearOf(new Date('2026-03-31T00:00:00Z'))).toBe('2025-26');
    expect(financialYearOf(new Date('2026-04-01T00:00:00Z'))).toBe('2026-27');
  });
});

describe('femaDueDate', () => {
  it('is exactly one year after the invoice date (design §12)', () => {
    expect(femaDueDate(new Date('2026-06-02T00:00:00Z')).toISOString().slice(0, 10)).toBe('2027-06-02');
  });
});
