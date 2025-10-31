import { spawn } from 'node:child_process';

const processes = [
  {
    name: 'backend',
    command: 'node',
    args: ['apps/backend/server.js'],
  },
  {
    name: 'delegate',
    command: 'node',
    args: ['server.js'],
  },
];

const children = [];
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  children.forEach((child) => {
    if (child && !child.killed) {
      child.kill();
    }
  });
  setTimeout(() => {
    process.exit(code);
  }, 100);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

processes.forEach((proc) => {
  const child = spawn(proc.command, proc.args, {
    stdio: 'inherit',
    env: process.env,
  });
  children.push(child);
  child.on('error', (error) => {
    console.error(`[${proc.name}] failed to start`, error);
    shutdown(1);
  });
  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }
    if (signal) {
      console.log(`[${proc.name}] exited with signal ${signal}`);
      shutdown(1);
      return;
    }
    console.log(`[${proc.name}] exited with code ${code ?? 0}`);
    shutdown(code && code !== 0 ? code : 0);
  });
});
