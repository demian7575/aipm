const DEFAULT_TERMINAL_URL = 'http://44.220.45.57:8080';

function normalizeTerminalConfig(rawUrl) {
  let terminalUrl;
  try {
    terminalUrl = new URL(rawUrl || DEFAULT_TERMINAL_URL);
  } catch (error) {
    console.warn('Invalid EC2_TERMINAL_URL, falling back to default', error);
    terminalUrl = new URL(DEFAULT_TERMINAL_URL);
  }

  const basePath = terminalUrl.pathname.replace(/\/$/, '');
  const wsProtocol = terminalUrl.protocol === 'https:' ? 'wss:' : terminalUrl.protocol === 'http:' ? 'ws:' : terminalUrl.protocol;
  const wsBase = `${wsProtocol}//${terminalUrl.host}${basePath}`;
  const httpProtocol = wsProtocol === 'wss:' ? 'https:' : wsProtocol === 'ws:' ? 'http:' : terminalUrl.protocol;
  const httpBase = `${httpProtocol}//${terminalUrl.host}${basePath}`;

  return { wsBase, httpBase, terminalUrl };
}

function setStatus(text, tone = 'connecting') {
  const status = document.getElementById('status');
  if (!status) return;
  status.innerHTML = `<span class="pill ${tone}">${text}</span>`;
}

function setMeta({ prId, branchName, prUrl, title }) {
  const meta = document.getElementById('meta');
  if (!meta) return;

  const items = [];
  if (prId) items.push(`<span>PR: ${prId}</span>`);
  if (branchName) items.push(`<span>Branch: ${branchName}</span>`);
  if (title) items.push(`<span>Title: ${title}</span>`);
  if (prUrl) items.push(`<span><a href="${prUrl}" target="_blank" rel="noreferrer">Open PR</a></span>`);

  meta.innerHTML = items.join('');
}

function attachToolbar({ terminal, reconnect, clear }) {
  const reconnectBtn = document.getElementById('reconnect');
  const clearBtn = document.getElementById('clear');
  const copyBtn = document.getElementById('copy');

  reconnectBtn?.addEventListener('click', reconnect);
  clearBtn?.addEventListener('click', () => terminal?.reset());
  copyBtn?.addEventListener('click', async () => {
    const text = terminal?.getSelection();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.warn('Unable to copy selection', error);
    }
  });
}

async function prepareBranch(httpBase, branchName, terminal) {
  if (!branchName) return;
  try {
    setStatus('Preparing branch...', 'connecting');
    const response = await fetch(`${httpBase}/checkout-branch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch: branchName })
    });
    const result = await response.json();
    if (result.success) {
      terminal.writeln(`✓ Branch ${branchName} ready`);
    } else {
      terminal.writeln(`⚠️  Branch checkout warning: ${result.message}`);
    }
  } catch (error) {
    terminal.writeln(`⚠️  Could not pre-checkout branch: ${error.message}`);
  }
  terminal.writeln('');
}

function createTerminal() {
  if (!window.Terminal) {
    const container = document.getElementById('terminal');
    if (container) container.textContent = 'Terminal library not loaded. Please refresh the page.';
    return null;
  }

  const terminal = new window.Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    theme: { background: '#000000', foreground: '#ffffff' }
  });
  terminal.open(document.getElementById('terminal'));
  return terminal;
}

function watchResize(terminal) {
  const container = document.getElementById('terminal');
  if (!container) return () => {};
  const resizeTerminal = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    const cols = Math.floor(width / 9);
    const rows = Math.floor(height / 17);
    if (cols > 0 && rows > 0) {
      terminal.resize(cols, rows);
    }
  };
  resizeTerminal();
  const observer = new ResizeObserver(resizeTerminal);
  observer.observe(container);
  return () => observer.disconnect();
}

function connectToTerminal({ wsBase, branchName, terminal, prTitle }) {
  const wsUrl = `${wsBase}/terminal?branch=${encodeURIComponent(branchName || 'main')}`;
  const socket = new WebSocket(wsUrl);
  setStatus('Connecting...', 'connecting');

  socket.onopen = () => {
    setStatus('Connected', 'ready');
    terminal.writeln('✓ Connected to Kiro CLI');
    if (prTitle) terminal.writeln(`📋 PR: ${prTitle}`);
    terminal.writeln('');
    terminal.writeln('💬 Start chatting with Kiro to refine your code!');
    terminal.writeln('');
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'output') {
        terminal.write(data.data);
      }
    } catch (error) {
      console.warn('Unexpected message', error);
    }
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
    setStatus('Connection error', 'error');
  };

  socket.onclose = () => {
    terminal.writeln('\r\n🔌 Disconnected');
    setStatus('Disconnected', 'error');
  };

  terminal.onData((data) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'input', data }));
    }
  });

  return socket;
}

function main() {
  const params = new URLSearchParams(window.location.search);
  const prId = params.get('prId');
  const prUrl = params.get('prUrl');
  const branchName = params.get('branch') || 'main';
  const title = params.get('title');
  setMeta({ prId, branchName, prUrl, title });

  const terminal = createTerminal();
  if (!terminal) return;

  const { wsBase, httpBase } = normalizeTerminalConfig(window.CONFIG?.EC2_TERMINAL_URL);
  prepareBranch(httpBase, branchName, terminal);

  let socket = null;
  const reconnect = () => {
    socket?.close();
    socket = connectToTerminal({ wsBase, branchName, terminal, prTitle: title });
  };

  attachToolbar({ terminal, reconnect });
  const stopResize = watchResize(terminal);

  socket = connectToTerminal({ wsBase, branchName, terminal, prTitle: title });

  window.addEventListener('beforeunload', () => {
    stopResize();
    socket?.close();
    terminal?.dispose();
  });
}

main();
