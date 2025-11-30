const serverlessExpress = require('@vendia/serverless-express');

let app;

// Import the full backend app
async function createApp() {
  // Use dynamic import for ES modules
  const { createExpressApp } = await import('./lambda-app.js');
  return await createExpressApp();
}

exports.handler = async (event, context) => {
  if (!app) {
    app = await createApp();
  }
  
  const serverlessExpressInstance = serverlessExpress({ app });
  return serverlessExpressInstance(event, context);
};
