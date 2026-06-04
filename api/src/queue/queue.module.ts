import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from './queue.constants';

/**
 * Redis-backed BullMQ registration (design §6, §13).
 * All jobs are idempotent and retried with exponential backoff; failures land in a DLQ.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = new URL(config.get<string>('redis.url') ?? 'redis://localhost:6379');
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port || 6379),
            password: url.password || undefined,
          },
          defaultJobOptions: {
            attempts: 5,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 1000,
            removeOnFail: false, // keep for DLQ inspection
          },
        };
      },
    }),
    BullModule.registerQueue({ name: QUEUES.PDF }, { name: QUEUES.EMAIL }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
