#!/usr/bin/env node

// Test script to verify the Generate Code and Create PR button separation
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🧪 Testing Button Separation Fix');
console.log('================================');

// Test 1: Check if app.js contains separate button implementations
const appJsPath = path.join(__dirname, 'apps/frontend/public/app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

console.log('\n📋 Test 1: Generate Code Button Implementation');
const hasGenerateCodeButton = appJsContent.includes("generateCodeBtn.textContent = 'Generate Code'");
const hasGenerateCodeModal = appJsContent.includes('openUpdatePRWithCodeModal');
console.log(`   ✅ Generate Code button: ${hasGenerateCodeButton ? 'FOUND' : 'MISSING'}`);
console.log(`   ✅ Generate Code modal: ${hasGenerateCodeModal ? 'FOUND' : 'MISSING'}`);

console.log('\n📋 Test 2: Create PR Button Implementation');
const hasCreatePRButton = appJsContent.includes("createPRBtn.textContent = 'Create PR'");
const hasCreatePRModal = appJsContent.includes('openCreatePRModal');
console.log(`   ✅ Create PR button: ${hasCreatePRButton ? 'FOUND' : 'MISSING'}`);
console.log(`   ✅ Create PR modal: ${hasCreatePRModal ? 'FOUND' : 'MISSING'}`);

// Test 2: Check backend API endpoints
const backendPath = path.join(__dirname, 'apps/backend/app.js');
const backendContent = fs.readFileSync(backendPath, 'utf8');

console.log('\n📋 Test 3: Backend API Endpoints');
const hasGenerateCodeEndpoint = backendContent.includes("/api/generate-code");
const hasCreatePREndpoint = backendContent.includes("/api/create-pr");
const hasGenerateCodeHandler = backendContent.includes('handleGenerateCodeRequest');
const hasCreatePRHandler = backendContent.includes('handleCreatePRRequest');

console.log(`   ✅ /api/generate-code endpoint: ${hasGenerateCodeEndpoint ? 'FOUND' : 'MISSING'}`);
console.log(`   ✅ /api/create-pr endpoint: ${hasCreatePREndpoint ? 'FOUND' : 'MISSING'}`);
console.log(`   ✅ Generate code handler: ${hasGenerateCodeHandler ? 'FOUND' : 'MISSING'}`);
console.log(`   ✅ Create PR handler: ${hasCreatePRHandler ? 'FOUND' : 'MISSING'}`);

// Test 3: Check modal separation
console.log('\n📋 Test 4: Modal Function Separation');
const hasGenerateCodeModalTitle = appJsContent.includes("title: 'Generate Code for PR'");
const hasCreatePRModalTitle = appJsContent.includes("title: 'Create Pull Request'");
console.log(`   ✅ Generate Code modal title: ${hasGenerateCodeModalTitle ? 'FOUND' : 'MISSING'}`);
console.log(`   ✅ Create PR modal title: ${hasCreatePRModalTitle ? 'FOUND' : 'MISSING'}`);

// Summary
const allTests = [
  hasGenerateCodeButton,
  hasGenerateCodeModal,
  hasCreatePRButton,
  hasCreatePRModal,
  hasGenerateCodeEndpoint,
  hasCreatePREndpoint,
  hasGenerateCodeHandler,
  hasCreatePRHandler,
  hasGenerateCodeModalTitle,
  hasCreatePRModalTitle
];

const passedTests = allTests.filter(test => test).length;
const totalTests = allTests.length;

console.log('\n================================');
console.log(`📊 Test Results: ${passedTests}/${totalTests} passed`);

if (passedTests === totalTests) {
  console.log('✅ ALL TESTS PASSED - Button separation fix is working correctly!');
  process.exit(0);
} else {
  console.log('❌ SOME TESTS FAILED - Button separation needs fixes');
  process.exit(1);
}
