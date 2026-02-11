#!/usr/bin/env node

/**
 * Kiro Wrapper - Managed execution controller for interactive kiro-cli sessions
 *
 * Purpose:
 * - Run kiro-cli under a real terminal (PTY) by wrapping it with `script`
 * - Detect crashes, hangs, and stalled tasks
 * - Apply restart policy with backoff + circuit-breaker behavior
 * - Expose operational observability for server-side integration
 * - Keep interactive stdin/stdout paths stable for production usage
 *
 * Sections:
 * 1) Runtime configuration
 * 2) Managed Kiro execution controller
 * 3) HTTP integration layer
 * 4) Signal handling and graceful shutdown
 *
 * Acceptance criteria (operational):
 * - AC1: Wrapper launches kiro-cli via `script` with piped stdin/stdout/stderr.
 * - AC2: Wrapper exposes `/health`, `/metrics`, `/execute`, and `/control/restart` APIs.
 * - AC3: Wrapper detects task hangs and inactivity stalls, then force-restarts safely.
 * - AC4: Wrapper auto-recovers from unexpected exits with bounded backoff.
 * - AC5: Wrapper reports actionable runtime telemetry (state, counters, timings).
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import http from 'http';
import pty from 'node-pty';

/**
 * ---------------------------------------------------------------------------
 * 1) Runtime configuration
 * ---------------------------------------------------------------------------
 */
const SESSION_ID = process.argv[2] || process.env.KIRO_SESSION_ID || '1';
const PORT =
  Number.parseInt(process.argv[3], 10) ||
  Number.parseInt(process.env.KIRO_PORT, 10) ||
  9000 + Number.parseInt(SESSION_ID, 10);

const CONFIG = {
  // CLI command
  kiroCommand:
    process.env.KIRO_COMMAND ||
    '/home/ec2-user/.local/bin/kiro-cli',
  kiroArgs: ['chat', '--no-interactive', '--trust-all-tools'],
  cwd: process.env.KIRO_CWD || '/home/ec2-user/aipm',

  // Timeouts and restart policy
  promptTimeoutMs: Number.parseInt(process.env.KIRO_PROMPT_TIMEOUT_MS, 10) || 300_000,
  stallTimeoutMs: Number.parseInt(process.env.KIRO_STALL_TIMEOUT_MS, 10) || 120_000,
  healthTickMs: Number.parseInt(process.env.KIRO_HEALTH_TICK_MS, 10) || 5_000,
  startupGraceMs: Number.parseInt(process.env.KIRO_STARTUP_GRACE_MS, 10) || 5_000,
  restartBaseDelayMs: Number.parseInt(process.env.KIRO_RESTART_BASE_DELAY_MS, 10) || 2_000,
  restartMaxDelayMs: Number.parseInt(process.env.KIRO_RESTART_MAX_DELAY_MS, 10) || 30_000,
  maxRestartsPerWindow: Number.parseInt(process.env.KIRO_RESTART_BURST_MAX, 10) || 8,
  restartWindowMs: Number.parseInt(process.env.KIRO_RESTART_WINDOW_MS, 10) || 300_000,
  stopGraceMs: Number.parseInt(process.env.KIRO_STOP_GRACE_MS, 10) || 7_500,
};

const stripAnsi = (text) => text.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '');

/**
 * ---------------------------------------------------------------------------
 * 2) Managed Kiro execution controller
 * ---------------------------------------------------------------------------
 */
class KiroWrapper extends EventEmitter {
  constructor(sessionId, config) {
    super();
    this.sessionId = sessionId;
    this.config = config;

    this.process = null;
    this.busy = false;
    this.state = 'initializing';

    this.currentPrompt = null;
    this.outputBuffer = '';
    this.lastActivityAt = Date.now();
    this.startedAt = null;
    this.lastExit = null;
    this.lastError = null;

    this.promptTimer = null;
    this.stallTimer = null;
    this.recoveryTimer = null;

    this.restartHistory = [];
    this.metrics = {
      starts: 0,
      exits: 0,
      unexpectedExits: 0,
      restarts: 0,
      taskTimeouts: 0,
      stallTimeouts: 0,
      promptsAccepted: 0,
      promptsRejectedBusy: 0,
      promptsCompleted: 0,
      forcedKills: 0,
    };

    this.completionIndicators = ['SEMANTIC-API Task Complete', '▸ Time:'];
    this.healthTicker = setInterval(() => this.healthTick(), this.config.healthTickMs);

    this.start('initial start');
  }

  log(message, extra) {
    const prefix = `[Session ${this.sessionId}]`;
    if (extra !== undefined) {
      console.log(`${prefix} ${message}`, extra);
      return;
    }
    console.log(`${prefix} ${message}`);
  }

  buildSpawnArgs() {
    if (this.config.launcher === 'socat') {
      // socat format: EXEC:"command",pty,setsid,ctty STDIO
      return [
        `EXEC:"${this.config.kiroCommand}",pty,setsid,ctty`,
        'STDIO'
      ];
    } else {
      // script format: -q -f -e -c "command" /dev/null
      return [
        ...this.config.launcherArgsPrefix,
        this.config.kiroCommand,
        this.config.launcherOutputFile,
      ];
    }
  }

  start(reason = 'unspecified') {
    if (this.process) {
      this.log('Start requested while process is already running; ignoring');
      return;
    }

    this.state = 'starting';
    this.startedAt = Date.now();
    this.metrics.starts += 1;
    this.lastActivityAt = Date.now();

    this.log(`Starting Kiro (reason: ${reason}) with node-pty`);

    // Use node-pty to create a proper PTY with session leader
    const child = pty.spawn(this.config.kiroCommand, this.config.kiroArgs, {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: this.config.cwd,
      env: process.env
    });

    this.process = child;
    this.state = 'running';

    // Handle data output with error handling
    child.onData((data) => {
      try {
        this.onOutput('stdout', data);
      } catch (err) {
        // Ignore EIO errors (PTY closed)
        if (err.code !== 'EIO') {
          this.log(`Error handling output: ${err.message}`);
        }
      }
    });

    // Handle process exit
    child.onExit(({ exitCode, signal }) => {
      if (this && typeof this.onExit === 'function') {
        this.onExit(exitCode, signal);
      }
    });

    child.on('error', (err) => {
      // Ignore EIO errors (expected when PTY closes)
      if (err.code === 'EIO') {
        return;
      }
      this.lastError = `process error: ${err.message}`;
      this.log(`Process error: ${err.message}`);
    });

    this.log(`Started (PID: ${child.pid})`);
    this.emit('started', { pid: child.pid, reason });
  }

  onOutput(stream, data) {
    const text = data.toString();
    this.lastActivityAt = Date.now();
    this.outputBuffer += text;

    // Write output directly (already includes formatting from Kiro)
    process.stdout.write(text);

    this.checkCompletion(text);
  }

  checkCompletion(chunk) {
    if (!this.busy) {
      return;
    }

    const clean = stripAnsi(chunk);
    const completed = this.completionIndicators.some((indicator) => clean.includes(indicator));
    if (!completed) {
      return;
    }

    this.metrics.promptsCompleted += 1;
    this.markAvailable('completion marker detected');
  }

  markAvailable(reason) {
    this.busy = false;
    this.currentPrompt = null;
    this.clearPromptTimer();
    this.log(`Session available (${reason})`);
    this.emit('available', { reason });
  }

  clearPromptTimer() {
    if (this.promptTimer) {
      clearTimeout(this.promptTimer);
      this.promptTimer = null;
    }
  }

  clearRecoveryTimer() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }

  healthTick() {
    if (!this.process) {
      return;
    }

    if (!this.busy) {
      return;
    }

    const idleMs = Date.now() - this.lastActivityAt;
    if (idleMs < this.config.stallTimeoutMs) {
      return;
    }

    this.metrics.stallTimeouts += 1;
    this.lastError = `stall timeout exceeded (${idleMs}ms)`;
    this.log(`Detected stalled interactive session (${idleMs}ms without output)`);
    this.restart('stall timeout');
  }

  onClose(code, signal) {
    this.metrics.exits += 1;

    const hadBusyWork = this.busy;
    this.lastExit = {
      code,
      signal,
      at: new Date().toISOString(),
    };

    this.log(`Kiro process closed (code=${String(code)}, signal=${String(signal)})`);
    this.process = null;
    this.state = 'stopped';
    this.clearPromptTimer();

    const cleanExit = code === 0 && signal === null;
    const shouldCountRestart = hadBusyWork || !cleanExit;

    if (hadBusyWork) {
      this.metrics.unexpectedExits += 1;
      this.lastError = 'process exited during active task';
      this.busy = false;
      this.currentPrompt = null;
    }

    this.scheduleRecovery('process exited', { countTowardsCircuit: shouldCountRestart });
  }

  scheduleRecovery(reason, options = {}) {
    const { countTowardsCircuit = true } = options;
    this.clearRecoveryTimer();

    const now = Date.now();
    if (countTowardsCircuit) {
      this.restartHistory.push(now);
      this.restartHistory = this.restartHistory.filter(
        (ts) => now - ts <= this.config.restartWindowMs,
      );
    }

    const attempts = this.restartHistory.length;
    const base = this.config.restartBaseDelayMs;
    const capped = Math.min(
      this.config.restartMaxDelayMs,
      base * 2 ** Math.max(attempts - 1, 0),
    );
    const jitter = Math.floor(Math.random() * 500);
    const delay = capped + jitter;

    if (countTowardsCircuit && attempts > this.config.maxRestartsPerWindow) {
      this.state = 'degraded';
      this.lastError =
        `restart circuit open: ${attempts} restarts in ${this.config.restartWindowMs}ms`;
      this.log(`Recovery paused (${this.lastError})`);
      return;
    }

    this.metrics.restarts += 1;
    this.state = 'recovering';
    const attemptLabel = countTowardsCircuit ? attempts : 'not-counted';
    this.log(`Scheduling recovery in ${delay}ms (reason: ${reason}, attempt=${attemptLabel})`);

    this.recoveryTimer = setTimeout(() => {
      this.recoveryTimer = null;
      this.start(`auto recovery: ${reason}`);
    }, delay);
  }

  restart(reason = 'manual restart') {
    this.log(`Restart requested (${reason})`);
    this.state = 'recovering';

    if (!this.process) {
      this.scheduleRecovery(reason);
      return;
    }

    const child = this.process;
    this.busy = false;
    this.currentPrompt = null;
    this.clearPromptTimer();

    child.kill('SIGTERM');

    setTimeout(() => {
      if (this.process && this.process.pid === child.pid) {
        this.metrics.forcedKills += 1;
        this.log(`SIGTERM grace exceeded; forcing kill for PID ${child.pid}`);
        child.kill('SIGKILL');
      }
    }, this.config.stopGraceMs);
  }

  async execute(prompt) {
    if (!prompt || !String(prompt).trim()) {
      throw new Error('prompt is required');
    }

    if (this.busy) {
      this.metrics.promptsRejectedBusy += 1;
      throw new Error('Session is busy');
    }

    if (!this.process) {
      this.log('Execute requested while process is down; attempting immediate restart');
      this.start('execute while down');
      await new Promise((resolve) => setTimeout(resolve, this.config.startupGraceMs));
    }

    if (!this.process) {
      throw new Error('Session is unavailable');
    }

    this.busy = true;
    this.state = 'running';
    this.currentPrompt = String(prompt);
    this.outputBuffer = '';
    this.lastActivityAt = Date.now();
    this.metrics.promptsAccepted += 1;

    this.log(`Executing prompt (${this.currentPrompt.length} chars)`);
    this.log(`[STDIN] ${this.currentPrompt}`);
    this.process.write(`${this.currentPrompt}\n`);

    this.clearPromptTimer();
    this.promptTimer = setTimeout(() => {
      this.metrics.taskTimeouts += 1;
      this.lastError = `task timeout exceeded (${this.config.promptTimeoutMs}ms)`;
      this.log('Task timeout reached; initiating restart');
      this.restart('task timeout');
    }, this.config.promptTimeoutMs);

    return {
      status: 'accepted',
      sessionId: this.sessionId,
      promptLength: this.currentPrompt.length,
      timeoutMs: this.config.promptTimeoutMs,
    };
  }

  getStatus() {
    const now = Date.now();
    return {
      sessionId: this.sessionId,
      pid: this.process?.pid ?? null,
      state: this.state,
      busy: this.busy,
      uptimeMs: this.startedAt ? now - this.startedAt : 0,
      lastActivityAt: new Date(this.lastActivityAt).toISOString(),
      idleMs: now - this.lastActivityAt,
      activePromptChars: this.currentPrompt?.length ?? 0,
      lastExit: this.lastExit,
      lastError: this.lastError,
    };
  }

  getMetrics() {
    return {
      ...this.metrics,
      restartWindowCount: this.restartHistory.length,
      restartWindowMs: this.config.restartWindowMs,
    };
  }

  async shutdown() {
    this.log('Shutdown initiated');
    this.state = 'shutting_down';

    clearInterval(this.healthTicker);
    this.clearPromptTimer();
    this.clearRecoveryTimer();

    if (!this.process) {
      this.state = 'stopped';
      return;
    }

    const child = this.process;
    child.kill('SIGTERM');

    await new Promise((resolve) => {
      const force = setTimeout(() => {
        if (this.process && this.process.pid === child.pid) {
          this.metrics.forcedKills += 1;
          child.kill('SIGKILL');
        }
        resolve();
      }, this.config.stopGraceMs);

      child.once('close', () => {
        clearTimeout(force);
        resolve();
      });
    });

    this.state = 'stopped';
  }
}

const wrapper = new KiroWrapper(SESSION_ID, CONFIG);

/**
 * ---------------------------------------------------------------------------
 * 3) HTTP integration layer
 * ---------------------------------------------------------------------------
 */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: wrapper.state === 'degraded' ? 'degraded' : 'healthy',
        ...wrapper.getStatus(),
      }),
    );
    return;
  }

  if (url.pathname === '/metrics' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: wrapper.getStatus(),
        metrics: wrapper.getMetrics(),
      }),
    );
    return;
  }

  if (url.pathname === '/control/restart' && req.method === 'POST') {
    wrapper.restart('api restart request');
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'accepted', action: 'restart', sessionId: SESSION_ID }));
    return;
  }

  if (url.pathname === '/execute' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const result = await wrapper.execute(payload.prompt);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error';
        const statusCode = message.includes('busy') ? 503 : 500;

        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: message,
            sessionId: SESSION_ID,
            status: wrapper.getStatus(),
          }),
        );
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found', path: url.pathname }));
});

server.listen(PORT, () => {
  console.log(`[Session ${SESSION_ID}] HTTP server listening on port ${PORT}`);
});

/**
 * ---------------------------------------------------------------------------
 * 4) Signal handling and graceful shutdown
 * ---------------------------------------------------------------------------
 */
const shutdown = async (signal) => {
  console.log(`[Session ${SESSION_ID}] Received ${signal}, shutting down...`);
  server.close();
  await wrapper.shutdown();
  process.exit(0);
};

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  shutdown('SIGINT');
});
