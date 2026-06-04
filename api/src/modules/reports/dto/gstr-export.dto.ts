import { IsString, Length } from 'class-validator';

/** GSTR-1 Table 6A export request (design §5, §13). Fully wired in the Filing phase. */
export class GstrExportDto {
  @IsString() @Length(7, 7, { message: 'financialYear must look like 2026-27' })
  financialYear: string;
}
