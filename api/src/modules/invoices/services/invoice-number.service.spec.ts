import { InvoiceNumberService } from './invoice-number.service';

describe('InvoiceNumberService', () => {
  it('formats numbers as CB/<FY>/<4-digit seq>', () => {
    const svc = new InvoiceNumberService({} as any);
    expect(svc.format('2026-27', 1)).toBe('CB/2026-27/0001');
    expect(svc.format('2026-27', 42)).toBe('CB/2026-27/0042');
  });

  it('allocates via an atomic findByIdAndUpdate($inc) and returns the formatted number', async () => {
    const exec = jest.fn().mockResolvedValue({ seq: 7 });
    const counters = { findByIdAndUpdate: jest.fn().mockReturnValue({ exec }) } as any;
    const svc = new InvoiceNumberService(counters);

    const result = await svc.allocate('org-1', '2026-27');

    expect(result).toBe('CB/2026-27/0007');
    expect(counters.findByIdAndUpdate).toHaveBeenCalledWith(
      'org-1:2026-27',
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
  });
});
