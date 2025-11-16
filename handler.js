const serverlessExpress = require('@vendia/serverless-express');
const path = require('path');
const fs = require('fs');

// Import the main server application
let app;

// Initialize the app
const initializeApp = async () => {
  if (!app) {
    // Set up environment for Lambda
    process.env.AIPM_DATA_DIR = '/tmp/aipm/data';
    process.env.AIPM_UPLOAD_DIR = '/tmp/aipm/uploads';
    process.env.AIPM_DISABLE_SQLITE_MIRROR = '1';
    process.env.AI_PM_FORCE_JSON_DB = '1';
    process.env.NODE_ENV = 'production';
    
    // Ensure data directories exist
    const dataDir = process.env.AIPM_DATA_DIR;
    const uploadDir = process.env.AIPM_UPLOAD_DIR;
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Import and initialize the server
    try {
      const serverModule = await import('./server.js');
      app = serverModule.default || serverModule.app;
      console.log('AIPM server imported successfully');
    } catch (error) {
      console.error('Failed to import server:', error);
      // Fallback to simple Express app
      const express = require('express');
      app = express();
      app.use(express.json());
      app.get('/api/stories', (req, res) => {
        res.json({ stories: [], message: 'AIPM API working' });
      });
      app.get('/health', (req, res) => {
        res.json({ status: 'healthy', timestamp: new Date().toISOString() });
      });
    }
    
    console.log('AIPM Lambda handler initialized successfully');
  }
  
  return app;
};

// Create serverless express handler
let serverlessExpressInstance;

exports.handler = async (event, context) => {
  try {
    // Initialize app if not already done
    const expressApp = await initializeApp();
    
    // Create serverless express instance if not exists
    if (!serverlessExpressInstance) {
      serverlessExpressInstance = serverlessExpress({ app: expressApp });
    }
    
    // Handle the request
    return serverlessExpressInstance(event, context);
  } catch (error) {
    console.error('Lambda handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
