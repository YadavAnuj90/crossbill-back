import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditService } from './audit.service';
import { EventLog, EventLogSchema } from './schemas/event-log.schema';
import { DocumentMeta, DocumentMetaSchema } from './schemas/document-meta.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EventLog.name, schema: EventLogSchema },
      { name: DocumentMeta.name, schema: DocumentMetaSchema },
    ]),
  ],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
