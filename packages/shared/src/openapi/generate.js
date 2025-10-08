import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

import { openApiComponents } from '../schemas.js';

export const buildOpenApiDocument = () => ({
  openapi: '3.1.0',
  info: {
    title: 'AI Project Manager Mindmap API',
    description:
      'Domain schemas for merge requests, user stories, and acceptance tests used by the AI Project Manager Mindmap.',
    version: '0.1.0'
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development server'
    }
  ],
  paths: {},
  components: {
    schemas: openApiComponents
  }
});

export const writeOpenApiDocument = (targetPath = resolve(process.cwd(), 'docs/openapi.json')) => {
  const document = buildOpenApiDocument();
  const content = JSON.stringify(document, null, 2);
  const directory = dirname(targetPath);
  mkdirSync(directory, { recursive: true });
  writeFileSync(targetPath, content);
  return content;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const outputPath = resolve(process.cwd(), 'docs/openapi.json');
  writeOpenApiDocument(outputPath);
  console.log(`OpenAPI document generated at ${outputPath}`);
}
