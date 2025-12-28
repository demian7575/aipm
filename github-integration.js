// Advanced GitHub Integration Command Center
class GitHubCommandCenter {
  constructor() {
    this.statusCache = new Map();
    this.refreshInterval = 15000; // 15 seconds
  }

  // Transform task card into interactive command center
  transformTaskCard(taskElement, prData) {
    const commandCenter = document.createElement('div');
    commandCenter.className = 'github-command-center';
    
    prData.forEach(pr => {
      const prElement = this.createPRElement(pr);
      commandCenter.appendChild(prElement);
    });
    
    taskElement.appendChild(commandCenter);
    this.startRealTimeUpdates(prData);
  }

  // Create interactive PR element with status indicators
  createPRElement(pr) {
    const element = document.createElement('div');
    element.className = 'pr-command-item';
    element.innerHTML = `
      <div class="pr-header">
        <span class="pr-status-dot status-${pr.state}"></span>
        <span class="pr-title">${pr.title}</span>
        <span class="pr-number">#${pr.number}</span>
      </div>
      <a href="${pr.html_url}" target="_blank" class="pr-link" data-pr-id="${pr.id}">
        <div class="pr-meta">
          <span class="pr-author">${pr.user.login}</span>
          <span class="pr-status-badge status-${pr.state}">${pr.state}</span>
        </div>
      </a>
    `;
    
    this.addInteractivity(element, pr);
    return element;
  }

  // Add hover previews and interactive features
  addInteractivity(element, pr) {
    const link = element.querySelector('.pr-link');
    
    link.addEventListener('mouseenter', (e) => {
      this.showPreview(e, pr);
    });
    
    link.addEventListener('mouseleave', () => {
      this.hidePreview();
    });
  }

  // Show rich hover preview
  showPreview(event, pr) {
    const preview = document.createElement('div');
    preview.className = 'pr-preview';
    preview.innerHTML = `
      <div class="preview-header">${pr.title}</div>
      <div class="preview-meta">
        <div>Author: ${pr.user.login}</div>
        <div>Created: ${new Date(pr.created_at).toLocaleDateString()}</div>
        <div>Status: ${pr.state}</div>
        <div>Reviews: ${pr.requested_reviewers?.length || 0}</div>
      </div>
    `;
    
    preview.style.left = event.pageX + 10 + 'px';
    preview.style.top = event.pageY - 10 + 'px';
    document.body.appendChild(preview);
    this.currentPreview = preview;
  }

  hidePreview() {
    if (this.currentPreview) {
      document.body.removeChild(this.currentPreview);
      this.currentPreview = null;
    }
  }

  // Real-time status updates
  async startRealTimeUpdates(prData) {
    setInterval(async () => {
      for (const pr of prData) {
        const status = await this.fetchPRStatus(pr.url);
        if (status && status.state !== pr.state) {
          this.updatePRStatus(pr.id, status);
        }
      }
    }, this.refreshInterval);
  }

  async fetchPRStatus(prUrl) {
    try {
      const response = await fetch(prUrl);
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('PR status fetch failed:', error);
      return null;
    }
  }

  updatePRStatus(prId, newStatus) {
    const element = document.querySelector(`[data-pr-id="${prId}"]`);
    if (element) {
      const dot = element.parentElement.querySelector('.pr-status-dot');
      const badge = element.querySelector('.pr-status-badge');
      
      dot.className = `pr-status-dot status-${newStatus.state}`;
      badge.className = `pr-status-badge status-${newStatus.state}`;
      badge.textContent = newStatus.state;
    }
  }
}

// Initialize GitHub Command Center
const githubCenter = new GitHubCommandCenter();

// Export for use in main app
window.GitHubCommandCenter = GitHubCommandCenter;
