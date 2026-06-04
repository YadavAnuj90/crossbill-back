import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('swallows write errors so the request path is never broken', async () => {
    const model = { create: jest.fn().mockRejectedValue(new Error('mongo down')) } as any;
    const svc = new AuditService(model);
    await expect(svc.log({ action: 'test.action' })).resolves.toBeUndefined();
  });

  it('persists the entry via the model', async () => {
    const model = { create: jest.fn().mockResolvedValue({}) } as any;
    const svc = new AuditService(model);
    await svc.log({ action: 'invoice.created', orgId: 'o1' });
    expect(model.create).toHaveBeenCalledWith({ action: 'invoice.created', orgId: 'o1' });
  });
});
