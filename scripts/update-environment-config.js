#!/usr/bin/env node

// Update Environment Configuration
// Automatically updates config files for different environments

const fs = require('fs');
const path = require('path');

const environments = {
  dev: {
    apiBase: 'https://dka9vov9vg.execute-api.us-east-1.amazonaws.com/dev',
    frontend: 'http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com',
    s3Bucket: 'aipm-dev-frontend-hosting'
  },
  prod: {
    apiBase: 'https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod',
    frontend: 'http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com',
    s3Bucket: 'aipm-static-hosting-demo'
  }
};

function updateConfig(environment) {
  const env = environments[environment];
  if (!env) {
    console.error(`Unknown environment: ${environment}`);
    process.exit(1);
  }

  const configContent = `// AIPM Frontend Configuration - ${environment.toUpperCase()} Environment
// Auto-generated configuration
window.__AIPM_API_BASE__ = '${env.apiBase}';

// ${environment.toUpperCase()} API Gateway endpoint`;

  const configPath = path.join(__dirname, '../dist/public/config.js');
  
  // Ensure directory exists
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.writeFileSync(configPath, configContent);
  console.log(`✓ Updated config for ${environment} environment`);
  console.log(`  API: ${env.apiBase}`);
  console.log(`  Frontend: ${env.frontend}`);
}

// Get environment from command line argument
const environment = process.argv[2];
if (!environment) {
  console.error('Usage: node update-environment-config.js <dev|prod>');
  process.exit(1);
}

updateConfig(environment);
