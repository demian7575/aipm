const DEFAULT_TERMINAL_URL = 'ws://44.220.45.57:8080';

function logTerminal(event, details = {}) {
  console.info('[terminal]', { event, ...details });
}

function generateNonce() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function parseTerminalUrl(rawUrl) {
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    const normalizedPath = url.pathname && url.pathname !== '/' ? url.pathname.replace(/\/$/, '') : '';
    const httpProtocol = url.protocol.startsWith('ws') ? (url.protocol === 'wss:' ? 'https:' : 'http:') : url.protocol;
    const wsProtocol = url.protocol.startsWith('http') ? (url.protocol === 'https:' ? 'wss:' : 'ws:') : url.protocol;

    return {
      httpBase: `${httpProtocol}//${url.host}${normalizedPath}`,
      wsBase: `${wsProtocol}//${url.host}${normalizedPath}`,
    };
  } catch (error) {
    logTerminal('parse_error', { error: error?.message });
    return null;
  }
}

export function createTerminalClient(rawUrl = DEFAULT_TERMINAL_URL) {
  const parsed = parseTerminalUrl(rawUrl || DEFAULT_TERMINAL_URL);

  const httpBase = parsed?.httpBase || null;
  const wsBase = parsed?.wsBase || null;

  async function checkoutBranch(branch, { token } = {}) {
    if (!httpBase) {
      throw new Error('Terminal server URL is not configured');
    }

    const nonce = generateNonce();
    const headers = {
      'Content-Type': 'application/json',
      'x-kiro-nonce': nonce,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const url = `${httpBase}/checkout-branch`;
    logTerminal('checkout_branch', { url, branch, hasToken: Boolean(token), nonce });

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ branch }),
    });

    if (!response.ok) {
      throw new Error(`Checkout failed (${response.status})`);
    }

    return response.json();
  }

  function openSession({ branch = 'main', token, onOpen, onMessage, onError, onClose, onRetry } = {}) {
    if (!wsBase) {
      throw new Error('Terminal server URL is not configured');
    }

    const nonce = generateNonce();
    const protocols = ['kiro-terminal', `nonce-${nonce}`];
    if (token) {
      protocols.push(`jwt-${token}`);
    }

    let attempt = 0;
    let socket = null;
    let closed = false;
    let retryTimer = null;

    const connect = () => {
      attempt += 1;
      const wsUrl = `${wsBase}/terminal?branch=${encodeURIComponent(branch)}`;

      logTerminal('connect_attempt', { wsUrl, attempt });
      socket = new WebSocket(wsUrl, protocols);

      socket.onopen = () => {
        logTerminal('connected', { attempt });
        onOpen?.({ socket, attempt });
      };

      socket.onmessage = (event) => {
        let payload = event.data;
        try {
          payload = JSON.parse(event.data);
        } catch (error) {
          logTerminal('message_parse_failed', { error: error?.message });
        }
        onMessage?.(payload, event);
      };

      socket.onerror = (error) => {
        logTerminal('socket_error', { error });
        onError?.(error);
      };

      socket.onclose = (event) => {
        logTerminal('socket_closed', { code: event.code, reason: event.reason, wasClean: event.wasClean, attempt });

        if (closed) {
          onClose?.({ event, retry: false });
          return;
        }

        const delay = Math.min(1000 * 2 ** Math.min(attempt, 5), 15000);
        onClose?.({ event, retry: true, delay, attempt });
        onRetry?.({ attempt, delay });

        retryTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return {
      send: (message) => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          throw new Error('Socket is not ready');
        }

        const payload = typeof message === 'string' ? message : JSON.stringify(message);
        socket.send(payload);
      },
      close: () => {
        closed = true;
        if (retryTimer) {
          clearTimeout(retryTimer);
        }
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      },
      getAttempt: () => attempt,
    };
  }

  return {
    httpBase,
    wsBase,
    checkoutBranch,
    openSession,
  };
}

const terminalClient = createTerminalClient(window.CONFIG?.EC2_TERMINAL_URL || DEFAULT_TERMINAL_URL);

export default terminalClient;
