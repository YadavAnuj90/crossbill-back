import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { globalValidationPipe } from './common/pipes/validation.pipe';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { setupSwagger } from './common/swagger/swagger.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false, rawBody: true });
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');

  setupSwagger(app, config.get<string>('apiUrl'));

  app.use(
    helmet({
      // Allow Swagger UI's inline bootstrap script/styles to load.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:', 'https://validator.swagger.io'],
          scriptSrc: [`'self'`, `'unsafe-inline'`],
        },
      },
    }),
  );
  app.use(cookieParser());
  app.enableCors({
    origin: [config.get<string>('appUrl') ?? 'http://localhost:3001'],
    credentials: true,
  });

  app.useGlobalPipes(globalValidationPipe);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());
  // Auth + role guards are registered as APP_GUARD in AppModule (in the correct order).

  app.enableShutdownHooks();

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
  const log = new Logger('Bootstrap');
  log.log(`Crossbill API listening on :${port}/api/v1`);
  log.log(`Swagger UI:   http://localhost:${port}/api/v1/docs`);
  log.log(`OpenAPI JSON: http://localhost:${port}/api/v1/docs-json`);
}

bootstrap();
