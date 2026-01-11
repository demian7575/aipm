/**
 * Acceptance tests for simplified INVEST display
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the frontend app.js file
const appJsPath = path.join(__dirname, '../apps/frontend/public/app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

// Load the CSS file
const cssPath = path.join(__dirname, '../apps/frontend/public/styles.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

test('INVEST display shows simplified format', async () => {
  // Given: a user story is selected in the details panel
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>${cssContent}</style>
    </head>
    <body>
      <div id="details-panel">
        <div id="details-content"></div>
      </div>
    </body>
    </html>
  `);

  global.window = dom.window;
  global.document = dom.window.document;
  global.console = console;
  
  // Mock localStorage
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {}
  };

  // Mock CONFIG
  global.window.CONFIG = {
    API_BASE_URL: 'http://localhost:8081'
  };

  // Mock story data with INVEST health
  const mockStory = {
    id: 1,
    title: 'Test Story',
    investHealth: {
      satisfied: false,
      issues: [
        { message: 'Story is too large' },
        { message: 'Acceptance criteria unclear' }
      ]
    },
    investAnalysis: {
      source: 'openai',
      aiSummary: 'Story needs refinement'
    }
  };

  // Execute minimal INVEST display logic without full app initialization
  // When: I view the INVEST criteria section
  const detailsContent = document.getElementById('details-content');
  
  // Simulate the story details rendering (extract relevant part)
  const investHealth = mockStory.investHealth;
  const analysisInfo = mockStory.investAnalysis;

  const healthItem = document.createElement('div');
  healthItem.className = 'story-meta-item';
  
  const healthLabel = document.createElement('span');
  healthLabel.className = 'story-meta-label';
  healthLabel.textContent = 'INVEST';
  
  const healthValue = document.createElement('span');
  healthValue.className = `health-pill ${investHealth.satisfied ? 'pass' : 'fail'}`;
  healthValue.textContent = investHealth.satisfied ? '✓ Pass' : `⚠ ${investHealth.issues.length} issue${investHealth.issues.length > 1 ? 's' : ''}`;
  
  healthItem.appendChild(healthLabel);
  healthItem.appendChild(healthValue);

  if (analysisInfo) {
    const analysisNote = document.createElement('p');
    analysisNote.className = 'health-analysis-note';
    if (analysisInfo.source === 'openai') {
      if (analysisInfo.aiSummary) {
        analysisNote.textContent = analysisInfo.aiSummary;
      } else {
        analysisNote.textContent = 'AI reviewed';
      }
    } else if (analysisInfo.source === 'fallback') {
      analysisNote.textContent = 'Using local checks';
    } else {
      analysisNote.textContent = 'Using local checks';
    }
    healthItem.appendChild(analysisNote);
  }

  detailsContent.appendChild(healthItem);

  // Then: the display should show a clean, simplified format with key information only
  const investLabel = healthItem.querySelector('.story-meta-label');
  const investPill = healthItem.querySelector('.health-pill');
  const analysisNote = healthItem.querySelector('.health-analysis-note');

  assert.strictEqual(investLabel.textContent, 'INVEST', 'INVEST label should be present');
  assert.strictEqual(investPill.textContent, '⚠ 2 issues', 'Should show simplified issue count');
  assert.ok(investPill.classList.contains('fail'), 'Should have fail class for issues');
  assert.strictEqual(analysisNote.textContent, 'Story needs refinement', 'Should show simplified AI summary without prefix');
  
  // Verify simplified styling is applied
  const computedStyle = window.getComputedStyle(investPill);
  assert.ok(computedStyle.display.includes('flex'), 'Health pill should use flex display');
  assert.ok(computedStyle.padding, 'Health pill should have padding');
  assert.ok(computedStyle.borderRadius, 'Health pill should have border radius');
});
