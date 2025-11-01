import { spawn } from 'node:child_process';

function shouldStartDelegateServer() {
  const value = process.env.AI_PM_ENABLE_CODEX_DELEGATION;
  if (value == null) {
    return false;
  }
  const normalized = String(value).trim().toLowerCase();
  if (normalized.length === 0) {
    return false;
  }
  return ['1', 'true', 'yes', 'on', 'enable', 'enabled'].includes(normalized);
}

const processes = [
  {
    name: 'backend',
    command: 'node',
    args: ['apps/backend/server.js'],
  },
];

const includeDelegate = shouldStartDelegateServer();

if (includeDelegate) {
  processes.push({
    name: 'delegate',
    command: 'node',
    args: ['server.js'],
  });
} else {
  console.log(
    '[delegate] Skipping Codex delegation server (set AI_PM_ENABLE_CODEX_DELEGATION=1 to enable).'
  );
}

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
