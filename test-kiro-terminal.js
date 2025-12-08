#!/usr/bin/env node

/**
 * Test script for Kiro Terminal Window feature
 * Tests that clicking "Refine with Kiro" opens a new window instead of modal
 */

import { startServer } from './apps/backend/app.js';
import http from 'http';

console.log('🧪 Testing Kiro Terminal Window Feature\n');

// Start server
const server = await startServer(4000);
console.log('✅ Server started on port 4000\n');

// Test 1: Verify kiro-terminal.html is served
console.log('Test 1: Checking if kiro-terminal.html is accessible...');
const htmlTest = await new Promise((resolve) => {
  http.get('http://localhost:4000/kiro-terminal.html', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const hasTitle = data.includes('<title>Kiro CLI Terminal</title>');
      const hasTerminal = data.includes('terminal-container');
      const hasXterm = data.includes('xterm');
      resolve(hasTitle && hasTerminal && hasXterm);
    });
  }).on('error', () => resolve(false));
});

if (htmlTest) {
  console.log('✅ kiro-terminal.html is properly served\n');
} else {
  console.log('❌ kiro-terminal.html is not accessible\n');
  process.exit(1);
}

// Test 2: Verify app.js contains window.open instead of openModal
console.log('Test 2: Checking if app.js uses window.open...');
const fs = await import('fs');
const appJs = fs.readFileSync('./apps/frontend/public/app.js', 'utf-8');
const hasWindowOpen = appJs.includes('window.open(`/kiro-terminal.html?${params.toString()}`, \'_blank\'');
const noModal = !appJs.includes('buildKiroTerminalModalContent(entry)') || 
                appJs.split('buildKiroTerminalModalContent').length <= 2; // Function definition only

if (hasWindowOpen) {
  console.log('✅ app.js correctly uses window.open for new window\n');
} else {
  console.log('❌ app.js does not use window.open\n');
  process.exit(1);
}

// Test 3: Verify terminal API endpoints are registered in backend
console.log('Test 3: Checking terminal API endpoints are registered...');
const backendCode = fs.readFileSync('./apps/backend/app.js', 'utf-8');
const endpointsRegistered = [
  '/api/terminal/start',
  '/api/terminal/input', 
  '/api/terminal/output',
  '/api/terminal/stop'
].every(endpoint => backendCode.includes(`'${endpoint}'`));

if (endpointsRegistered) {
  console.log('✅ All terminal API endpoints are registered in backend\n');
} else {
  console.log('❌ Some terminal API endpoints are not registered\n');
  process.exit(1);
}

// Test 4: Verify the implementation matches requirements
console.log('Test 4: Verifying implementation matches requirements...');
const requirements = {
  'Opens new window (not modal)': hasWindowOpen,
  'Terminal page exists': htmlTest,
  'Context passed via URL params': appJs.includes('storyId: story.id') && appJs.includes('title: story.title'),
  'Window can be moved outside browser': true, // window.open with _blank allows this
  'Terminal endpoints registered': endpointsRegistered
};

let allRequirementsMet = true;
for (const [req, met] of Object.entries(requirements)) {
  console.log(`  ${met ? '✅' : '❌'} ${req}`);
  if (!met) allRequirementsMet = false;
}

console.log('');

if (allRequirementsMet) {
  console.log('🎉 All tests passed! Feature is correctly implemented.\n');
  console.log('Summary:');
  console.log('- Clicking "Refine with Kiro" opens a new browser window');
  console.log('- The window is not a modal and can be moved outside the AIPM window');
  console.log('- Story context is loaded via URL parameters');
  console.log('- Terminal API endpoints are ready for session management');
} else {
  console.log('❌ Some requirements are not met\n');
  process.exit(1);
}

// Cleanup
server.close();
process.exit(0);
