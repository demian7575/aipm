#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

class SimpleUnifiedGatingRunner {
    constructor() {
        this.results = [];
        this.totalPassed = 0;
        this.totalFailed = 0;
    }

    async runCommand(command, args = []) {
        return new Promise((resolve) => {
            const proc = spawn(command, args, { 
                stdio: 'inherit',
                shell: true
            });
            
            proc.on('close', (code) => {
                resolve(code === 0);
            });
        });
    }

    async runTest(name, command, args, testCount = 1) {
        console.log(`\n🧪 ${name}`);
        console.log('─'.repeat(50));
        
        const success = await this.runCommand(command, args);
        
        if (success) {
            this.totalPassed += testCount;
            console.log(`✅ ${name}: PASSED (${testCount} tests)`);
        } else {
            this.totalFailed += testCount;
            console.log(`❌ ${name}: FAILED (${testCount} tests)`);
        }
        
        this.results.push({ name, success, testCount });
        return success;
    }

    printSummary() {
        console.log('\n' + '='.repeat(70));
        console.log('📊 UNIFIED GATING TEST SUMMARY');
        console.log('='.repeat(70));
        
        for (const result of this.results) {
            const status = result.success ? '✅ PASS' : '❌ FAIL';
            console.log(`${result.name.padEnd(30)}: ${status} (${result.testCount} tests)`);
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
        console.log('Running ALL test systems with correct counts\n');
        
        // 1. Comprehensive Environment Tests (15 tests: 8 prod + 7 dev)
        await this.runTest(
            'Environment Tests',
            'node',
            ['scripts/testing/run-comprehensive-gating-tests.cjs'],
            15
        );
        
        // 2. Deployment Config Tests (12 tests)
        await this.runTest(
            'Deployment Config Tests',
            'bash',
            ['scripts/testing/test-deployment-config-gating.sh'],
            12
        );
        
        // 3. Kiro API Tests (10 tests)
        await this.runTest(
            'Kiro API Tests',
            'bash',
            ['scripts/testing/test-kiro-api-gating.sh'],
            10
        );
        
        this.printSummary();
        return this.totalFailed === 0;
    }
}

// CLI execution
const runner = new SimpleUnifiedGatingRunner();
runner.run().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('❌ Unified runner error:', error);
    process.exit(1);
});
