/**
 * Test Branch Frontend Integration
 * Provides UI components for test branch validation
 */

class TestBranchUI {
  constructor() {
    this.validator = null;
  }

  init() {
    this.addTestButton();
  }

  addTestButton() {
    const button = document.createElement('button');
    button.textContent = 'Run Test Branch Validation';
    button.className = 'test-branch-btn';
    button.onclick = () => this.runTests();
    
    const header = document.querySelector('.header') || document.body;
    header.appendChild(button);
  }

  async runTests() {
    try {
      const response = await fetch('/api/test-branch/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const results = await response.json();
      this.displayResults(results);
    } catch (error) {
      console.error('Test validation failed:', error);
    }
  }

  displayResults(results) {
    const modal = document.createElement('div');
    modal.className = 'test-results-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Test Branch Validation Results</h3>
        <p>Status: ${results.passed ? 'PASSED' : 'FAILED'}</p>
        <ul>
          ${results.results.map(r => `<li>${r.name}: ${r.passed ? '✓' : '✗'}</li>`).join('')}
        </ul>
        <button onclick="this.parentElement.parentElement.remove()">Close</button>
      </div>
    `;
    document.body.appendChild(modal);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new TestBranchUI().init());
} else {
  new TestBranchUI().init();
}
