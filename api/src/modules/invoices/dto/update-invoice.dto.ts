import { IsIn, IsOptional } from 'class-validator';
import type { InvoiceStatus } from '../entities/invoice.entity';

/** Limited mutations on a draft; financial fields are immutable once captured (design §12). */
export class UpdateInvoiceDto {
  @IsOptional() @IsIn(['draft', 'sent', 'paid', 'overdue'])
  status?: InvoiceStatus;
}
