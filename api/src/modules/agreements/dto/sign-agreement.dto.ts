import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Equals, IsBoolean, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, Matches, MinLength,
} from 'class-validator';

export class SignAgreementDto {
  @ApiProperty({ description: 'Typed full legal name of the signer' })
  @IsString() @MinLength(2)
  signedName: string;

  @ApiProperty({ description: 'Drawn signature as a PNG data URL' })
  @IsString() @Matches(/^data:image\/(png|jpeg);base64,/, { message: 'signatureImage must be a PNG/JPEG data URL' })
  signatureImage: string;

  @ApiProperty({ description: 'Explicit intent-to-sign consent', example: true })
  @IsBoolean() @Equals(true, { message: 'You must consent to sign electronically' })
  consent: boolean;

  @ApiPropertyOptional({ description: 'One-time passcode (required only when sent to a verified email)' })
  @IsOptional() @IsString()
  otp?: string;

  // ── Fraud-prevention evidence (optional; captured client-side) ──
  @ApiPropertyOptional({ description: 'Signer latitude (geolocation)' })
  @IsOptional() @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({ description: 'Signer longitude (geolocation)' })
  @IsOptional() @IsLongitude()
  lng?: number;

  @ApiPropertyOptional({ description: 'Geolocation accuracy in metres' })
  @IsOptional() @IsNumber()
  accuracy?: number;

  @ApiPropertyOptional({ description: 'Webcam selfie as a JPEG/PNG data URL (Face Match evidence)' })
  @IsOptional() @IsString() @Matches(/^data:image\/(png|jpeg);base64,/, { message: 'selfie must be a PNG/JPEG data URL' })
  selfie?: string;
}

export class RequestOtpDto {
  // body-less; token is in the path
}
