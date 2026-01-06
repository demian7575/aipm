// Auto-detect environment based on frontend URL
function detectEnvironment() {
  const hostname = window.location.hostname;
  
  // Environment detection based on URL
  if (hostname.includes('aipm-static-hosting-demo') || hostname.includes('44.220.45.57')) {
    return 'prod';
  } else if (hostname.includes('aipm-dev-frontend-hosting') || hostname.includes('44.222.168.46')) {
    return 'dev';
  } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'local';
  } else {
    return 'prod'; // Default fallback
  }
}

// Environment-specific configuration
const ENVIRONMENTS = {
  prod: {
    API_BASE_URL: '/api',
    KIRO_API_URL: '/kiro-api',
    EC2_TERMINAL_URL: 'ws://44.220.45.57:8080',
    DEBUG: false
  },
  dev: {
    API_BASE_URL: '/api',
    KIRO_API_URL: '/kiro-api', 
    EC2_TERMINAL_URL: 'ws://44.222.168.46:8080',
    DEBUG: true
  },
  local: {
    API_BASE_URL: 'http://localhost:4000/api',
    KIRO_API_URL: 'http://localhost:4100',
    EC2_TERMINAL_URL: 'ws://localhost:8080',
    DEBUG: true
  }
};

// Auto-configure based on detected environment
const environment = detectEnvironment();
const config = ENVIRONMENTS[environment];

window.CONFIG = {
  ...config,
  ENVIRONMENT: environment,
  // Remove all sensitive backend details
  // No database table names, no internal IPs, no AWS regions
};

console.log(`🌍 Auto-detected environment: ${environment}`);
