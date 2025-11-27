// Load API base URL from config
let API_BASE_URL = '';
let CURRENT_ENV = 'dev'; // Default to dev
try {
    if (window.__AIPM_API_BASE__) {
        API_BASE_URL = window.__AIPM_API_BASE__;
        // Determine environment from API URL
        CURRENT_ENV = API_BASE_URL.includes('/prod') ? 'prod' : 'dev';
    }
} catch (e) {
    console.warn('Config not loaded, using fallback');
}

// Current environment configuration
const ENV_CONFIG = {
    dev: {
        api: 'https://dka9vov9vg.execute-api.us-east-1.amazonaws.com/dev',
        frontend: 'http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com',
        name: 'Development'
    },
    prod: {
        api: 'https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod',
        frontend: 'http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com',
        name: 'Production'
    }
};

const CURRENT_CONFIG = ENV_CONFIG[CURRENT_ENV];

// Test definitions
const TEST_SUITES = {
    frontend: {
        name: 'Frontend Tests',
        tests: [
            { name: 'S3 Static Website', test: 'testFrontendAccess' },
            { name: 'HTML Assets', test: 'testHtmlAssets' },
            { name: 'Configuration', test: 'testFrontendConfig' },
            { name: 'Load Performance', test: 'testFrontendPerformance' }
        ]
    },
    backend: {
        name: 'Backend Tests',
        tests: [
            { name: 'Lambda Health', test: 'testLambdaHealth' },
            { name: 'API Endpoints', test: 'testApiEndpoints' },
            { name: 'CORS Configuration', test: 'testCorsConfig' },
            { name: 'Response Performance', test: 'testApiPerformance' }
        ]
    },
    storage: {
        name: 'Storage Tests',
        tests: [
            { name: 'DynamoDB Access', test: 'testDynamoAccess' },
            { name: 'Read Operations', test: 'testReadOperations' },
            { name: 'Write Operations', test: 'testWriteOperations' },
            { name: 'Data Persistence', test: 'testDataPersistence' }
        ]
    }
};

// Test results storage
let testResults = {};

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    initializeTestResults();
    renderTestResults();
    
    document.getElementById('runAllTests').addEventListener('click', () => runTests());
});

function initializeTestResults() {
    testResults = {};
    Object.keys(TEST_SUITES).forEach(suite => {
        testResults[suite] = {};
        TEST_SUITES[suite].tests.forEach(test => {
            testResults[suite][test.name] = { status: 'pending', message: '', duration: 0 };
        });
    });
}

function renderTestResults() {
    const container = document.getElementById('testResults');
    container.innerHTML = '';
    
    const envSection = document.createElement('div');
    envSection.className = 'test-section';
    envSection.innerHTML = `
        <div class="test-header">
            <h2>${CURRENT_CONFIG.name} Environment</h2>
            <small>${CURRENT_CONFIG.api}</small>
        </div>
        <div class="test-results" id="results"></div>
    `;
    container.appendChild(envSection);
    
    const resultsContainer = document.getElementById('results');
    Object.entries(TEST_SUITES).forEach(([suiteKey, suite]) => {
        const suiteDiv = document.createElement('div');
        suiteDiv.innerHTML = `<h3>${suite.name}</h3>`;
        
        suite.tests.forEach(test => {
            const result = testResults[suiteKey][test.name];
            const testDiv = document.createElement('div');
            testDiv.className = 'test-item';
            testDiv.innerHTML = `
                <span>${test.name}</span>
                <span class="test-status status-${result.status}">${result.status.toUpperCase()}</span>
            `;
            
            // Add error message if test failed
            if (result.status === 'fail' && result.message) {
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = 'font-size: 12px; color: #721c24; margin-left: 20px; margin-top: 5px;';
                errorDiv.textContent = result.message;
                testDiv.appendChild(errorDiv);
            }
            
            suiteDiv.appendChild(testDiv);
        });
        
        resultsContainer.appendChild(suiteDiv);
    });
}

async function runTests() {
    const button = document.getElementById('runAllTests');
    button.disabled = true;
    button.textContent = 'Running Tests...';
    
    for (const [suiteKey, suite] of Object.entries(TEST_SUITES)) {
        for (const test of suite.tests) {
            testResults[suiteKey][test.name].status = 'running';
            renderTestResults();
            
            const start = Date.now();
            try {
                const result = await runSingleTest(test.test, CURRENT_CONFIG);
                testResults[suiteKey][test.name] = {
                    status: result.success ? 'pass' : 'fail',
                    message: result.message,
                    duration: Date.now() - start
                };
            } catch (error) {
                testResults[suiteKey][test.name] = {
                    status: 'fail',
                    message: error.message,
                    duration: Date.now() - start
                };
            }
            renderTestResults();
        }
    }
    
    button.disabled = false;
    button.textContent = 'Run All Tests';
}

// Individual test implementations
async function runSingleTest(testName, config) {
    try {
        switch (testName) {
            case 'testFrontendAccess':
                const frontendResponse = await fetch(`${config.frontend}/index.html`);
                return {
                    success: frontendResponse.status === 200,
                    message: `Status: ${frontendResponse.status}`
                };
                
            case 'testHtmlAssets':
                const assetsResponse = await fetch(`${config.frontend}/app.js`);
                return {
                    success: assetsResponse.status === 200,
                    message: `Assets status: ${assetsResponse.status}`
                };
                
            case 'testFrontendConfig':
                const configResponse = await fetch(`${config.frontend}/config.js`);
                if (configResponse.status !== 200) {
                    return { success: false, message: `Config not found: ${configResponse.status}` };
                }
                const configText = await configResponse.text();
                return {
                    success: configText.includes('__AIPM_API_BASE__'),
                    message: `Config valid: ${configText.includes('__AIPM_API_BASE__')}`
                };
                
            case 'testFrontendPerformance':
                const start = Date.now();
                await fetch(`${config.frontend}/index.html`);
                const duration = Date.now() - start;
                return {
                    success: duration < 3000,
                    message: `Load time: ${duration}ms`
                };
                
            case 'testLambdaHealth':
                const healthResponse = await fetch(`${config.api}/`);
                return {
                    success: healthResponse.status === 200 || healthResponse.status === 404,
                    message: `Lambda status: ${healthResponse.status}`
                };
                
            case 'testApiEndpoints':
                const apiResponse = await fetch(`${config.api}/api/stories`);
                return {
                    success: apiResponse.status === 200,
                    message: `API status: ${apiResponse.status}`
                };
                
            case 'testCorsConfig':
                try {
                    const testUrl = `${config.api}/api/stories`;
                    console.log('CORS test URL:', testUrl);
                    const corsResponse = await fetch(testUrl, {
                        method: 'OPTIONS'
                    });
                    const corsHeader = corsResponse.headers.get('Access-Control-Allow-Origin');
                    console.log('CORS response headers:', [...corsResponse.headers.entries()]);
                    return {
                        success: corsHeader === '*',
                        message: `CORS: ${corsHeader || 'none'} (status: ${corsResponse.status}) URL: ${testUrl}`
                    };
                } catch (error) {
                    return {
                        success: false,
                        message: `CORS error: ${error.message}`
                    };
                }
                
            case 'testApiPerformance':
                const apiStart = Date.now();
                await fetch(`${config.api}/api/stories`);
                const apiDuration = Date.now() - apiStart;
                return {
                    success: apiDuration < 5000,
                    message: `API time: ${apiDuration}ms`
                };
                
            case 'testDynamoAccess':
                const dynamoResponse = await fetch(`${config.api}/api/stories`);
                const stories = await dynamoResponse.json();
                return {
                    success: Array.isArray(stories),
                    message: `DynamoDB accessible: ${Array.isArray(stories)}`
                };
                
            case 'testReadOperations':
                const readResponse = await fetch(`${config.api}/api/stories`);
                return {
                    success: readResponse.status === 200,
                    message: `Read status: ${readResponse.status}`
                };
                
            case 'testWriteOperations':
                const testStory = {
                    title: `Test ${Date.now()}`,
                    description: 'Test story'
                };
                const writeResponse = await fetch(`${config.api}/api/stories`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(testStory)
                });
                
                let cleanup = false;
                if (writeResponse.ok) {
                    try {
                        const created = await writeResponse.json();
                        if (created.id) {
                            await fetch(`${config.api}/api/stories/${created.id}`, { method: 'DELETE' });
                            cleanup = true;
                        }
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                }
                
                return {
                    success: writeResponse.ok,
                    message: `Write: ${writeResponse.status}${cleanup ? ' (cleaned)' : ''}`
                };
                
            case 'testDataPersistence':
                const persistenceResponse = await fetch(`${config.api}/api/stories`);
                const persistenceData = await persistenceResponse.json();
                return {
                    success: persistenceResponse.status === 200,
                    message: `Stories: ${Array.isArray(persistenceData) ? persistenceData.length : 'error'}`
                };
                
            default:
                throw new Error(`Unknown test: ${testName}`);
        }
    } catch (error) {
        return {
            success: false,
            message: `Error: ${error.message}`
        };
    }
}
