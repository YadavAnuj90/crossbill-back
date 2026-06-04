import { ValidationPipe } from '@nestjs/common';

/** Strict global validation (design §14, §17). */
export const globalValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});
