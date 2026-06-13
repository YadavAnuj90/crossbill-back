import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Note, NoteSchema } from './schemas/note.schema';
import { Counter, CounterSchema } from '../invoices/schemas/counter.schema';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { InvoiceNumberService } from '../invoices/services/invoice-number.service';
import { PdfServiceClient } from '../reports/clients/pdf-service.client';
import { InvoicesModule } from '../invoices/invoices.module';
import { ClientsModule } from '../clients/clients.module';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Note.name, schema: NoteSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
    InvoicesModule,
    ClientsModule,
    UsersModule,
    AuditModule,
  ],
  providers: [NotesService, InvoiceNumberService, PdfServiceClient],
  controllers: [NotesController],
  exports: [NotesService],
})
export class NotesModule {}
