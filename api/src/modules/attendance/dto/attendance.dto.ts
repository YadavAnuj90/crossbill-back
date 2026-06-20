import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

export const LEAVE_TYPES = ['casual', 'sick', 'earned', 'unpaid'] as const;

export class CheckDto {
  @ApiProperty({ description: 'Employee to mark attendance for' })
  @IsMongoId()
  employeeId: string;
}

export class CreateLeaveDto {
  @ApiProperty()
  @IsMongoId()
  employeeId: string;

  @ApiProperty({ enum: LEAVE_TYPES })
  @IsIn(LEAVE_TYPES)
  type: string;

  @ApiProperty({ description: 'ISO date (from)' })
  @IsISO8601()
  from: string;

  @ApiProperty({ description: 'ISO date (to)' })
  @IsISO8601()
  to: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}

export class LeaveDecisionDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  decision: 'approved' | 'rejected';
}
