import { spawnSync } from 'node:child_process';

const run = (args) => {
  const result = spawnSync('npm', args, { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run(['run', 'test', '--workspace', '@ai-pm/shared']);
run(['run', 'test', '--workspace', '@ai-pm/backend']);
run(['run', 'test', '--workspace', '@ai-pm/frontend']);
console.log('All tests completed.');
