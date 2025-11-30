import serverlessExpress from '@vendia/serverless-express';
import express from 'express';
import { createApp } from './apps/backend/app.js';

let serverlessExpressInstance;

export const handler = async (event, context) => {
  if (!serverlessExpressInstance) {
    // Create the backend HTTP server
    const backendServer = await createApp();
    
    // Extract the request handler from the HTTP server
    const requestHandler = backendServer.listeners('request')[0];
    
    // Create Express app wrapper
    const app = express();
    
    // Use the backend request handler for all routes
    app.use((req, res) => {
      requestHandler(req, res);
    });
    
    serverlessExpressInstance = serverlessExpress({ app });
  }
  
  return serverlessExpressInstance(event, context);
};
