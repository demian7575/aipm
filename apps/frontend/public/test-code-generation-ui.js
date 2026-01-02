/**
 * Frontend Test Code Generation UI
 * Provides interface for generating and running tests
 */

class TestCodeGenerationUI {
  constructor() {
    this.testGenerator = null;
    this.testResults = [];
  }

  init() {
    this.addTestGenerationButton();
    this.setupTestRunner();
  }

  addTestGenerationButton() {
    const button = document.createElement('button');
    button.textContent = 'Generate Tests';
    button.className = 'test-gen-btn secondary';
    button.onclick = () => this.openTestGenerationModal();
    
    const header = document.querySelector('.app-header .title-group');
    if (header) {
      header.appendChild(button);
    }
  }

  openTestGenerationModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Generate Test Code</h3>
        <div class="form-group">
          <label>Test Type:</label>
          <select id="test-type">
            <option value="simple">Simple Test</option>
            <option value="function">Function Test</option>
            <option value="api">API Test</option>
            <option value="component">Component Test</option>
          </select>
        </div>
        <div class="form-group">
          <label>Test Target:</label>
          <input type="text" id="test-target" placeholder="Function name, API endpoint, or component ID">
        </div>
        <div class="modal-actions">
          <button onclick="this.parentElement.parentElement.parentElement.remove()">Cancel</button>
          <button onclick="window.testCodeGenUI.generateTest()">Generate</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  async generateTest() {
    const type = document.getElementById('test-type').value;
    const target = document.getElementById('test-target').value;
    
    if (!target) {
      alert('Please enter a test target');
      return;
    }

    try {
      const response = await fetch('/api/generate-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, target })
      });
      
      const result = await response.json();
      this.displayTestResult(result);
      
      // Close modal
      document.querySelector('.modal-overlay').remove();
    } catch (error) {
      console.error('Test generation failed:', error);
    }
  }

  displayTestResult(result) {
    console.log('Generated test:', result);
    this.testResults.push(result);
  }

  setupTestRunner() {
    // Initialize test runner functionality
    window.testCodeGenUI = this;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new TestCodeGenerationUI().init());
} else {
  new TestCodeGenerationUI().init();
}
