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
  
  window.CONFIG = {
    API_BASE_URL: API_GATEWAY_URL,
    SEMANTIC_API_URL: API_GATEWAY_URL,
    ENVIRONMENT: environment
  };
  
  console.log('✅ Config loaded:', window.CONFIG.ENVIRONMENT);
})();
