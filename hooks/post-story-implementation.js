#!/usr/bin/env node

/**
 * Post-Story Implementation Hook
 * Automatically adds gating tests when user stories are marked as "Done"
 */

const { addGatingTest, addTestToSuite } = require('../update-gating-tests.js');

function analyzeStoryForGatingTests(story) {
    const tests = [];
    
    // Check if story involves API endpoints
    if (story.description.includes('API') || story.description.includes('endpoint')) {
        tests.push({
            type: 'api',
            config: {
                TestName: story.title.replace(/\s+/g, ''),
                testVar: story.title.toLowerCase().replace(/\s+/g, ''),
                endpoint: extractEndpoint(story.description) || '/api/stories',
                method: extractMethod(story.description) || 'GET',
                payload: '{}',
                testName: story.title
            }
        });
    }
    
    // Check if story involves UI components
    if (story.description.includes('button') || story.description.includes('form') || story.description.includes('UI')) {
        tests.push({
            type: 'frontend',
            config: {
                TestName: story.title.replace(/\s+/g, ''),
                element: story.title.toLowerCase().replace(/\s+/g, '') + 'Element',
                elementId: extractElementId(story.description) || 'new-element',
                testName: story.title,
                description: story.description.substring(0, 50) + '...'
            }
        });
    }
    
    // Check if story involves workflows
    if (story.acceptanceTests && story.acceptanceTests.length > 1) {
        tests.push({
            type: 'integration',
            config: {
                TestName: story.title.replace(/\s+/g, '') + 'Workflow',
                description: `${story.title} end-to-end workflow`,
                endpoint1: '/api/stories',
                method1: 'POST',
                payload1: '{"title":"test"}',
                endpoint2: '/api/stories',
                method2: 'GET',
                testName: story.title + ' Workflow'
            }
        });
    }
    
    return tests;
}

function extractEndpoint(description) {
    const match = description.match(/\/api\/[^\s]+/);
    return match ? match[0] : null;
}

function extractMethod(description) {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    for (const method of methods) {
        if (description.toUpperCase().includes(method)) {
            return method;
        }
    }
    return null;
}

function extractElementId(description) {
    const match = description.match(/id="([^"]+)"/);
    return match ? match[1] : null;
}

function processStoryImplementation(story) {
    console.log(`🔍 Analyzing story: ${story.title}`);
    
    const requiredTests = analyzeStoryForGatingTests(story);
    
    if (requiredTests.length === 0) {
        console.log('ℹ️  No gating tests required for this story');
        return;
    }
    
    console.log(`📝 Adding ${requiredTests.length} gating test(s)...`);
    
    requiredTests.forEach(test => {
        try {
            addGatingTest(test.type, test.config);
            
            // Add to appropriate test suite
            const suite = test.type === 'api' ? 'core' : 
                         test.type === 'frontend' ? 'ui' : 'workflows';
            addTestToSuite(suite, `test${test.config.TestName}`);
            
        } catch (error) {
            console.error(`❌ Failed to add gating test: ${error.message}`);
        }
    });
    
    console.log('✅ Gating tests updated for story implementation');
}

// CLI interface
if (require.main === module) {
    const storyData = JSON.parse(process.argv[2] || '{}');
    processStoryImplementation(storyData);
}

module.exports = { processStoryImplementation, analyzeStoryForGatingTests };
