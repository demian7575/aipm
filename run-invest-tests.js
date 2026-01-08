import { runInvestDisplayTests } from './test-invest-display.js';

runInvestDisplayTests()
  .then(result => {
    console.log('Test result:', result);
    process.exit(result ? 0 : 1);
  })
  .catch(err => {
    console.error('Test error:', err);
    process.exit(1);
  });
