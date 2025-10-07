import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildOpenApiDocument } from '@ai-pm-mindmap/shared';

const openapi = buildOpenApiDocument();
const outputPath = join(process.cwd(), 'docs', 'openapi.json');
writeFileSync(outputPath, JSON.stringify(openapi, null, 2));
console.log('OpenAPI spec generated at', outputPath);
