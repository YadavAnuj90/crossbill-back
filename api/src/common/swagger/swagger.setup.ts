import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { openApiToPostman } from './postman.util';

export const SWAGGER_PATH = 'api/v1/docs';
export const POSTMAN_COLLECTION_PATH = '/api/v1/docs-postman.json';
export const BEARER_AUTH_NAME = 'access-token';
export const REFRESH_COOKIE_NAME = 'crossbill_rt';

/** Injected into Swagger UI to add an "Open in Postman" button to the topbar. */
const OPEN_IN_POSTMAN_JS = `
window.addEventListener('load', function () {
  var tries = 0;
  var timer = setInterval(function () {
    var topbar = document.querySelector('.topbar-wrapper') || document.querySelector('.topbar');
    if (!topbar) { if (++tries > 50) clearInterval(timer); return; }
    clearInterval(timer);
    if (document.getElementById('open-in-postman')) return;
    var a = document.createElement('a');
    a.id = 'open-in-postman';
    a.href = '${POSTMAN_COLLECTION_PATH}';
    a.setAttribute('download', 'crossbill.postman_collection.json');
    a.title = 'Download the Postman collection, then drag it into Postman (File > Import).';
    a.textContent = '⭢ Open in Postman';
    a.style.cssText = 'margin-left:16px;padding:8px 14px;background:#ff6c37;color:#fff;' +
      'font-weight:600;border-radius:6px;text-decoration:none;font-family:sans-serif;font-size:13px;';
    topbar.appendChild(a);
  }, 100);
});
`;

/**
 * Builds the OpenAPI document. Shared by the live Swagger UI (main.ts) and the
 * offline exporter (scripts/export-openapi.ts) so both emit an identical spec.
 *
 * Controller routes are declared WITHOUT the `api/v1` global prefix, so we
 * register it as a server base URL — that keeps both Swagger "Try it out" and
 * the generated Postman collection pointed at the real, working paths.
 */
export function buildOpenApiDocument(
  app: INestApplication,
  apiUrl = 'http://localhost:4000',
): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Crossbill API')
    .setDescription(
      [
        'Crossbill backend API — GST / FEMA compliant invoicing & remittance for Indian exporters.',
        '',
        '**Conventions**',
        '- Base path: `/api/v1`',
        '- Success envelope: `{ "success": true, "data": ... }` (list endpoints add a `meta` object).',
        '- Error envelope: `{ "success": false, "error": { "code", "message", "correlationId" }, "timestamp", "path" }`.',
        '- Auth: send `Authorization: Bearer <accessToken>` (obtained from `/auth/login` or `/auth/register`).',
        '- The refresh token is delivered as the `crossbill_rt` httpOnly cookie and is read automatically by `/auth/refresh`.',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .addServer(`${apiUrl}/api/v1`, 'Base URL (includes /api/v1 prefix)')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste the accessToken returned by /auth/login or /auth/register.',
      },
      BEARER_AUTH_NAME,
    )
    .addCookieAuth(REFRESH_COOKIE_NAME, {
      type: 'apiKey',
      in: 'cookie',
      description: 'httpOnly refresh-token cookie set by the auth endpoints; used by /auth/refresh.',
    })
    .addTag('Auth', 'Registration, login, Google OAuth, token refresh & logout')
    .addTag('Profile', 'Current user business profile (GSTIN, LUT, bank details)')
    .addTag('Clients', 'Foreign & domestic customers')
    .addTag('Invoices', 'Export & domestic invoices, PDF and FEMA aging')
    .addTag('Remittances', 'Inward remittances and FIRC / e-FIRA documents')
    .addTag('Reports', 'GSTR-1 Table 6A export and compliance bundles')
    .addTag('Team', 'Organisation / tenancy management')
    .addTag('Reminders', 'FEMA aging sweep (ops)')
    .addTag('Health', 'Liveness & readiness probes')
    .build();

  return SwaggerModule.createDocument(app, config);
}

/**
 * Mounts Swagger UI at /api/v1/docs, the raw spec at /api/v1/docs-json, and a
 * live Postman collection at /api/v1/docs-postman.json (downloaded by the
 * "Open in Postman" button injected into the UI topbar).
 */
export function setupSwagger(app: INestApplication, apiUrl = 'http://localhost:4000'): OpenAPIObject {
  const document = buildOpenApiDocument(app, apiUrl);

  // Build the Postman collection once at startup; serve it from a plain route.
  const collectionPromise = openApiToPostman(document, apiUrl).catch((err) => {
    new Logger('Swagger').error(`Failed to build Postman collection: ${err}`);
    return null;
  });

  const server = app.getHttpAdapter().getInstance();
  server.get(POSTMAN_COLLECTION_PATH, async (_req: any, res: any) => {
    const collection = await collectionPromise;
    if (!collection) return res.status(503).json({ message: 'Postman collection unavailable' });
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="crossbill.postman_collection.json"');
    res.send(JSON.stringify(collection, null, 2));
  });

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    customSiteTitle: 'Crossbill API Docs',
    customJsStr: OPEN_IN_POSTMAN_JS,
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
  return document;
}
