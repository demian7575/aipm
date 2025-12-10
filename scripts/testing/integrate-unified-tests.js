#!/usr/bin/env node

// Integration wrapper for existing test systems
// This allows gradual migration to the unified system

import UnifiedGatingRunner from './unified-gating-runner.js';

async function integrateWithExistingSystem() {
    console.log('🔄 Integrating with existing gating test systems...\n');
    
    const runner = new UnifiedGatingRunner();
    const success = await runner.run();
    
    // Maintain compatibility with existing exit codes
    return success;
}

// CLI execution
integrateWithExistingSystem().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('❌ Integration error:', error);
    process.exit(1);
});

export { integrateWithExistingSystem };
