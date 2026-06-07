import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseEnvelope<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

/** Wraps successful responses in a consistent envelope (design §14). Binary streams pass through. */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ResponseEnvelope<T> | StreamableFile> {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<ResponseEnvelope<T> | StreamableFile> {
    return next.handle().pipe(
      map((data) => {
        if (data instanceof StreamableFile) return data; // file downloads bypass the envelope
        if (data && typeof data === 'object' && 'items' in (data as any) && 'meta' in (data as any)) {
          return { success: true as const, data: (data as any).items, meta: (data as any).meta };
        }
        return { success: true as const, data };
      }),
    );
  }
}
