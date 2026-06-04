import { InvoiceNumberService } from './invoice-number.service';

describe('InvoiceNumberService', () => {
  const svc = new InvoiceNumberService();

  it('formats numbers as CB/<FY>/<4-digit seq>', () => {
    expect(svc.format('2026-27', 1)).toBe('CB/2026-27/0001');
    expect(svc.format('2026-27', 42)).toBe('CB/2026-27/0042');
  });

  it('allocates via the atomic upsert and returns the formatted number', async () => {
    const manager = { query: jest.fn().mockResolvedValue([{ last_number: 7 }]) } as any;
    const result = await svc.allocate(manager, 'org-1', '2026-27');
    expect(result).toBe('CB/2026-27/0007');
    expect(manager.query).toHaveBeenCalledTimes(1);
    expect(manager.query.mock.calls[0][0]).toContain('ON CONFLICT');
  });
});
