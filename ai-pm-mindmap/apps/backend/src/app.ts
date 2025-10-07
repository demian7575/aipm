import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { ZodError } from 'zod';
import { requestIdMiddleware } from './middleware/requestId';
import { httpLogger } from './logger';
import { store } from './repositories/inMemoryStore';
import {
  AcceptanceTestSchema,
  MergeRequestSchema,
  UserStorySchema,
  buildOpenApiDocument
} from '@ai-pm-mindmap/shared';
import { ApiError, badRequest } from './errors';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use(httpLogger);

  const openapi = buildOpenApiDocument();
  app.get('/api/openapi.json', (_req, res) => {
    res.json(openapi);
  });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));

  // Merge Requests
  app.get('/api/merge-requests', (_req, res) => {
    res.json(store.listMergeRequests());
  });

  app.post('/api/merge-requests', (req, res, next) => {
    try {
      const payload = MergeRequestSchema.omit({ id: true, createdAt: true, updatedAt: true, drift: true, lastSyncAt: true }).parse(req.body);
      const result = store.createMergeRequest(payload as any);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/merge-requests/:id', (req, res, next) => {
    try {
      res.json(store.getMergeRequest(req.params.id));
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/merge-requests/:id', (req, res, next) => {
    try {
      const payload = MergeRequestSchema.partial().parse(req.body);
      res.json(store.updateMergeRequest(req.params.id, payload));
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/merge-requests/:id', (req, res, next) => {
    try {
      store.deleteMergeRequest(req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/merge-requests/:id/status', (req, res, next) => {
    try {
      const { status } = MergeRequestSchema.pick({ status: true }).parse(req.body);
      res.json(store.updateMergeRequestStatus(req.params.id, status));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/merge-requests/:id/update-branch', (req, res, next) => {
    try {
      res.json(store.toggleDrift(req.params.id));
    } catch (error) {
      next(error);
    }
  });

  // Stories
  app.get('/api/stories', (_req, res) => {
    res.json(store.listStories());
  });

  app.post('/api/stories', (req, res, next) => {
    try {
      const payload = UserStorySchema.omit({ id: true, depth: true, order: true, createdAt: true, updatedAt: true }).parse(req.body);
      res.status(201).json(store.createStory(payload as any));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/stories/:id', (req, res, next) => {
    try {
      res.json(store.getStory(req.params.id));
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/stories/:id', (req, res, next) => {
    try {
      const payload = UserStorySchema.partial().parse(req.body);
      res.json(store.updateStory(req.params.id, payload));
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/stories/:id', (req, res, next) => {
    try {
      store.deleteStory(req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/stories/:id/status', (req, res, next) => {
    try {
      const { status } = UserStorySchema.pick({ status: true }).parse(req.body);
      res.json(store.updateStoryStatus(req.params.id, status));
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/stories/:id/move', (req, res, next) => {
    try {
      const { parentId = null, index } = req.body as { parentId?: string | null; index: number };
      if (typeof index !== 'number') {
        throw badRequest('index is required');
      }
      res.json(store.moveStory(req.params.id, parentId ?? null, index));
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/stories/:id/reorder', (req, res, next) => {
    try {
      const { order } = req.body as { order: string[] };
      if (!Array.isArray(order)) {
        throw badRequest('order must be an array of story ids');
      }
      store.reorderChildren(req.params.id === 'root' ? null : req.params.id, order);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/stories/tree', (req, res, next) => {
    try {
      const { mrId } = req.query;
      if (!mrId || typeof mrId !== 'string') {
        throw badRequest('mrId is required');
      }
      res.json(store.getStoryTree(mrId));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/stories/:id/path', (req, res, next) => {
    try {
      res.json(store.getStoryPath(req.params.id));
    } catch (error) {
      next(error);
    }
  });

  // Tests
  app.get('/api/tests', (_req, res) => {
    res.json(store.listTests());
  });

  app.post('/api/tests', (req, res, next) => {
    try {
      const payload = AcceptanceTestSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse(req.body);
      res.status(201).json(store.createTest(payload as any));
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/tests/:id', (req, res, next) => {
    try {
      const payload = AcceptanceTestSchema.partial().parse(req.body);
      res.json(store.updateTest(req.params.id, payload));
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/tests/:id/status', (req, res, next) => {
    try {
      const { status } = AcceptanceTestSchema.pick({ status: true }).parse(req.body);
      res.json(store.updateTestStatus(req.params.id, status));
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/tests/:id', (req, res, next) => {
    try {
      store.deleteTest(req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // Meta
  app.post('/api/reset', (_req, res) => {
    store.reset();
    res.status(204).end();
  });

  app.get('/api/state', (_req, res) => {
    res.json(store.getState());
  });

  // Error handler
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ApiError) {
      res.status(err.status).json(err.toJSON());
      return;
    }
    if (err instanceof ZodError) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: err.flatten()
      });
      return;
    }
    if (err && typeof err === 'object' && 'status' in err) {
      const status = Number((err as any).status) || 500;
      res.status(status).json({ code: 'ERROR', message: (err as any).message ?? 'Error' });
      return;
    }
    res.status(500).json({ code: 'ERROR', message: err instanceof Error ? err.message : 'Error' });
  });

  return app;
}
