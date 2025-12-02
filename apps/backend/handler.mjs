import serverlessExpress from '@vendia/serverless-express';
import express from 'express';
import { createApp } from './app.js';

let serverlessExpressInstance;

export const handler = async (event, context) => {
  if (!serverlessExpressInstance) {
    const backendServer = await createApp();
    const requestHandler = backendServer.listeners('request')[0];
    const app = express();
    app.use((req, res) => {
      requestHandler(req, res);
    });
    serverlessExpressInstance = serverlessExpress({ app });
  }
  return serverlessExpressInstance(event, context);
};
