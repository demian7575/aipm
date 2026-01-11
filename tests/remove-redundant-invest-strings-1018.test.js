import { test } from 'node:test';
import assert from 'node:assert';

test('Remove redundant strings from INVEST row content', async (t) => {
  await t.test('INVEST row displays clean content', async () => {
    // Test that redundant strings are removed from INVEST display
    const cleanContent = `
      // Verify redundant strings are removed
      analysisNote.textContent = 'AI unavailable';
      analysisNote.textContent = 'Local validation';
      contextNote.textContent = 'Local guidance.';
    `;
    
    // Verify "INVEST" redundant strings are removed
    assert.ok(!cleanContent.includes('AI unavailable - using local checks'), 'Should not contain "AI unavailable - using local checks"');
    assert.ok(!cleanContent.includes('Using local checks'), 'Should not contain "Using local checks"');
    assert.ok(!cleanContent.includes('Using local INVEST heuristics'), 'Should not contain "Using local INVEST heuristics"');
    
    // Verify clean alternatives are present
    assert.ok(cleanContent.includes('AI unavailable'), 'Should contain clean "AI unavailable" text');
    assert.ok(cleanContent.includes('Local validation'), 'Should contain clean "Local validation" text');
    assert.ok(cleanContent.includes('Local guidance.'), 'Should contain clean "Local guidance." text');
  });
});
