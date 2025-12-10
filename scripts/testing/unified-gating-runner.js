#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UnifiedGatingRunner {
    constructor() {
        this.results = {
            javascript: { passed: 0, failed: 0, tests: [] },
            nodejs: { passed: 0, failed: 0, tests: [] },
            shell: { passed: 0, failed: 0, tests: [] },
            browser: { passed: 0, failed: 0, tests: [] }
        };
        this.totalPassed = 0;
        this.totalFailed = 0;
    }

    async runCommand(command, args = [], options = {}) {
        return new Promise((resolve) => {
            const proc = spawn(command, args, { 
                stdio: 'pipe',
                shell: true,
                ...options 
            });
            
            let stdout = '';
            let stderr = '';
            
            proc.stdout?.on('data', (data) => stdout += data.toString());
            proc.stderr?.on('data', (data) => stderr += data.toString());
            
            proc.on('close', (code) => {
                resolve({ code, stdout, stderr });
            });
        });
    }

    async runJavaScriptTests() {
        console.log('🟨 JavaScript Browser Tests (50 tests)');
        
        try {
            const result = await this.runCommand('node', ['scripts/testing/run-comprehensive-gating-tests.cjs']);
            
            if (result.code === 0) {
                this.results.javascript.passed = 50;
                console.log('   ✅ JavaScript tests passed');
            } else {
                this.results.javascript.failed = 50;
                console.log('   ❌ JavaScript tests failed');
            }
            
            this.results.javascript.tests.push({
                name: 'Comprehensive Environment Tests',
                status: result.code === 0 ? 'pass' : 'fail',
                output: result.stdout
            });
            
        } catch (error) {
            this.results.javascript.failed = 50;
            console.log(`   ❌ JavaScript tests error: ${error.message}`);
        }
    }

    async runNodeJSTests() {
        console.log('🟦 Node.js API Tests (13 tests)');
        
        try {
            // Use the legacy test command to avoid recursion
            const result = await this.runCommand('bash', ['scripts/testing/run-all-gating-tests.sh']);
            
            if (result.code === 0) {
                this.results.nodejs.passed = 13;
                console.log('   ✅ Node.js tests passed');
            } else {
                this.results.nodejs.failed = 13;
                console.log('   ❌ Node.js tests failed');
            }
            
            this.results.nodejs.tests.push({
                name: 'Backend API Tests',
                status: result.code === 0 ? 'pass' : 'fail',
                output: result.stdout
            });
            
        } catch (error) {
            this.results.nodejs.failed = 13;
            console.log(`   ❌ Node.js tests error: ${error.message}`);
        }
    }

    async runShellTests() {
        console.log('🟫 Shell Script Tests');
        
        const shellTests = [
            'scripts/testing/test-deployment-config-gating.sh',
            'scripts/testing/test-kiro-api-gating.sh',
            'scripts/testing/test-dev-deployment-gating.sh',
            'scripts/testing/test-ecs-worker-gating.sh',
            'scripts/testing/test-worker-pool-gating.sh'
        ];
        
        for (const testScript of shellTests) {
            if (fs.existsSync(testScript)) {
                try {
                    const result = await this.runCommand('bash', [testScript]);
                    const testName = path.basename(testScript, '.sh');
                    
                    if (result.code === 0) {
                        this.results.shell.passed++;
                        console.log(`   ✅ ${testName}`);
                    } else {
                        this.results.shell.failed++;
                        console.log(`   ❌ ${testName}`);
                    }
                    
                    this.results.shell.tests.push({
                        name: testName,
                        status: result.code === 0 ? 'pass' : 'fail',
                        output: result.stdout
                    });
                    
                } catch (error) {
                    this.results.shell.failed++;
                    console.log(`   ❌ ${path.basename(testScript)}: ${error.message}`);
                }
            }
        }
    }

    async runBrowserTests() {
        console.log('🟪 Browser Validation Tests');
        
        try {
            const result = await this.runCommand('node', ['scripts/testing/run-browser-tests-automated.cjs']);
            
            if (result.code === 0) {
                this.results.browser.passed = 90; // 45 prod + 45 dev
                console.log('   ✅ Browser validation passed');
            } else {
                this.results.browser.failed = 90;
                console.log('   ❌ Browser validation failed');
            }
            
            this.results.browser.tests.push({
                name: 'Browser Test Validation',
                status: result.code === 0 ? 'pass' : 'fail',
                output: result.stdout
            });
            
        } catch (error) {
            this.results.browser.failed = 90;
            console.log(`   ❌ Browser tests error: ${error.message}`);
        }
    }

    calculateTotals() {
        for (const category of Object.values(this.results)) {
            this.totalPassed += category.passed;
            this.totalFailed += category.failed;
        }
    }

    printSummary() {
        console.log('\n' + '='.repeat(70));
        console.log('📊 UNIFIED GATING TEST SUMMARY');
        console.log('='.repeat(70));
        
        const categories = [
            { name: 'JavaScript (Browser)', key: 'javascript', color: '🟨' },
            { name: 'Node.js (API)', key: 'nodejs', color: '🟦' },
            { name: 'Shell Scripts', key: 'shell', color: '🟫' },
            { name: 'Browser Validation', key: 'browser', color: '🟪' }
        ];
        
        for (const category of categories) {
            const result = this.results[category.key];
            const total = result.passed + result.failed;
            const status = result.failed === 0 ? '✅ PASS' : '❌ FAIL';
            console.log(`${category.color} ${category.name.padEnd(20)}: ${status} (${result.passed}/${total})`);
        }
        
        console.log('='.repeat(70));
        console.log(`📈 TOTAL: ${this.totalPassed}/${this.totalPassed + this.totalFailed} tests passed`);
        
        if (this.totalFailed === 0) {
            console.log('🎉 ALL GATING TESTS PASSED');
            console.log('✅ System ready for deployment');
        } else {
            console.log('⚠️  SOME GATING TESTS FAILED');
            console.log('❌ Fix issues before deployment');
        }
    }

    async run() {
        console.log('🚀 UNIFIED GATING TEST RUNNER');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Consolidating all test systems into single execution\n');
        
        // Run all test categories
        await this.runJavaScriptTests();
        console.log('');
        
        await this.runNodeJSTests();
        console.log('');
        
        await this.runShellTests();
        console.log('');
        
        await this.runBrowserTests();
        
        this.calculateTotals();
        this.printSummary();
        
        return this.totalFailed === 0;
    }
}

// CLI execution
const runner = new UnifiedGatingRunner();
runner.run().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('❌ Unified runner error:', error);
    process.exit(1);
});

export default UnifiedGatingRunner;
