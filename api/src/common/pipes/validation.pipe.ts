import { ValidationPipe } from '@nestjs/common';

/**
 * Strict global validation (design §14, §17): whitelist strips unknown fields,
 * forbidNonWhitelisted rejects them, and types are transformed from the wire.
 */
export const globalValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});
