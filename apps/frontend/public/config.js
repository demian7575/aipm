// API Gateway Proxy - no hardcoded IPs needed
(function() {
  const hostname = window.location.hostname;
  
  // Detect environment
  const isProd = hostname.includes('aipm-static-hosting-demo');
  const isDev = hostname.includes('aipm-dev-frontend-hosting');
  
  let environment = 'local';
  if (isProd) environment = 'prod';
  if (isDev) environment = 'dev';
  
  // Use API Gateway proxy for all environments
  const API_GATEWAY_URL = 'https://kx0u99e7o0.execute-api.us-east-1.amazonaws.com';
  
  // EC2 direct access for SSE (Server-Sent Events don't work through Lambda)
  // This will be auto-updated by deployment script
  const EC2_DIRECT_URL = 'http://54.234.135.146:4000';
  
  window.CONFIG = {
    API_BASE_URL: API_GATEWAY_URL,
    SEMANTIC_API_URL: API_GATEWAY_URL,
    EC2_DIRECT_URL: EC2_DIRECT_URL,
    ENVIRONMENT: environment
  };
  
  console.log('✅ Config loaded:', window.CONFIG.ENVIRONMENT);
})();
