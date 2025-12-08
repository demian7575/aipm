import { Terminal } from 'https://cdn.skypack.dev/xterm@5.3.0';
import 'https://cdn.skypack.dev/xterm@5.3.0/css/xterm.css';

let stylesInjected = false;

function injectStyles() {
  if (stylesInjected) return;
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --kt-bg: #0b1220;
      --kt-panel: #0e172a;
      --kt-border: #19233a;
      --kt-text: #e4e7ec;
      --kt-muted: #9aa4b5;
      --kt-accent: #5b8def;
    }

    .kiro-terminal-view {
      height: 100%;
      min-height: 80vh;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px;
      box-sizing: border-box;
      color: var(--kt-text);
      background: var(--kt-bg);
    }

    .kiro-terminal-meta {
      background: var(--kt-panel);
      border: 1px solid var(--kt-border);
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
      display: grid;
      gap: 8px;
    }

    .kiro-terminal-meta h4 {
      margin: 0 0 4px;
      font-size: 15px;
      color: var(--kt-muted);
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .kiro-terminal-meta p {
      margin: 0;
      font-size: 15px;
      line-height: 1.5;
    }

    .kiro-terminal-panel {
      flex: 1;
      min-height: 360px;
      background: #000;
      border-radius: 12px;
      border: 1px solid var(--kt-border);
      overflow: hidden;
      position: relative;
      display: flex;
    }

    .kiro-terminal-screen {
      flex: 1;
      min-height: 360px;
    }

    .kiro-terminal-hint {
      font-size: 14px;
      color: var(--kt-muted);
      text-align: right;
      margin-top: -8px;
    }

    .xterm-viewport {
      border-radius: 0 0 12px 12px;
    }
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}

function createInfoSection(prId, branchName, taskTitle) {
  if (!prId && !branchName && !taskTitle) return null;

  const section = document.createElement('section');
  section.className = 'kiro-terminal-meta';
  section.innerHTML = `
    <div>
      <h4>Context</h4>
      ${prId ? `<p><strong>PR:</strong> ${prId}</p>` : ''}
      ${branchName ? `<p><strong>Branch:</strong> ${branchName}</p>` : ''}
      ${taskTitle ? `<p><strong>Title:</strong> ${taskTitle}</p>` : ''}
    </div>
  `;
  return section;
}

function calculateSize(container) {
  const width = container.clientWidth;
  const height = container.clientHeight;
  const cols = Math.max(10, Math.floor(width / 9));
  const rows = Math.max(5, Math.floor(height / 17));
  return { cols, rows };
}

export async function createKiroTerminal({ prEntry = null, prNumber, branch, taskTitle } = {}) {
  injectStyles();

  const container = document.createElement('div');
  container.className = 'kiro-terminal-view';

  const resolvedBranch = branch || prEntry?.branchName || prEntry?.branch || 'main';
  const resolvedPrId = prNumber || prEntry?.number || prEntry?.targetNumber || '';
  const resolvedTitle = taskTitle || prEntry?.taskTitle || '';

  const infoSection = createInfoSection(resolvedPrId, resolvedBranch, resolvedTitle);
  if (infoSection) {
    container.appendChild(infoSection);
  }

  const terminalWrapper = document.createElement('section');
  terminalWrapper.className = 'kiro-terminal-panel';

  const terminalContainer = document.createElement('div');
  terminalContainer.className = 'kiro-terminal-screen';
  terminalWrapper.appendChild(terminalContainer);

  container.appendChild(terminalWrapper);

  const hint = document.createElement('div');
  hint.className = 'kiro-terminal-hint';
  hint.textContent = 'Resizes with the window for full-height terminal access.';
  container.appendChild(hint);

  const terminal = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    theme: {
      background: '#000000',
      foreground: '#ffffff'
    }
  });

  terminal.open(terminalContainer);

  const resizeTerminal = () => {
    const { cols, rows } = calculateSize(terminalContainer);
    terminal.resize(cols, rows);
  };

  resizeTerminal();

  const EC2_TERMINAL_URL = window.CONFIG?.EC2_TERMINAL_URL || 'ws://44.220.45.57:8080';
  let socket = null;

  if (resolvedBranch) {
    try {
      terminal.writeln('🔄 Preparing branch...');
      const response = await fetch(`${EC2_TERMINAL_URL.replace('ws', 'http')}/checkout-branch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: resolvedBranch })
      });
      const result = await response.json();
      if (result.success) {
        terminal.writeln(`✓ Branch ${resolvedBranch} ready`);
      } else {
        terminal.writeln(`⚠️  Branch checkout warning: ${result.message}`);
      }
      terminal.writeln('');
    } catch (error) {
      terminal.writeln(`⚠️  Could not pre-checkout branch: ${error.message}`);
      terminal.writeln('');
    }
  }

  const wsUrl = `${EC2_TERMINAL_URL}/terminal?branch=${encodeURIComponent(resolvedBranch)}`;
  terminal.writeln('🔌 Connecting to Kiro CLI terminal...');
  terminal.writeln('');

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    terminal.writeln('✓ Connected to Kiro CLI');
    if (resolvedTitle) {
      terminal.writeln(`📋 PR: ${resolvedTitle}`);
    }
    terminal.writeln('');
    terminal.writeln('💬 Start chatting with Kiro to refine your code!');
    terminal.writeln('');
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'output') {
      terminal.write(data.data);
    }
  };

  socket.onerror = (error) => {
    terminal.writeln('\r\n❌ Connection error');
    console.error('WebSocket error:', error);
  };

  socket.onclose = () => {
    terminal.writeln('\r\n🔌 Disconnected');
  };

  terminal.onData((data) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'input', data }));
    }
  });

  const resizeObserver = new ResizeObserver(resizeTerminal);
  resizeObserver.observe(terminalContainer);

  const destroy = () => {
    resizeObserver.disconnect();
    if (socket) socket.close();
    terminal.dispose();
  };

  return { element: container, destroy };
}
