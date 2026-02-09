// Auto-detect environment from URL
(function() {
  const hostname = window.location.hostname;
  
  // Detect environment
  const isProd = hostname.includes('aipm-static-hosting-demo');
  const isDev = hostname.includes('aipm-dev-frontend-hosting');
  
  // Set config based on environment
  if (isProd) {
    window.CONFIG = {
      API_BASE_URL: 'http://100.53.112.192:4000',
      EC2_TERMINAL_URL: 'ws://100.53.112.192:8080',
      ENVIRONMENT: 'prod'
    };
  } else if (isDev) {
    window.CONFIG = {
      API_BASE_URL: 'http://44.222.168.46:4000',
      EC2_TERMINAL_URL: 'ws://44.222.168.46:8080',
      ENVIRONMENT: 'dev'
    };
  } else {
    // Local development
    window.CONFIG = {
      API_BASE_URL: 'http://localhost:4000',
      EC2_TERMINAL_URL: 'ws://localhost:8080',
      ENVIRONMENT: 'local'
    };
  }
})();
