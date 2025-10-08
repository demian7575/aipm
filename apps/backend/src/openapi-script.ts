import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { openApiDocument } from '@ai-pm/shared';

async function generate() {
  const output = resolve(process.cwd(), '../../docs/openapi.json');
  await writeFile(output, JSON.stringify(openApiDocument, null, 2), 'utf8');
  console.log('OpenAPI document generated at', output);
}

generate().catch((error) => {
  console.error(error);
  process.exit(1);
});
