import { spawnSync } from 'node:child_process';

const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run('node', ['scripts/build-backend.mjs']);
run('node', ['scripts/build-frontend.mjs']);
run('node', ['apps/backend/src/openapi.js']);
console.log('Build completed.');
