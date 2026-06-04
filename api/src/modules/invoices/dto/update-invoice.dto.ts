import { IsIn, IsOptional } from 'class-validator';
import type { InvoiceStatus } from '../schemas/invoice.schema';

/** Limited mutations; financial fields are immutable once captured (design §12). */
export class UpdateInvoiceDto {
  @IsOptional() @IsIn(['draft', 'sent', 'paid', 'overdue'])
  status?: InvoiceStatus;
}
