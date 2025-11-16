import { mkdir } from 'node:fs/promises';
import serverlessExpress from '@vendia/serverless-express';

// Setup directories
await mkdir('/tmp/aipm/data', { recursive: true });
await mkdir('/tmp/aipm/uploads', { recursive: true });

// Import the app
const { createApp } = await import('./apps/backend/app.js');
const app = await createApp();

export const handler = serverlessExpress({ app });
