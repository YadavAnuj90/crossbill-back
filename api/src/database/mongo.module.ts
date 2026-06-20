import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

/** MongoDB is Crossbill's primary datastore (design §6, §8). */
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('mongo.uri') ?? 'mongodb://127.0.0.1:27017/crossbill';
        return {
          uri,
          // Fail fast with a clear error instead of hanging ~30s when Mongo is unreachable.
          serverSelectionTimeoutMS: 5000,
          connectionFactory: (connection: any) => {
            connection.on('connected', () => console.log(`[Mongo] connected → ${uri}`));
            connection.on('error', (err: any) => console.error(`[Mongo] connection error for ${uri}: ${err.message}`));
            return connection;
          },
        };
      },
    }),
  ],
})
export class MongoModule {}
