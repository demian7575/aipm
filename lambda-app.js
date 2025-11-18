import express from 'express';
import { createApp } from './apps/backend/app.js';

export async function createExpressApp() {
  const app = express();
  
  // Create the original AIPM app
  const aipmApp = await createApp();
  
  // Extract the request handler from the AIPM server
  const requestHandler = aipmApp.listeners('request')[0];
  
  // Use the AIPM request handler for all routes
  app.use('/', (req, res) => {
    requestHandler(req, res);
  });
  
  return app;
}
