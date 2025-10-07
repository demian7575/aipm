import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { buildOpenApiDocument } from './docs/document.js';

const document = buildOpenApiDocument();
const outPath = resolve(process.cwd(), '../../docs/openapi.json');
writeFileSync(outPath, JSON.stringify(document, null, 2));
console.log(`OpenAPI document generated at ${outPath}`);
