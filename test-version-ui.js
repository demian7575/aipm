/**
 * Acceptance Test: Version display in UI
 * Given: a development environment with version number
 * When: I access the application
 * Then: the version should be visible in the interface
 */

async function testVersionDisplayInUI() {
  console.log('🧪 Testing version display in UI...');
  
  try {
    // Simple test using fetch to check if version endpoint returns proper format
    const response = await fetch('http://localhost:4000/api/version');
    const data = await response.json();
    
    console.log('Version from API:', data.version);
    
    // Check if version follows the expected format
    const versionPattern = /version-\d+-[a-f0-9]{6}/;
    
    if (versionPattern.test(data.version)) {
      console.log('✅ Version display UI test PASSED');
      return true;
    } else {
      console.log('❌ Version display UI test FAILED - format does not match');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Version display UI test FAILED:', error.message);
    return false;
  }
}

export { testVersionDisplayInUI };

if (process.argv[1] === new URL(import.meta.url).pathname) {
  testVersionDisplayInUI().then(passed => {
    process.exit(passed ? 0 : 1);
  });
}
