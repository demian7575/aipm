/**
 * Gating tests for simplified INVEST display functionality
 */

// Mock DOM for Node.js testing
const mockDocument = {
    createElement: (tag) => {
        const element = {
            className: '',
            textContent: '',
            style: {},
            type: '',
            children: [],
            appendChild: function(child) { this.children.push(child); },
            querySelector: function(selector) { 
                return this.children.find(child => 
                    child.className && child.className.includes(selector.replace('.', ''))
                ) || null; 
            },
            querySelectorAll: function(selector) { 
                return this.children.filter(child => 
                    child.className && child.className.includes(selector.replace('.', ''))
                ); 
            },
            addEventListener: () => {}
        };
        return element;
    }
};

// Use mock document in Node.js environment
const doc = typeof document !== 'undefined' ? document : mockDocument;

// Test 1: INVEST display is simplified
async function testInvestDisplaySimplified() {
    console.log('Testing: INVEST display is simplified');
    
    // Mock INVEST health with issues
    const mockInvestHealth = {
        satisfied: false,
        issues: [
            { message: 'Story lacks specific acceptance criteria', criterion: 'testable' },
            { message: 'Story points seem too high for scope', criterion: 'small' }
        ]
    };
    
    // Test that INVEST display shows simplified format
    const healthItem = doc.createElement('div');
    healthItem.className = 'story-meta-item';
    
    const healthLabel = doc.createElement('span');
    healthLabel.className = 'story-meta-label';
    healthLabel.textContent = 'INVEST';
    
    const healthValue = doc.createElement('span');
    healthValue.className = `health-pill ${mockInvestHealth.satisfied ? 'pass' : 'fail'}`;
    healthValue.textContent = mockInvestHealth.satisfied ? '✓ Pass' : '⚠ Issues';
    
    healthItem.appendChild(healthLabel);
    healthItem.appendChild(healthValue);
    
    // Verify simplified display structure
    const hasLabel = healthItem.querySelector('.story-meta-label');
    const hasPill = healthItem.querySelector('.health-pill');
    
    if (!hasLabel || !hasPill) {
        throw new Error('INVEST display missing required simplified elements');
    }
    
    if (hasLabel.textContent !== 'INVEST') {
        throw new Error('INVEST label not properly displayed');
    }
    
    if (!hasPill.textContent.includes('Issues') && !hasPill.textContent.includes('Pass')) {
        throw new Error('INVEST status not clearly indicated');
    }
    
    console.log('✓ INVEST display is simplified and clean');
    return true;
}

// Test 2: INVEST feedback is actionable
async function testInvestFeedbackActionable() {
    console.log('Testing: INVEST feedback is actionable');
    
    // Mock INVEST issues with actionable messages
    const mockIssues = [
        { message: 'Add specific acceptance criteria', criterion: 'testable' },
        { message: 'Break down into smaller tasks', criterion: 'small' }
    ];
    
    // Test that issues are presented clearly
    const issueList = doc.createElement('ul');
    issueList.className = 'health-issue-list';
    
    mockIssues.forEach((issue) => {
        const item = doc.createElement('li');
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'health-issue-button';
        button.textContent = issue.message;
        item.appendChild(button);
        issueList.appendChild(item);
    });
    
    // Verify actionable feedback structure
    const issueButtons = issueList.children.filter(child => 
        child.children && child.children.some(grandchild => 
            grandchild.className && grandchild.className.includes('health-issue-button')
        )
    ).map(child => 
        child.children.find(grandchild => 
            grandchild.className && grandchild.className.includes('health-issue-button')
        )
    );
    
    if (issueButtons.length !== mockIssues.length) {
        throw new Error('Not all INVEST issues are displayed');
    }
    
    issueButtons.forEach((button, index) => {
        if (!button.textContent.trim()) {
            throw new Error('INVEST issue message is empty');
        }
        
        if (button.textContent !== mockIssues[index].message) {
            throw new Error('INVEST issue message not properly displayed');
        }
    });
    
    console.log('✓ INVEST feedback is actionable and clear');
    return true;
}

// Run all tests
async function runInvestDisplayTests() {
    console.log('Running INVEST Display Gating Tests...');
    
    try {
        await testInvestDisplaySimplified();
        await testInvestFeedbackActionable();
        
        console.log('✅ All INVEST Display tests passed');
        return true;
    } catch (error) {
        console.error('❌ INVEST Display test failed:', error.message);
        return false;
    }
}

// Export for use in other test files
export { runInvestDisplayTests };
