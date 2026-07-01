import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CancelEInvoiceDto {
  @ApiProperty({ description: 'Reason for cancelling the IRN (NIC requires one)', example: 'Wrong details entered' })
  @IsString() @MinLength(3) @MaxLength(200)
  reason: string;
}
