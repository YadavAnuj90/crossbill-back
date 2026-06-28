import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

export const LEAVE_TYPES = ['casual', 'sick', 'earned', 'unpaid'] as const;
export const ATTENDANCE_STATUSES = ['present', 'absent', 'half', 'leave'] as const;
export const LEAVE_STATUSES = ['pending', 'approved', 'rejected'] as const;

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

/** Optional, additive filters for the attendance list (still returns an array). */
export class ListAttendanceQueryDto {
  @ApiPropertyOptional({ description: 'Filter by employee' })
  @IsOptional() @IsMongoId()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Filter by month (YYYY-MM)' })
  @IsOptional() @IsString() @MaxLength(7)
  month?: string;

  @ApiPropertyOptional({ enum: ATTENDANCE_STATUSES })
  @IsOptional() @IsIn(ATTENDANCE_STATUSES)
  status?: string;

  @ApiPropertyOptional({ description: 'Range start, ISO date (inclusive)' })
  @IsOptional() @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'Range end, ISO date (inclusive)' })
  @IsOptional() @IsISO8601()
  to?: string;
}

/** Optional, additive filters for the leave list (still returns an array). */
export class ListLeaveQueryDto {
  @ApiPropertyOptional({ description: 'Filter by employee' })
  @IsOptional() @IsMongoId()
  employeeId?: string;

  @ApiPropertyOptional({ enum: LEAVE_STATUSES })
  @IsOptional() @IsIn(LEAVE_STATUSES)
  status?: string;
}
