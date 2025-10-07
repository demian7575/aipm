import { Router } from 'express';
import { z } from 'zod';
import {
  AcceptanceTestSchema,
  AcceptanceTestStatusSchema,
} from '@ai-pm-mindmap/shared';
import { store } from '../repositories/state.js';

const router = Router();

const TestCreateSchema = AcceptanceTestSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

router.get('/', (req, res) => {
  const { storyId } = req.query;
  const tests = typeof storyId === 'string' ? store.listTests(storyId) : store.listTests();
  res.json(tests);
});

router.post('/', (req, res, next) => {
  try {
    const payload = TestCreateSchema.parse(req.body);
    const test = store.createTest(payload);
    res.status(201).json(test);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const test = store.getTest(req.params.id);
    if (!test) {
      return res.status(404).json({ code: 'not_found', message: 'Test not found' });
    }
    res.json(test);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const payload = TestCreateSchema.partial().parse(req.body);
    const test = store.updateTest(req.params.id, payload);
    res.json(test);
  } catch (error) {
    next(error);
  }
});

const StatusSchema = z.object({ status: AcceptanceTestStatusSchema });

router.patch('/:id/status', (req, res, next) => {
  try {
    const payload = StatusSchema.parse(req.body);
    const test = store.updateTestStatus(req.params.id, payload.status);
    res.json(test);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    store.deleteTest(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router };
