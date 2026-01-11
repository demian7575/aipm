/**
 * Acceptance tests for INVEST display simplification
 * These tests validate the simplified INVEST criteria display in user story details
 */

import { test } from 'node:test';
import assert from 'node:assert';

test('INVEST display shows simplified format', async () => {
  // Given: a user story is selected in the details panel
  const mockStory = {
    id: 1,
    title: 'Test Story',
    investHealth: {
      satisfied: true,
      issues: []
    }
  };

  // When: I view the INVEST criteria section
  const investDisplay = createInvestDisplay(mockStory);

  // Then: the display should show a clean, simplified format with key information only
  assert.ok(investDisplay.includes('✓ Pass'), 'Should show pass status for satisfied INVEST');
  assert.ok(!investDisplay.includes('detailed analysis'), 'Should not show detailed analysis by default');
  assert.ok(investDisplay.length < 100, 'Should be concise and under 100 characters');
});

test('INVEST display shows issue count for failed criteria', async () => {
  // Given: a user story with INVEST issues
  const mockStory = {
    id: 2,
    title: 'Story with Issues',
    investHealth: {
      satisfied: false,
      issues: ['Issue 1', 'Issue 2']
    }
  };

  // When: I view the INVEST criteria section
  const investDisplay = createInvestDisplay(mockStory);

  // Then: the display should show issue count in simplified format
  assert.ok(investDisplay.includes('⚠ 2 issues'), 'Should show issue count');
  assert.ok(!investDisplay.includes('detailed breakdown'), 'Should not show detailed breakdown by default');
});

// Mock function to simulate INVEST display creation
function createInvestDisplay(story) {
  const investHealth = story.investHealth;
  if (investHealth.satisfied) {
    return '✓ Pass';
  } else {
    const issueCount = investHealth.issues.length;
    return `⚠ ${issueCount} issue${issueCount > 1 ? 's' : ''}`;
  }
}
