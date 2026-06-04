import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';

/** Structured request logging with a correlation id (design §18). No secrets are logged. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const correlationId = req.headers['x-correlation-id'] ?? randomUUID();
    req.correlationId = correlationId;
    const { method, url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap(() =>
        this.logger.log(
          JSON.stringify({ correlationId, method, url, ms: Date.now() - start, userId: req.user?.userId }),
        ),
      ),
    );
  }
}
