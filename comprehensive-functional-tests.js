// Comprehensive Functional Gating Tests
// Tests actual functionality, not just HTTP status

const https = require('https');
const http = require('http');

const PROD_CONFIG = {
  api: 'https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod',
  frontend: 'http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com'
};

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

// Test parent-child story relationships
async function testStoryHierarchy() {
  console.log('\n🧪 Testing Story Hierarchy...');
  
  const result = await fetchUrl(`${PROD_CONFIG.api}/api/stories`);
  
  if (result.status !== 200) {
    return { success: false, message: `API returned ${result.status}` };
  }
  
  const stories = JSON.parse(result.data);
  
  // Validate it's an array
  if (!Array.isArray(stories)) {
    return { success: false, message: 'Stories is not an array' };
  }
  
  // Should have stories
  if (stories.length === 0) {
    return { success: false, message: 'No stories returned' };
  }
  
  // Validate hierarchy structure
  // Root stories are those without parentId OR whose parent doesn't exist in the list
  const storyIds = new Set(stories.map(s => s.id));
  const rootStories = stories.filter(s => 
    !s.parentId || 
    s.parentId === null || 
    !storyIds.has(s.parentId)  // Parent doesn't exist = orphaned = treat as root
  );
  
  const hasChildren = stories.some(s => s.children && s.children.length > 0);
  
  if (rootStories.length === 0) {
    return { success: false, message: 'No root stories found (all stories have valid parents but form a cycle)' };
  }
  
  // Validate parent-child relationships
  let childCount = 0;
  for (const story of stories) {
    if (story.children && Array.isArray(story.children)) {
      childCount += story.children.length;
      
      // Validate each child
      for (const child of story.children) {
        if (child.parentId !== story.id) {
          return { 
            success: false, 
            message: `Child ${child.id} has wrong parentId (${child.parentId} != ${story.id})` 
          };
        }
      }
    }
  }
  
  return {
    success: true,
    message: `✅ Hierarchy valid: ${rootStories.length} root stories, ${childCount} children`
  };
}

// Test story data structure
async function testStoryStructure() {
  console.log('\n🧪 Testing Story Data Structure...');
  
  const result = await fetchUrl(`${PROD_CONFIG.api}/api/stories`);
  const stories = JSON.parse(result.data);
  
  if (stories.length === 0) {
    return { success: false, message: 'No stories to validate' };
  }
  
  const firstStory = stories[0];
  const requiredFields = ['id', 'title', 'description', 'status'];
  const missingFields = requiredFields.filter(field => !(field in firstStory));
  
  if (missingFields.length > 0) {
    return { 
      success: false, 
      message: `Missing required fields: ${missingFields.join(', ')}` 
    };
  }
  
  // Validate children array exists
  if (!('children' in firstStory)) {
    return { success: false, message: 'Stories missing children array' };
  }
  
  return {
    success: true,
    message: `✅ Story structure valid with all required fields`
  };
}

// Test no circular references
async function testNoCircularReferences() {
  console.log('\n🧪 Testing No Circular References...');
  
  const result = await fetchUrl(`${PROD_CONFIG.api}/api/stories`);
  const stories = JSON.parse(result.data);
  
  function findCircular(story, visited = new Set()) {
    if (visited.has(story.id)) {
      return story.id; // Found circular reference
    }
    
    visited.add(story.id);
    
    if (story.children) {
      for (const child of story.children) {
        const circular = findCircular(child, new Set(visited));
        if (circular) return circular;
      }
    }
    
    return null;
  }
  
  for (const story of stories) {
    const circular = findCircular(story);
    if (circular) {
      return { 
        success: false, 
        message: `Circular reference detected at story ${circular}` 
      };
    }
  }
  
  return {
    success: true,
    message: `✅ No circular references found`
  };
}

// Test config availability and correctness
async function testConfigStructure() {
  console.log('\n🧪 Testing Config Structure...');
  
  const result = await fetchUrl(`${PROD_CONFIG.frontend}/config.js`);
  
  if (result.status !== 200) {
    return { success: false, message: `Config not accessible: ${result.status}` };
  }
  
  // Check for required properties
  const hasAPIBaseURL = result.data.includes('API_BASE_URL');
  const hasApiEndpoint = result.data.includes('apiEndpoint');
  const hasWindowConfig = result.data.includes('window.CONFIG');
  
  if (!hasWindowConfig) {
    return { success: false, message: 'Config missing window.CONFIG' };
  }
  
  if (!hasAPIBaseURL && !hasApiEndpoint) {
    return { success: false, message: 'Config missing API URL properties' };
  }
  
  return {
    success: true,
    message: `✅ Config structure valid with API properties`
  };
}

// Test data persistence (stories have IDs and timestamps)
async function testDataPersistence() {
  console.log('\n🧪 Testing Data Persistence Indicators...');
  
  const result = await fetchUrl(`${PROD_CONFIG.api}/api/stories`);
  const stories = JSON.parse(result.data);
  
  if (stories.length === 0) {
    return { success: false, message: 'No stories to validate' };
  }
  
  // Check all stories have valid IDs
  const invalidIds = stories.filter(s => !s.id || typeof s.id !== 'number');
  if (invalidIds.length > 0) {
    return { success: false, message: `${invalidIds.length} stories have invalid IDs` };
  }
  
  // Check for timestamps
  const missingTimestamps = stories.filter(s => !s.createdAt && !s.updatedAt);
  if (missingTimestamps.length > 0) {
    return { 
      success: false, 
      message: `${missingTimestamps.length} stories missing timestamps` 
    };
  }
  
  return {
    success: true,
    message: `✅ All stories have valid IDs and timestamps`
  };
}

// Main test runner
async function runComprehensiveFunctionalTests() {
  console.log('🚀 AIPM Comprehensive Functional Gating Tests\n');
  console.log('Testing PRODUCTION Environment');
  console.log(`API: ${PROD_CONFIG.api}`);
  console.log(`Frontend: ${PROD_CONFIG.frontend}`);
  
  const tests = [
    { name: 'Story Hierarchy', fn: testStoryHierarchy },
    { name: 'Story Structure', fn: testStoryStructure },
    { name: 'No Circular References', fn: testNoCircularReferences },
    { name: 'Config Structure', fn: testConfigStructure },
    { name: 'Data Persistence', fn: testDataPersistence }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({ name: test.name, ...result });
      console.log(`   ${result.success ? '✅' : '❌'} ${test.name}: ${result.message}`);
    } catch (error) {
      results.push({ name: test.name, success: false, message: error.message });
      console.log(`   ❌ ${test.name}: Error - ${error.message}`);
    }
  }
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log('\n' + '='.repeat(70));
  console.log('📋 COMPREHENSIVE FUNCTIONAL TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`Results: ${passed}/${total} tests passed`);
  console.log('='.repeat(70));
  
  if (passed === total) {
    console.log('🎉 ALL FUNCTIONAL TESTS PASSING');
    console.log('✅ Story hierarchy validated');
    console.log('✅ Data structure validated');
    console.log('✅ No circular references');
    console.log('✅ Config structure validated');
    console.log('✅ Data persistence validated');
    process.exit(0);
  } else {
    console.log('❌ SOME FUNCTIONAL TESTS FAILING');
    console.log(`⚠️  ${total - passed} test(s) need attention`);
    process.exit(1);
  }
}

runComprehensiveFunctionalTests();
