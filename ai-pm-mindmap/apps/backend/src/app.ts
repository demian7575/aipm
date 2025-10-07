import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import { router as mergeRequestRouter } from './routes/mergeRequests.js';
import { router as storyRouter } from './routes/stories.js';
import { router as testRouter } from './routes/tests.js';
import { router as stateRouter } from './routes/state.js';
import { router as docsRouter } from './routes/docs.js';
import logger from './utils/logger.js';

export const createApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(
    pinoHttp({
      logger,
      genReqId: () => randomUUID(),
    }),
  );

  app.use('/api/merge-requests', mergeRequestRouter);
  app.use('/api/stories', storyRouter);
  app.use('/api/tests', testRouter);
  app.use('/api', stateRouter);
  app.use('/api', docsRouter);

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err.status ?? 400;
    const error = {
      code: err.code ?? 'bad_request',
      message: err.message ?? 'Unexpected error',
      details: err.details,
    };
    res.status(status).json(error);
  });

  return app;
};
