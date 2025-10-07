import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { buildOpenApiDocument } from '@ai-pm-mindmap/shared';

const document = buildOpenApiDocument({ title: 'AI PM Mindmap API', version: '1.0.0' });
const target = resolve(process.cwd(), '..', '..', 'docs', 'openapi.json');
writeFileSync(target, JSON.stringify(document, null, 2));
console.log(`OpenAPI document written to ${target}`);
