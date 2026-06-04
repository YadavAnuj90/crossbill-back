import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

/** MongoDB is Crossbill's primary datastore (design §6, §8). */
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
