import serverlessExpress from '@vendia/serverless-express';
import { createExpressApp } from './lambda-app.js';

let serverlessExpressInstance;

async function setup(event, context) {
  const app = await createExpressApp();
  serverlessExpressInstance = serverlessExpress({ app });
  return serverlessExpressInstance(event, context);
}

export const handler = async (event, context) => {
  if (serverlessExpressInstance) {
    return serverlessExpressInstance(event, context);
  }
  
  return setup(event, context);
};
