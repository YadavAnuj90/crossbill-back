import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import type { InvoiceStatus } from '../schemas/invoice.schema';

/** Limited mutations; financial fields are immutable once captured (design §12). */
export class UpdateInvoiceDto {
  @ApiPropertyOptional({
    description: 'New invoice status. Financial fields cannot be changed once captured.',
    enum: ['draft', 'sent', 'paid', 'overdue'],
    example: 'sent',
  })
  @IsOptional() @IsIn(['draft', 'sent', 'paid', 'overdue'])
  status?: InvoiceStatus;
}
