#!/usr/bin/env node

// PR #999 Test Runner
import { TestManager } from './pr999-implementation.js';

async function main() {
  const manager = new TestManager();

  // Add sample tests
  manager.addTest('basic-functionality', () => {
    if (1 + 1 !== 2) throw new Error('Math failed');
  });

  manager.addTest('string-operations', () => {
    if ('test'.toUpperCase() !== 'TEST') throw new Error('String ops failed');
  });

  manager.addTest('async-operation', async () => {
    await new Promise(resolve => setTimeout(resolve, 10));
    return true;
  });

  console.log('🚀 Running PR #999 tests...\n');
  
  const results = await manager.runAll();
  const report = manager.getReport();

  console.log(`📊 Results: ${report.passed}/${report.total} tests passed`);
  
  if (report.failed > 0) {
    console.log('\n❌ Failed tests:');
    report.results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }

  process.exit(report.failed === 0 ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
