#!/usr/bin/env node

/**
 * Gating Test Update Process
 * Automatically adds gating tests when important requirements or user stories are implemented
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test templates for different types of requirements
const TEST_TEMPLATES = {
    api: {
        template: `
        case 'test{TestName}':
            const {testVar}Response = await fetch(\`\${PROD_CONFIG.api}{endpoint}\`, {
                method: '{method}',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({payload})
            });
            
            return {
                success: {testVar}Response.ok,
                message: \`{testName}: \${{{testVar}Response.status}}\`
            };`,
        variables: ['TestName', 'testVar', 'endpoint', 'method', 'payload', 'testName']
    },
    
    frontend: {
        template: `
        case 'test{TestName}':
            // Test {description}
            const {element} = document.getElementById('{elementId}');
            if (!{element}) {
                return { success: false, message: '{testName}: Required element not found' };
            }
            
            return {
                success: true,
                message: '{testName}: Element exists and accessible'
            };`,
        variables: ['TestName', 'element', 'elementId', 'testName', 'description']
    },
    
    integration: {
        template: `
        case 'test{TestName}':
            // Test {description}
            const step1Response = await fetch(\`\${PROD_CONFIG.api}{endpoint1}\`, {
                method: '{method1}',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({payload1})
            });
            
            if (!step1Response.ok) {
                return { success: false, message: '{testName}: Step 1 failed: ' + step1Response.status };
            }
            
            const step1Data = await step1Response.json();
            const step2Response = await fetch(\`\${PROD_CONFIG.api}{endpoint2}/\${step1Data.id}\`, {
                method: '{method2}',
                headers: { 'Content-Type': 'application/json' }
            });
            
            return {
                success: step2Response.ok,
                message: \`{testName}: \${step2Response.status}\`
            };`,
        variables: ['TestName', 'description', 'endpoint1', 'method1', 'payload1', 'endpoint2', 'method2', 'testName']
    }
};

function addGatingTest(type, config) {
    const gatingTestsPath = path.join(__dirname, 'apps/frontend/public/production-gating-tests.js');
    let content = fs.readFileSync(gatingTestsPath, 'utf8');
    
    // Generate test case from template
    const template = TEST_TEMPLATES[type];
    if (!template) {
        throw new Error(`Unknown test type: ${type}`);
    }
    
    let testCase = template.template;
    
    // Replace template variables
    template.variables.forEach(variable => {
        const value = config[variable] || `{${variable}}`;
        testCase = testCase.replace(new RegExp(`{${variable}}`, 'g'), value);
    });
    
    // Find insertion point (before the default case)
    const insertionPoint = content.lastIndexOf('        default:');
    if (insertionPoint === -1) {
        throw new Error('Could not find insertion point in gating tests');
    }
    
    // Insert the new test case
    const beforeInsertion = content.substring(0, insertionPoint);
    const afterInsertion = content.substring(insertionPoint);
    const updatedContent = beforeInsertion + testCase + '\n            break;\n\n        ' + afterInsertion;
    
    // Write back to file
    fs.writeFileSync(gatingTestsPath, updatedContent);
    
    console.log(`✅ Added gating test: ${config.TestName}`);
    return testCase;
}

function addTestToSuite(suiteName, testName) {
    const gatingTestsPath = path.join(__dirname, 'apps/frontend/public/production-gating-tests.js');
    let content = fs.readFileSync(gatingTestsPath, 'utf8');
    
    // Find the test suite definition
    const suitePattern = new RegExp(`(${suiteName}:\\s*\\[)([^\\]]*)(\\])`, 's');
    const match = content.match(suitePattern);
    
    if (!match) {
        throw new Error(`Test suite ${suiteName} not found`);
    }
    
    const existingTests = match[2];
    const newTestEntry = `'${testName}'`;
    
    // Check if test already exists
    if (existingTests.includes(newTestEntry)) {
        console.log(`⚠️  Test ${testName} already exists in suite ${suiteName}`);
        return;
    }
    
    // Add test to suite
    const updatedTests = existingTests.trim() ? `${existingTests.trim()}, ${newTestEntry}` : newTestEntry;
    const updatedContent = content.replace(suitePattern, `$1${updatedTests}$3`);
    
    fs.writeFileSync(gatingTestsPath, updatedContent);
    console.log(`✅ Added ${testName} to ${suiteName} test suite`);
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];

if (command) {
    switch (command) {
        case 'add-api-test':
            const apiConfig = {
                TestName: args[1],
                testVar: args[1].toLowerCase(),
                endpoint: args[2],
                method: args[3] || 'GET',
                payload: args[4] || '{}',
                testName: args[1].replace(/([A-Z])/g, ' $1').trim()
            };
            addGatingTest('api', apiConfig);
            addTestToSuite('core', `test${apiConfig.TestName}`);
            break;
            
        case 'add-frontend-test':
            const frontendConfig = {
                TestName: args[1],
                element: args[1].toLowerCase() + 'Element',
                elementId: args[2],
                testName: args[1].replace(/([A-Z])/g, ' $1').trim(),
                description: args[3] || 'frontend element accessibility'
            };
            addGatingTest('frontend', frontendConfig);
            addTestToSuite('ui', `test${frontendConfig.TestName}`);
            break;
            
        case 'add-integration-test':
            const integrationConfig = {
                TestName: args[1],
                description: args[2] || 'integration workflow',
                endpoint1: args[3],
                method1: args[4] || 'POST',
                payload1: args[5] || '{}',
                endpoint2: args[6],
                method2: args[7] || 'GET',
                testName: args[1].replace(/([A-Z])/g, ' $1').trim()
            };
            addGatingTest('integration', integrationConfig);
            addTestToSuite('workflows', `test${integrationConfig.TestName}`);
            break;
            
        default:
            console.log(`
Usage:
  node update-gating-tests.js add-api-test <TestName> <endpoint> [method] [payload]
  node update-gating-tests.js add-frontend-test <TestName> <elementId> [description]
  node update-gating-tests.js add-integration-test <TestName> <description> <endpoint1> [method1] [payload1] <endpoint2> [method2]

Examples:
  node update-gating-tests.js add-api-test StoryValidation /api/stories/validate POST '{"id":1}'
  node update-gating-tests.js add-frontend-test GenerateButton generate-story-btn "story generation button"
  node update-gating-tests.js add-integration-test StoryCreationFlow "create and validate story" /api/stories POST '{"title":"test"}' /api/stories
            `);
    }
}

export { addGatingTest, addTestToSuite, TEST_TEMPLATES };
