/**
 * Terminal UI - Manages xterm.js instance, addons, and UI controls
 */
export class TerminalUI {
  constructor(container, options = {}) {
    this.container = container;
    this.terminal = null;
    this.fitAddon = null;
    this.theme = options.theme || 'dark';
    this.fontSize = options.fontSize || 14;
  }

  async initialize() {
    const { Terminal } = window;
    const { FitAddon } = window.FitAddon || {};

    this.terminal = new Terminal({
      cursorBlink: true,
      fontSize: this.fontSize,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: this.getTheme(),
      scrollback: 10000,
      convertEol: true,
      disableStdin: false,
      cursorStyle: 'block'
    });

    if (FitAddon) {
      this.fitAddon = new FitAddon();
      this.terminal.loadAddon(this.fitAddon);
    }

    this.terminal.open(this.container);
    
    if (this.fitAddon) {
      this.fitAddon.fit();
      window.addEventListener('resize', () => this.fit());
    }

    // Focus terminal immediately
    setTimeout(() => this.terminal.focus(), 100);

    return this.terminal;
  }

  getTheme() {
    return this.theme === 'dark' ? {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#ffffff',
      selection: '#264f78',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#ffffff'
    } : {};
  }

  fit() {
    if (this.fitAddon) {
      this.fitAddon.fit();
      return { cols: this.terminal.cols, rows: this.terminal.rows };
    }
    return null;
  }

  write(data) {
    this.terminal?.write(data);
  }

  writeln(data) {
    this.terminal?.writeln(data);
  }

  clear() {
    this.terminal?.clear();
  }

  focus() {
    this.terminal?.focus();
  }

  onData(callback) {
    return this.terminal?.onData(callback);
  }

  onResize(callback) {
    return this.terminal?.onResize(callback);
  }

  dispose() {
    this.terminal?.dispose();
    this.terminal = null;
    this.fitAddon = null;
  }
}
