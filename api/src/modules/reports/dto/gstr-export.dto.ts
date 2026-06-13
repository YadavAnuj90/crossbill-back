import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

/** GSTR-1 Table 6A export request (design §5, §13). */
export class GstrExportDto {
  @ApiProperty({
    description: 'Financial year in `YYYY-YY` form',
    example: '2026-27',
    minLength: 7,
    maxLength: 7,
  })
  @IsString() @Length(7, 7, { message: 'financialYear must look like 2026-27' })
  financialYear: string;
}
