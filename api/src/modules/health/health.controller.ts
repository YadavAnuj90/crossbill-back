import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck, HealthCheckService, HttpHealthIndicator, MongooseHealthIndicator,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

/** Liveness / readiness probes for container orchestration (design §18). */
@ApiTags('Health')
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
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({ description: 'Service is up', schema: { example: { success: true, data: { status: 'ok' } } } })
  live() {
    return { status: 'ok' };
  }

  @Public()
  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe', description: 'Checks MongoDB and the PDF service dependency.' })
  @ApiOkResponse({
    description: 'All dependencies healthy',
    schema: { example: { status: 'ok', info: { mongo: { status: 'up' }, 'pdf-service': { status: 'up' } }, error: {}, details: { mongo: { status: 'up' }, 'pdf-service': { status: 'up' } } } },
  })
  ready() {
    const pdfUrl = this.config.get<string>('pdfService.url');
    return this.health.check([
      () => this.mongo.pingCheck('mongo'),
      () => this.http.pingCheck('pdf-service', `${pdfUrl}/health`),
    ]);
  }
}
