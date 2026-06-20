import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsLatitude, IsLongitude, IsNumber, IsString, Min, MinLength, ValidateNested } from 'class-validator';

export class GeofenceDto {
  @ApiProperty({ example: 'Mumbai office' })
  @IsString() @MinLength(1)
  label: string;

  @ApiProperty({ example: 19.076 })
  @IsLatitude()
  lat: number;

  @ApiProperty({ example: 72.8777 })
  @IsLongitude()
  lng: number;

  @ApiProperty({ example: 50, description: 'Allowed radius in km' })
  @IsNumber() @Min(0.1)
  radiusKm: number;
}

export class SetGeofencesDto {
  @ApiProperty({ type: [GeofenceDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => GeofenceDto)
  fences: GeofenceDto[];
}
