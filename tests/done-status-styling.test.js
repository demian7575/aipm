/**
 * Test: User stories with "Done" status should have grey background
 * 
 * This test verifies that the CSS styling for Done status is properly configured
 * to display user stories with a grey background color.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test('Done status has grey background in CSS', () => {
  const cssPath = join(__dirname, '../apps/frontend/public/styles.css');
  const cssContent = readFileSync(cssPath, 'utf8');
  
  // Verify outline item styling
  assert.ok(
    cssContent.includes('.outline-item.status-done'),
    'CSS should include .outline-item.status-done class'
  );
  
  assert.ok(
    cssContent.includes('background: #7f7f7f'),
    'Done status should have grey background color #7f7f7f'
  );
  
  // Verify mindmap node styling
  assert.ok(
    cssContent.includes('.mindmap-node.status-done'),
    'CSS should include .mindmap-node.status-done class'
  );
  
  assert.ok(
    cssContent.includes('fill: #7f7f7f'),
    'Mindmap Done status should have grey fill color #7f7f7f'
  );
});

test('STATUS_CLASS_MAP includes Done mapping', () => {
  const appJsPath = join(__dirname, '../apps/frontend/public/app.js');
  const appJsContent = readFileSync(appJsPath, 'utf8');
  
  assert.ok(
    appJsContent.includes('Done: \'status-done\''),
    'STATUS_CLASS_MAP should map Done to status-done class'
  );
});
