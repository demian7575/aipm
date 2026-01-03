#!/usr/bin/env node

// Test Code Generation Validation for PR #999
// Validates that the Hide Completed functionality is properly implemented

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function validateImplementation() {
  console.log('🔍 Validating Hide Completed implementation...');
  
  // Check if HTML contains the button
  const htmlPath = path.join(__dirname, 'apps/frontend/public/index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const hasButton = htmlContent.includes('hide-completed-btn');
  
  // Check if JS contains the functionality
  const jsPath = path.join(__dirname, 'apps/frontend/public/app.js');
  const jsContent = fs.readFileSync(jsPath, 'utf8');
  const hasHideCompletedState = jsContent.includes('hideCompleted');
  const hasFilterFunction = jsContent.includes('getVisibleStories');
  const hasEventListener = jsContent.includes('hideCompletedBtn.addEventListener');
  
  console.log(`✅ HTML Button: ${hasButton ? 'Found' : 'Missing'}`);
  console.log(`✅ JS State Management: ${hasHideCompletedState ? 'Found' : 'Missing'}`);
  console.log(`✅ Filter Function: ${hasFilterFunction ? 'Found' : 'Missing'}`);
  console.log(`✅ Event Listener: ${hasEventListener ? 'Found' : 'Missing'}`);
  
  const allChecks = hasButton && hasHideCompletedState && hasFilterFunction && hasEventListener;
  
  if (allChecks) {
    console.log('🎉 Hide Completed functionality is fully implemented!');
    return true;
  } else {
    console.log('❌ Implementation incomplete');
    return false;
  }
}

// Run validation
const isValid = validateImplementation();
process.exit(isValid ? 0 : 1);
