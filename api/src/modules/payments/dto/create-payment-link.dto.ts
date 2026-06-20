import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class CreatePaymentLinkDto {
  @ApiProperty({ description: 'Invoice to raise a Razorpay payment link for', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @IsMongoId()
  invoiceId: string;
}
