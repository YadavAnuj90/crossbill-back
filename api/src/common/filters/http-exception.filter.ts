import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';

/** Global exception filter -> consistent error envelope (design §14). */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';
    const message =
      typeof payload === 'string' ? payload : (payload as any).message ?? 'Error';

    if (status >= 500) {
      this.logger.error(
        JSON.stringify({ correlationId: req.correlationId, path: req.url, status, error: String(exception) }),
      );
    }

    res.status(status).json({
      success: false,
      error: { code: status, message, correlationId: req.correlationId },
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }
}
