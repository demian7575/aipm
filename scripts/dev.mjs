import { spawn } from 'node:child_process';
import { once } from 'node:events';

const processes = [
  {
    name: 'backend',
    args: ['run', 'dev', '--workspace', '@ai-pm/backend'],
    color: '\u001b[34m'
  }
];

const children = [];
let shuttingDown = false;

function prefixWrite(child, color, chunk) {
  const lines = chunk.toString().split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    process.stdout.write(`${color}[${child.name}]\u001b[0m ${line}\n`);
  }
}

function spawnProcess({ name, args, color }) {
  const child = spawn('npm', args, { stdio: ['inherit', 'pipe', 'pipe'] });
  child.name = name;
  child.stdout?.on('data', (data) => prefixWrite(child, color, data));
  child.stderr?.on('data', (data) => prefixWrite(child, '\u001b[31m', data));
  child.on('exit', (code) => {
    if (!shuttingDown) {
      shuttingDown = true;
      process.stderr.write(`\n${color}[${name}] exited with code ${code ?? 'null'}\u001b[0m\n`);
      terminateAll(code ?? 0);
    }
  });
  children.push(child);
  return child;
}

function terminateAll(code = 0) {
  for (const proc of children) {
    if (!proc.killed) {
      proc.kill('SIGTERM');
    }
  }
  process.exit(code);
}

for (const proc of processes) {
  spawnProcess(proc);
}

process.on('SIGINT', () => {
  shuttingDown = true;
  terminateAll(0);
});

process.on('SIGTERM', () => {
  shuttingDown = true;
  terminateAll(0);
});

await once(process, 'beforeExit');
