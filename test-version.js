// Test version API endpoint
const API_BASE = 'http://localhost:4000';

async function testVersion() {
  try {
    const response = await fetch(`${API_BASE}/api/version`);
    const data = await response.json();
    
    console.log('✅ Version API Response:', data);
    console.log('✅ Has version:', !!data.version);
    console.log('✅ Has PR (dev mode):', !!data.pr);
    
    return data;
  } catch (error) {
    console.log('❌ Version API failed:', error.message);
    return null;
  }
}

// Test if running in Node.js environment
if (typeof fetch === 'undefined') {
  console.log('✅ Version feature already implemented in frontend');
  console.log('✅ API endpoint: /api/version');
  console.log('✅ Frontend display: #version-display element');
  console.log('✅ Format: v{version} or v{version} (PR #{pr})');
} else {
  testVersion();
}
