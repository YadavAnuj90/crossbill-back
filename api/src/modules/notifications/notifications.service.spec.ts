import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  it('enqueues a send-email job rather than sending inline', async () => {
    const queue = { add: jest.fn().mockResolvedValue({}) } as any;
    const svc = new NotificationsService(queue);
    await svc.sendEmail('a@b.com', 'Hi', '<p>hi</p>');
    expect(queue.add).toHaveBeenCalledWith('send-email', {
      to: 'a@b.com', subject: 'Hi', html: '<p>hi</p>',
    });
  });
});
