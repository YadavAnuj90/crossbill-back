import { NestFactory, Reflector } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { globalValidationPipe } from './common/pipes/validation.pipe';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const reflector = app.get(Reflector);

  // Versioned API prefix (design §14).
  app.setGlobalPrefix('api/v1');

  // Security hardening (design §17).
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: [config.get<string>('appUrl') ?? 'http://localhost:3001'],
    credentials: true,
  });

  // Cross-cutting concerns.
  app.useGlobalPipes(globalValidationPipe);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());
  app.useGlobalGuards(new JwtAuthGuard(reflector)); // protected-by-default; @Public() opts out

  app.enableShutdownHooks();

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
  new Logger('Bootstrap').log(`Crossbill API listening on :${port}/api/v1`);
}

bootstrap();
