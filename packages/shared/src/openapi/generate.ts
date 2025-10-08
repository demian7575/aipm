import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { openApiDocument } from './index.js';

async function main() {
  const output = resolve(process.cwd(), '../../docs/openapi.json');
  await writeFile(output, JSON.stringify(openApiDocument, null, 2), 'utf8');
  console.log(`OpenAPI schema written to ${output}`);
}

main().catch((error) => {
  console.error('Failed to generate OpenAPI document', error);
  process.exit(1);
});
