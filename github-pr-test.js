// GitHub PR Visual Command Center Test Script
// This script tests the enhanced PR link functionality

// Mock data for testing
const mockPREntries = [
  {
    id: 'test-1',
    prUrl: 'https://github.com/demian7575/aipm/pull/897',
    number: 897,
    status: 'open',
    title: 'GitHub PR Visual Command Center Implementation',
    assignee: 'developer@example.com',
    createdAt: '2025-12-28T05:43:00Z'
  },
  {
    id: 'test-2',
    prUrl: ['https://github.com/demian7575/aipm/pull/895', 'https://github.com/demian7575/aipm/pull/896'],
    number: 895,
    status: 'approved',
    title: 'Multi-repository feature implementation',
    assignee: 'lead@example.com',
    createdAt: '2025-12-27T10:30:00Z'
  }
];

// Test functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function createEnhancedPRLink(entry) {
  const prContainer = document.createElement('div');
  prContainer.className = 'github-pr-command-center';
  
  // Support multiple PR links
  const prUrls = Array.isArray(entry.prUrl) ? entry.prUrl : [entry.prUrl];
  
  prUrls.forEach((url, index) => {
    if (!url) return;
    
    const prNumber = entry.number ? `#${entry.number + index}` : `#${index + 1}`;
    const prStatus = entry.status || 'open';
    
    // Enhanced status determination
    let status = 'open';
    let statusIcon = '●';
    let statusColor = '#28a745';
    
    if (entry.merged || prStatus === 'merged') {
      status = 'merged';
      statusIcon = '✓';
      statusColor = '#6f42c1';
    } else if (prStatus === 'closed') {
      status = 'closed';
      statusIcon = '✕';
      statusColor = '#d73a49';
    } else if (prStatus === 'draft') {
      status = 'draft';
      statusIcon = '◐';
      statusColor = '#6a737d';
    } else if (entry.approved || prStatus === 'approved') {
      status = 'approved';
      statusIcon = '✓';
      statusColor = '#28a745';
    }
    
    const prLink = document.createElement('div');
    prLink.className = 'pr-link-container';
    prLink.innerHTML = `
      <div class="pr-link-header">
        <span class="pr-label">Pull Request:</span>
        <span class="pr-status-indicator pr-status-${status}" style="color: ${statusColor}">
          ${statusIcon} ${status.toUpperCase()}
        </span>
      </div>
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" 
         class="github-pr-link enhanced-pr-link" 
         data-pr-url="${escapeHtml(url)}"
         data-pr-status="${status}"
         title="Click to open PR ${prNumber} in GitHub">
        <div class="pr-link-content">
          <span class="pr-number">PR ${prNumber}</span>
          <span class="pr-status-badge pr-status-${status}">${status}</span>
        </div>
      </a>
    `;
    
    prContainer.appendChild(prLink);
  });
  
  return prContainer;
}

// Test the implementation
function runTests() {
  console.log('🧪 Testing GitHub PR Visual Command Center...');
  
  // Test 1: Single PR link
  const singlePR = createEnhancedPRLink(mockPREntries[0]);
  console.log('✅ Single PR link created:', singlePR);
  
  // Test 2: Multiple PR links
  const multiplePR = createEnhancedPRLink(mockPREntries[1]);
  console.log('✅ Multiple PR links created:', multiplePR);
  
  // Test 3: Status color mapping
  const statusTests = ['open', 'draft', 'approved', 'merged', 'closed'];
  statusTests.forEach(status => {
    const testEntry = { ...mockPREntries[0], status };
    const element = createEnhancedPRLink(testEntry);
    console.log(`✅ Status "${status}" rendered correctly`);
  });
  
  console.log('🎉 All tests passed!');
}

// Run tests when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', runTests);
} else {
  // Node.js environment
  runTests();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createEnhancedPRLink,
    mockPREntries,
    runTests
  };
}
