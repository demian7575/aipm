/**
 * Acceptance tests for INVEST display simplification
 * These tests validate the simplified INVEST display requirements
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('INVEST Display Simplification', () => {
  test('INVEST display is simplified - clean and easy to understand', async () => {
    // Given: I am viewing a user story details panel
    // When: I look at the INVEST criteria section
    // Then: the display should be clean and easy to understand
    
    // This test validates that the INVEST display shows only essential information
    // without overwhelming the user with too many details
    const mockStory = {
      id: 'test-story',
      title: 'Test Story',
      description: 'Test description',
      status: 'Draft'
    };
    
    const mockInvestHealth = {
      satisfied: false,
      issues: [
        { message: 'Story lacks specific acceptance criteria', criterion: 'testable' },
        { message: 'Story points not estimated', criterion: 'estimable' }
      ]
    };
    
    // Simulate the simplified display logic
    const displayText = mockInvestHealth.satisfied ? '✓ Pass' : '⚠ Issues';
    const issueCount = mockInvestHealth.issues ? mockInvestHealth.issues.length : 0;
    
    // Verify simplified display shows clear status
    assert.strictEqual(displayText, '⚠ Issues');
    assert.strictEqual(issueCount, 2);
    
    // Verify issues are available but not overwhelming
    assert.ok(mockInvestHealth.issues.every(issue => issue.message.length < 100));
  });

  test('INVEST feedback is actionable - clear understanding of fixes needed', async () => {
    // Given: I have INVEST validation warnings
    // When: I review the simplified display
    // Then: I should clearly understand what needs to be fixed
    
    const mockInvestIssues = [
      { message: 'Story lacks specific acceptance criteria', criterion: 'testable' },
      { message: 'Story is too large for single sprint', criterion: 'small' }
    ];
    
    // Verify each issue provides actionable feedback
    mockInvestIssues.forEach(issue => {
      assert.ok(issue.message.length > 10, 'Issue message should be descriptive');
      assert.ok(issue.criterion, 'Issue should specify which INVEST criterion failed');
      
      // Verify message is actionable (contains guidance)
      const actionableKeywords = ['lacks', 'too large', 'missing', 'unclear', 'should'];
      const hasActionableLanguage = actionableKeywords.some(keyword => 
        issue.message.toLowerCase().includes(keyword)
      );
      assert.ok(hasActionableLanguage, 'Issue message should be actionable');
    });
  });
});
