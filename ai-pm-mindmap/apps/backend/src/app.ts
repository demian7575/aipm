import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import { router as mergeRequestRouter } from './routes/mergeRequests';
import { router as storyRouter } from './routes/stories';
import { router as testRouter } from './routes/tests';
import { router as stateRouter } from './routes/state';
import { router as docsRouter } from './routes/docs';
import logger from './utils/logger';

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
