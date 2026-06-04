import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck, HealthCheckService, HttpHealthIndicator, MongooseHealthIndicator,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';

/** Liveness / readiness probes for container orchestration (design §18). */
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongo: MongooseHealthIndicator,
    private readonly http: HttpHealthIndicator,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Public()
  @Get('ready')
  @HealthCheck()
  ready() {
    const pdfUrl = this.config.get<string>('pdfService.url');
    return this.health.check([
      () => this.mongo.pingCheck('mongo'),
      () => this.http.pingCheck('pdf-service', `${pdfUrl}/health`),
    ]);
  }
}
