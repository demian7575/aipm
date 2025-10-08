import { writeOpenApiDocument } from '@ai-pm/shared';
import { resolve } from 'node:path';

const outputPath = resolve(process.cwd(), 'docs/openapi.json');
writeOpenApiDocument(outputPath);
console.log(`OpenAPI document written to ${outputPath}`);
