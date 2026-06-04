import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

/**
 * Mongo owns append-heavy / schema-loose data: event logs, document metadata,
 * webhook payloads (design §6, §8). Money never lives here.
 * Optional in v1 — connection is skipped if MONGO_URI is unset.
 */
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongo.uri') ?? 'mongodb://localhost:27017/crossbill',
      }),
    }),
  ],
})
export class MongoModule {}
