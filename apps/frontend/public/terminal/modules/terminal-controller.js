/**
 * Terminal Controller - Manages WebSocket connection, lifecycle, and I/O
 */
export class TerminalController {
  constructor(config = {}) {
    this.baseUrl = this.normalizeBaseUrl(config.baseUrl || window.CONFIG?.EC2_TERMINAL_URL || 'ws://44.197.204.18:8080');
    this.httpBase = this.toHttpUrl(this.baseUrl);
    this.wsBase = this.toWsUrl(this.baseUrl);
    this.token = config.token || null;
    this.socket = null;
    this.terminal = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.onStatusChange = config.onStatusChange || (() => {});
    this.onBranchChange = config.onBranchChange || (() => {});
  }

  normalizeBaseUrl(url) {
    return url.replace(/\/$/, '');
  }

  toHttpUrl(url) {
    if (url.startsWith('ws://')) return `http://${url.slice(5)}`;
    if (url.startsWith('wss://')) return `https://${url.slice(6)}`;
    return url;
  }

  toWsUrl(url) {
    if (url.startsWith('http://')) return `ws://${url.slice(7)}`;
    if (url.startsWith('https://')) return `wss://${url.slice(8)}`;
    return url;
  }

  async normalizeEventData(data) {
    if (typeof data === 'string') return data;

    try {
      if (data instanceof Blob) {
        return await data.text();
      }

      if (data instanceof ArrayBuffer) {
        return new TextDecoder().decode(data);
      }
    } catch (error) {
      console.warn('Failed to decode terminal data', error);
    }

    return '';
  }

  parseMessages(data) {
    if (typeof data !== 'string') return [];

    // Only attempt to parse when payload looks like JSON. The EC2 terminal
    // returns raw PTY output, so treating every chunk as JSON caused the
    // terminal to simply echo the user's input.
    const trimmed = data.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return [];
    }

    const segments = data.split(/}(?={)/g).map((segment, index, arr) =>
      index < arr.length - 1 ? `${segment}}` : segment
    );

    const messages = [];

    segments.forEach((segment) => {
      const normalized = segment?.trim();
      if (!normalized) return;

      try {
        messages.push(JSON.parse(normalized));
      } catch (error) {
        console.warn('Failed to parse terminal message segment', normalized, error);
      }
    });

    return messages;
  }

  async checkoutBranch(branchName) {
    const response = await fetch(`${this.httpBase}/checkout-branch`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` })
      },
      body: JSON.stringify({ branch: branchName })
    });
    return response.json();
  }

  connect(terminal, options = {}) {
    this.terminal = terminal;
    const { branch = 'main', storyId } = options;
    
    const params = new URLSearchParams({ branch });
    if (storyId) params.append('storyId', storyId);
    if (this.token) params.append('token', this.token);

    const wsUrl = `${this.wsBase}/terminal?${params}`;
    
    this.onStatusChange('connecting');
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.onStatusChange('connected');
      terminal.writeln('✓ Connected to Kiro CLI');
      terminal.writeln('');
    };

    this.socket.onmessage = async (event) => {
      const data = await this.normalizeEventData(event.data);
      const messages = this.parseMessages(data);

      if (!messages.length) {
        terminal.write(data);
        return;
      }

      messages.forEach((payload) => {
        if (payload?.type === 'branch' && payload.branch) {
          this.onBranchChange(payload.branch);
          return;
        }

        if (payload?.type === 'output' && typeof payload.data === 'string') {
          terminal.write(payload.data);
          return;
        }

        if (typeof payload === 'string') {
          terminal.write(payload);
        }
      });
    };

    this.socket.onerror = (error) => {
      this.onStatusChange('error', error);
      terminal.writeln('\r\n❌ Connection error');
    };

    this.socket.onclose = () => {
      this.onStatusChange('disconnected');
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        terminal.writeln(`\r\n🔄 Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => this.connect(terminal, options), 2000);
      } else {
        terminal.writeln('\r\n❌ Connection closed');
      }
    };

    return this.socket;
  }

  send(data) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      // Send raw terminal data to match the EC2 PTY server expectation.
      this.socket.send(data);
    }
  }

  resize(cols, rows) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  dispose() {
    this.disconnect();
    this.terminal = null;
  }
}
