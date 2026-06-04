import { plainToInstance } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, validateSync, Min } from 'class-validator';

/** Fail fast on boot if required env vars are missing/invalid (design §21). */
class EnvVars {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: string = 'development';

  @IsInt() @Min(1)
  API_PORT: number = 3000;

  @IsString()
  DATABASE_URL!: string;

  @IsOptional() @IsString()
  MONGO_URI?: string;

  @IsString()
  REDIS_URL!: string;

  @IsString()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  JWT_REFRESH_SECRET!: string;

  @IsOptional() @IsString()
  GOOGLE_CLIENT_ID?: string;

  @IsOptional() @IsString()
  GOOGLE_CLIENT_SECRET?: string;

  @IsString()
  INTERNAL_SERVICE_TOKEN!: string;

  @IsString()
  PDF_SERVICE_URL!: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvVars, config, { enableImplicitConversion: true });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(
      'Invalid environment configuration:\n' +
        errors.map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`).join('\n'),
    );
  }
  return validated;
}
