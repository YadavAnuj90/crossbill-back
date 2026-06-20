import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { PAID_PLAN_IDS } from '../plans';

export class CheckoutDto {
  @ApiProperty({ description: 'Plan to upgrade to', enum: PAID_PLAN_IDS, example: 'pro' })
  @IsIn(PAID_PLAN_IDS)
  planId: string;
}
