/**
 * Offline OpenAPI + Postman exporter.
 *
 * Boots the Nest application in **preview mode** (no DB/Redis connections, no
 * provider instantiation, no HTTP listener) purely to read route metadata, then:
 *   1. writes `docs/openapi.json`            — the OpenAPI 3 spec
 *   2. writes `docs/crossbill.postman_collection.json` — a ready-to-import Postman v2.1 collection
 *   3. writes `docs/crossbill.postman_environment.json` — a Postman environment (baseUrl + accessToken)
 *
 * Run with:  npm run export:openapi
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { buildOpenApiDocument } from '../src/common/swagger/swagger.setup';
import { openApiToPostman, buildPostmanEnvironment } from '../src/common/swagger/postman.util';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const OUT_DIR = join(__dirname, '..', 'docs');

async function main() {
  // preview:true => modules are scanned for metadata but providers are NOT
  // instantiated and no external connections are opened. Perfect for doc export.
  const app = await NestFactory.create(AppModule, {
    preview: true,
    logger: false,
  });
  await app.init();

  const document = buildOpenApiDocument(app, API_URL);
  await app.close();

  mkdirSync(OUT_DIR, { recursive: true });

  const openapiPath = join(OUT_DIR, 'openapi.json');
  writeFileSync(openapiPath, JSON.stringify(document, null, 2));
  console.log(`✓ OpenAPI spec      -> ${openapiPath}`);

  const collection = await openApiToPostman(document, API_URL);
  const collectionPath = join(OUT_DIR, 'crossbill.postman_collection.json');
  writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
  console.log(`✓ Postman collection -> ${collectionPath}`);

  const envPath = join(OUT_DIR, 'crossbill.postman_environment.json');
  writeFileSync(envPath, JSON.stringify(buildPostmanEnvironment(API_URL), null, 2));
  console.log(`✓ Postman environment -> ${envPath}`);
}

main().catch((err) => {
  console.error('OpenAPI export failed:', err);
  process.exit(1);
});
