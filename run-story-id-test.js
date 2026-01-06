import { testStoryIdDisplay } from './test-story-id-display.js';

testStoryIdDisplay().then(result => {
  console.log('Test Result:', JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
});
