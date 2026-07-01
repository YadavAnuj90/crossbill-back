import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Client, ClientSchema } from './schemas/client.schema';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Client.name, schema: ClientSchema }]), AuditModule],
  providers: [ClientsService],
  controllers: [ClientsController],
  exports: [ClientsService],
})
export class ClientsModule {}
