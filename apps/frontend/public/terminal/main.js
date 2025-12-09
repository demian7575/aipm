import { TerminalController } from './modules/terminal-controller.js';
import { TerminalUI } from './modules/terminal-ui.js';

class KiroTerminalApp {
  constructor() {
    this.terminalUI = null;
    this.controller = null;
    this.currentBranch = 'main';
    this.storyId = null;
    this.fontSize = 14;
    
    this.parseUrlParams();
    this.initializeUI();
  }

  parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    this.currentBranch = params.get('branch') || 'main';
    this.storyId = params.get('storyId');
    this.storyTitle = params.get('storyTitle');
  }

  async initializeUI() {
    // Initialize terminal UI
    const container = document.getElementById('terminalContainer');
    this.terminalUI = new TerminalUI(container, { fontSize: this.fontSize });
    const terminal = await this.terminalUI.initialize();

    // Initialize controller
    this.controller = new TerminalController({
      baseUrl: window.CONFIG?.EC2_TERMINAL_URL,
      onStatusChange: (status, error) => this.updateStatus(status, error),
      onBranchChange: (branch) => {
        this.currentBranch = branch;
        this.ensureBranchOption(branch);
      }
    });

    await this.loadBranches();

    // Setup event handlers
    this.setupEventHandlers(terminal);
    
    // Load story context
    if (this.storyId) {
      await this.loadStoryContext();
    }

    // Update UI
    this.updateStoryInfo();
    this.updateTerminalSize();

    // Connect to terminal
    await this.connect();
  }

  setupEventHandlers(terminal) {
    // Terminal input
    this.terminalUI.onData((data) => {
      this.controller.send(data);
    });

    // Terminal resize
    this.terminalUI.onResize(({ cols, rows }) => {
      this.controller.resize(cols, rows);
      this.updateTerminalSize();
    });

    // Reconnect button
    document.getElementById('reconnectBtn').addEventListener('click', () => {
      this.reconnect();
    });

    // Clear button
    document.getElementById('clearBtn').addEventListener('click', () => {
      this.terminalUI.clear();
    });

    // Copy button
    document.getElementById('copyBtn').addEventListener('click', () => {
      const selection = terminal.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
        this.showToast('Copied to clipboard');
      }
    });

    // Branch selector
    document.getElementById('branchSelector').addEventListener('change', async (e) => {
      const branch = e.target.value;
      if (branch) {
        await this.switchBranch(branch);
      }
    });

    // Context toggle
    document.getElementById('toggleContext').addEventListener('click', () => {
      this.toggleContext();
    });

    // Font size controls
    document.getElementById('fontSizeUp').addEventListener('click', () => {
      this.changeFontSize(1);
    });

    document.getElementById('fontSizeDown').addEventListener('click', () => {
      this.changeFontSize(-1);
    });

    // Cleanup on unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  async loadBranches() {
    const selector = document.getElementById('branchSelector');
    if (!selector) return;

    const branches = new Set(['main']);
    if (this.currentBranch) branches.add(this.currentBranch);

    // Try to fetch available branches from the terminal service
    try {
      const response = await fetch(`${this.controller.httpBase}/branches`);
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data?.branches) ? data.branches : Array.isArray(data) ? data : [];
        list.forEach((branch) => branches.add(branch));
      }
    } catch (error) {
      console.warn('Failed to load branch list, using defaults', error);
    }

    selector.innerHTML = '<option value="">Select branch...</option>';
    branches.forEach((branch) => {
      const option = document.createElement('option');
      option.value = branch;
      option.textContent = branch;
      selector.appendChild(option);
    });

    selector.value = this.currentBranch || '';
  }

  ensureBranchOption(branch) {
    const selector = document.getElementById('branchSelector');
    if (!selector || !branch) return;

    const exists = Array.from(selector.options).some((option) => option.value === branch);
    if (!exists) {
      const option = document.createElement('option');
      option.value = branch;
      option.textContent = branch;
      selector.appendChild(option);
    }

    selector.value = branch;
  }

  async loadStoryContext() {
    const contextContent = document.getElementById('contextContent');
    
    try {
      const API_BASE_URL = window.CONFIG?.API_BASE_URL || window.CONFIG?.apiEndpoint;
      const response = await fetch(`${API_BASE_URL}/api/stories/${this.storyId}`);
      
      if (!response.ok) throw new Error('Failed to load story');
      
      const data = await response.json();
      const story = data.story || data;
      
      contextContent.innerHTML = this.formatStoryContext(story);
    } catch (error) {
      contextContent.innerHTML = `<p class="error">Failed to load context: ${error.message}</p>`;
    }
  }

  formatStoryContext(story) {
    const parts = [];
    
    if (story.title) {
      parts.push(`<strong>Story:</strong> ${this.escapeHtml(story.title)}`);
    }
    
    if (story.description) {
      parts.push(`<strong>Description:</strong><br>${this.escapeHtml(story.description)}`);
    }
    
    if (story.components && story.components.length) {
      parts.push(`<strong>Components:</strong> ${story.components.join(', ')}`);
    }
    
    return `<div>${parts.join('<br><br>')}</div>`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async connect() {
    this.terminalUI.writeln('🔌 Connecting to Kiro CLI...');
    this.terminalUI.writeln('');

    // Checkout branch first
    if (this.currentBranch) {
      this.terminalUI.writeln(`🔄 Checking out branch: ${this.currentBranch}`);
      try {
        const result = await this.controller.checkoutBranch(this.currentBranch);
        if (result.success) {
          this.terminalUI.writeln(`✓ Branch ready`);
        } else {
          this.terminalUI.writeln(`⚠️  ${result.message || 'Branch checkout warning'}`);
        }
      } catch (error) {
        this.terminalUI.writeln(`⚠️  Could not checkout branch: ${error.message}`);
      }
      this.terminalUI.writeln('');
    }

    // Connect WebSocket
    this.controller.connect(this.terminalUI.terminal, {
      branch: this.currentBranch,
      storyId: this.storyId
    });

    this.terminalUI.focus();
  }

  async reconnect() {
    this.terminalUI.writeln('\r\n🔄 Reconnecting...\r\n');
    this.controller.disconnect();
    await this.connect();
  }

  async switchBranch(branch) {
    this.ensureBranchOption(branch);
    this.currentBranch = branch;
    this.terminalUI.writeln(`\r\n🔄 Switching to branch: ${branch}\r\n`);
    await this.reconnect();
  }

  toggleContext() {
    const panel = document.getElementById('contextPanel');
    const btn = document.getElementById('toggleContext');
    panel.classList.toggle('collapsed');
    btn.textContent = panel.classList.contains('collapsed') ? 'Show' : 'Hide';
  }

  changeFontSize(delta) {
    this.fontSize = Math.max(10, Math.min(24, this.fontSize + delta));
    this.terminalUI.terminal.options.fontSize = this.fontSize;
    this.terminalUI.fit();
  }

  updateStatus(status, error) {
    const indicator = document.getElementById('statusIndicator');
    const statusText = indicator.querySelector('.status-text');
    const connectionInfo = document.getElementById('connectionInfo');

    indicator.className = `status-indicator ${status}`;
    
    const statusMap = {
      connecting: 'Connecting...',
      connected: 'Connected',
      disconnected: 'Disconnected',
      error: 'Error'
    };
    
    statusText.textContent = statusMap[status] || status;
    connectionInfo.textContent = error ? `Error: ${error.message}` : statusMap[status];
  }

  updateStoryInfo() {
    if (this.storyTitle) {
      document.getElementById('storyInfo').textContent = `Story: ${this.storyTitle}`;
    }
  }

  updateTerminalSize() {
    const size = this.terminalUI.fit();
    if (size) {
      document.getElementById('terminalSize').textContent = `${size.cols}x${size.rows}`;
    }
  }

  showToast(message) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#4caf50;color:white;padding:12px 20px;border-radius:4px;z-index:1000;';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }

  cleanup() {
    this.controller?.dispose();
    this.terminalUI?.dispose();
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new KiroTerminalApp());
} else {
  new KiroTerminalApp();
}
