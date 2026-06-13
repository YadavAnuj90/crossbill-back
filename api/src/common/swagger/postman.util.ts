import type { OpenAPIObject } from '@nestjs/swagger';

// openapi-to-postmanv2 ships CommonJS only.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Converter = require('openapi-to-postmanv2');

/**
 * Converts an OpenAPI document into a Postman v2.1 collection, grouped by tag,
 * with collection-level Bearer auth and `{{baseUrl}}` / `{{accessToken}}` vars.
 * Shared by the live server route and the offline exporter so both are identical.
 */
export function openApiToPostman(openapi: OpenAPIObject, apiUrl: string): Promise<any> {
  return new Promise((resolve, reject) => {
    Converter.convert(
      { type: 'json', data: openapi },
      {
        folderStrategy: 'Tags',
        requestParametersResolution: 'Example',
        exampleParametersResolution: 'Example',
        includeAuthInfoInExample: true,
      },
      (err: unknown, result: { result: boolean; output: { data: any }[]; reason?: string }) => {
        if (err) return reject(err);
        if (!result.result) return reject(new Error(result.reason ?? 'Postman conversion failed'));

        const collection = result.output[0].data;
        collection.auth = {
          type: 'bearer',
          bearer: [{ key: 'token', value: '{{accessToken}}', type: 'string' }],
        };
        collection.variable = [
          { key: 'baseUrl', value: `${apiUrl}/api/v1`, type: 'string' },
          { key: 'accessToken', value: '', type: 'string' },
        ];
        resolve(collection);
      },
    );
  });
}

export function buildPostmanEnvironment(apiUrl: string) {
  return {
    id: 'crossbill-local',
    name: 'Crossbill — Local',
    values: [
      { key: 'baseUrl', value: `${apiUrl}/api/v1`, enabled: true },
      { key: 'accessToken', value: '', enabled: true },
    ],
    _postman_variable_scope: 'environment',
  };
}
