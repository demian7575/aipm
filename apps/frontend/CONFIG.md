# Frontend Configuration System

## Overview

The AIPM frontend uses environment-specific configuration files to handle different deployment environments (development and production).

## Configuration Files

- `config.dev.js` - Development environment configuration
- `config.prod.js` - Production environment configuration  
- `config.js` - Active configuration (copied from environment-specific file during deployment)

## Configuration Properties

| Property | Description | Example |
|----------|-------------|---------|
| `API_BASE_URL` | Base URL for API calls | `http://44.220.45.57` |
| `API_END_POINT` | API endpoint URL (same as API_BASE_URL) | `http://44.220.45.57` |
| `EC2_TERMINAL_URL` | WebSocket URL for terminal access | `ws://44.220.45.57:8080` |
| `ENVIRONMENT` | Current environment | `prod` or `dev` |
| `stage` | Deployment stage | `prod` or `dev` |
| `region` | AWS region | `us-east-1` |
| `storiesTable` | DynamoDB stories table name | `aipm-backend-prod-stories` |
| `acceptanceTestsTable` | DynamoDB acceptance tests table name | `aipm-backend-prod-acceptance-tests` |
| `DEBUG` | Enable debug logging | `true` or `false` |

## Environment-Specific Values

### Production (`config.prod.js`)
```javascript
window.CONFIG = {
  API_BASE_URL: 'http://44.220.45.57',
  API_END_POINT: 'http://44.220.45.57',
  EC2_TERMINAL_URL: 'ws://44.220.45.57:8080',
  ENVIRONMENT: 'prod',
  stage: 'prod',
  region: 'us-east-1',
  storiesTable: 'aipm-backend-prod-stories',
  acceptanceTestsTable: 'aipm-backend-prod-acceptance-tests',
  DEBUG: false
};
```

### Development (`config.dev.js`)
```javascript
window.CONFIG = {
  API_BASE_URL: 'http://44.222.168.46',
  API_END_POINT: 'http://44.222.168.46',
  EC2_TERMINAL_URL: 'ws://44.222.168.46:8080',
  ENVIRONMENT: 'dev',
  stage: 'dev',
  region: 'us-east-1',
  storiesTable: 'aipm-backend-dev-stories',
  acceptanceTestsTable: 'aipm-backend-dev-acceptance-tests',
  DEBUG: true
};
```

## Deployment Process

During deployment, the `deploy-to-environment.sh` script:

1. Determines the target environment (`prod` or `dev`)
2. Copies the appropriate config file to `config.js`
3. Deploys the frontend with the correct configuration

```bash
# For production deployment
./scripts/deploy-to-environment.sh prod
# Copies config.prod.js → config.js

# For development deployment  
./scripts/deploy-to-environment.sh dev
# Copies config.dev.js → config.js
```

## Usage in Frontend Code

Access configuration values through the global `window.CONFIG` object:

```javascript
// Get API base URL
const apiUrl = window.CONFIG.API_BASE_URL;

// Check if in debug mode
if (window.CONFIG.DEBUG) {
  console.log('Debug mode enabled');
}

// Get environment
const env = window.CONFIG.ENVIRONMENT;
```

## Adding New Configuration

To add a new configuration property:

1. Add the property to both `config.dev.js` and `config.prod.js`
2. Set appropriate values for each environment
3. Use the property in your frontend code via `window.CONFIG`

## Best Practices

- Never commit sensitive data (tokens, passwords) to config files
- Use environment variables on the backend for secrets
- Keep config files in sync (same properties, different values)
- Test configuration changes in development before production
- Document new configuration properties in this README
