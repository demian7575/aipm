/**
 * Terminal Controller - Manages WebSocket connection, lifecycle, and I/O
 */
export class TerminalController {
  constructor(config = {}) {
    this.baseUrl = this.normalizeBaseUrl(config.baseUrl || window.CONFIG?.EC2_TERMINAL_URL || 'ws://44.220.45.57:8080');
    this.httpBase = this.toHttpUrl(this.baseUrl);
    this.wsBase = this.toWsUrl(this.baseUrl);
    this.token = config.token || null;
    this.socket = null;
    this.terminal = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.onStatusChange = config.onStatusChange || (() => {});
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

    this.socket.onmessage = (event) => {
      terminal.write(event.data);
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
