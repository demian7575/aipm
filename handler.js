import serverlessExpress from '@codegenie/serverless-express';
import { createExpressApp } from './lambda-app.js';

let serverlessExpressInstance;

export const handler = async (event, context) => {
  if (!serverlessExpressInstance) {
    const app = await createExpressApp();
    serverlessExpressInstance = serverlessExpress({ app });
  }
  
  return serverlessExpressInstance(event, context);
};
