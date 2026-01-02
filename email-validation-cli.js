#!/usr/bin/env node

/**
 * Email Validation CLI Tool
 * Command-line interface for testing email validation
 */

import { EnhancedEmailValidator } from './apps/backend/utils/enhancedEmailValidation.js';

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node email-validation-cli.js <email> [options]');
    console.log('Options:');
    console.log('  --suggest    Show domain suggestions');
    console.log('  --no-disposable    Block disposable emails');
    console.log('  --batch      Validate multiple emails (comma-separated)');
    process.exit(1);
  }

  const validator = new EnhancedEmailValidator();
  const options = {
    suggestCorrections: args.includes('--suggest'),
    blockDisposable: args.includes('--no-disposable')
  };

  const emailInput = args[0];

  try {
    if (args.includes('--batch')) {
      const emails = emailInput.split(',').map(e => e.trim());
      const result = validator.validateBatch(emails, options);
      
      console.log(`📊 Batch Validation Results:`);
      console.log(`Total: ${result.total}, Valid: ${result.valid}, Invalid: ${result.invalid}`);
      
      if (result.valid > 0) {
        console.log('\n✅ Valid emails:');
        result.validEmails.forEach(email => console.log(`  - ${email}`));
      }
      
      if (result.invalid > 0) {
        console.log('\n❌ Invalid emails:');
        result.errors.forEach(error => console.log(`  - ${error}`));
      }
    } else {
      const result = validator.validateEnhanced(emailInput, options);
      
      if (result.valid) {
        console.log(`✅ Valid email: ${result.email}`);
        console.log(`📧 Domain: ${result.domain}`);
        console.log(`🏢 Common domain: ${result.isCommonDomain ? 'Yes' : 'No'}`);
        console.log(`🗑️ Disposable: ${result.isDisposable ? 'Yes' : 'No'}`);
        
        if (result.suggestions && result.suggestions.length > 0) {
          console.log(`💡 Suggestions: ${result.suggestions.join(', ')}`);
        }
      } else {
        console.log(`❌ Invalid email: ${result.error}`);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error(`❌ Validation failed: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
