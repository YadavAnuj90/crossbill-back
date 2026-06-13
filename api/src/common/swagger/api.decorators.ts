import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiResponse } from '@nestjs/swagger';

/** Error envelope produced by HttpExceptionFilter (design §14). */
export class ApiErrorBody {
  @ApiProperty({ example: 400, description: 'HTTP status code' })
  code: number;

  @ApiProperty({ example: 'Validation failed', description: 'Human-readable error message' })
  message: string;

  @ApiProperty({ example: '7f3c1e9a-2b4d-4c8e-9a1b-1f2e3d4c5b6a', description: 'Request correlation id' })
  correlationId: string;
}

export class ApiErrorResponse {
  @ApiProperty({ example: false })
  success: false;

  @ApiProperty({ type: ApiErrorBody })
  error: ApiErrorBody;

  @ApiProperty({ example: '2026-06-12T10:15:30.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/api/v1/clients' })
  path: string;
}

/**
 * Standard auth-related error responses, applied to every protected endpoint so
 * the spec (and the generated Postman collection) document the 401/403 envelope.
 */
export function ApiAuthErrors() {
  return applyDecorators(
    ApiResponse({ status: 401, description: 'Missing or invalid access token', type: ApiErrorResponse }),
    ApiResponse({ status: 403, description: 'Authenticated but role not permitted', type: ApiErrorResponse }),
  );
}

/** Standard validation / not-found error responses for body & param endpoints. */
export function ApiValidationErrors() {
  return applyDecorators(
    ApiResponse({ status: 400, description: 'Request validation failed', type: ApiErrorResponse }),
  );
}

export function ApiNotFound(description = 'Resource not found') {
  return ApiResponse({ status: 404, description, type: ApiErrorResponse });
}
