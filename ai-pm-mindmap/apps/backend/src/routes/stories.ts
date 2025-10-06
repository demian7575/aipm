import { Router } from 'express';
import { z } from 'zod';
import {
  UserStorySchema,
  UserStoryStatusSchema,
} from '@ai-pm-mindmap/shared';
import { store } from '../repositories/state';

const router = Router();

const StoryCreateSchema = UserStorySchema.omit({
  id: true,
  order: true,
  depth: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  parentId: z.string().uuid().nullable().optional(),
  estimateDays: z.number().positive().max(30).nullable().optional(),
});

const respondWithStory = (res: any, storyId: string, statusCode = 200) => {
  const story = store.getStory(storyId);
  if (!story) {
    return res.status(404).json({ code: 'not_found', message: 'Story not found' });
  }
  const analysis = store.getStoryAnalysis(storyId);
  return res.status(statusCode).json({ story, analysis });
};

router.get('/', (req, res) => {
  const { mrId } = req.query;
  const stories = typeof mrId === 'string' ? store.listStories(mrId) : store.listStories();
  res.json(stories);
});

router.post('/', (req, res, next) => {
  try {
    const payload = StoryCreateSchema.parse(req.body);
    const story = store.createStory({
      ...payload,
      parentId: payload.parentId ?? null,
      estimateDays: payload.estimateDays ?? null,
    });
    respondWithStory(res, story.id, 201);
  } catch (error) {
    next(error);
  }
});

router.get('/tree', (req, res, next) => {
  try {
    const mrId = z.string().uuid().parse(req.query.mrId);
    const tree = store.getTree(mrId);
    res.json(tree);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/path', (req, res, next) => {
  try {
    const path = store.getStoryPath(req.params.id);
    res.json(path);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    respondWithStory(res, req.params.id);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const payload = StoryCreateSchema.partial().parse(req.body);
    const story = store.updateStory(req.params.id, payload);
    respondWithStory(res, story.id);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    store.deleteStory(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

const StatusSchema = z.object({ status: UserStoryStatusSchema });

router.patch('/:id/status', (req, res, next) => {
  try {
    const payload = StatusSchema.parse(req.body);
    const story = store.updateStoryStatus(req.params.id, payload.status);
    respondWithStory(res, story.id);
  } catch (error) {
    next(error);
  }
});

const MoveSchema = z.object({
  parentId: z.string().uuid().nullable(),
  index: z.number().int().nonnegative(),
});

router.patch('/:id/move', (req, res, next) => {
  try {
    const payload = MoveSchema.parse(req.body);
    store.moveStory(req.params.id, payload.parentId, payload.index);
    respondWithStory(res, req.params.id);
  } catch (error) {
    next(error);
  }
});

const ReorderSchema = z.object({ order: z.array(z.string().uuid()) });

router.patch('/:id/reorder', (req, res, next) => {
  try {
    const payload = ReorderSchema.parse(req.body);
    const story = store.getStory(req.params.id);
    if (!story) {
      return res.status(404).json({ code: 'not_found', message: 'Story not found' });
    }
    store.reorderStoryChildren(story.parentId, payload.order);
    respondWithStory(res, req.params.id);
  } catch (error) {
    next(error);
  }
});

export { router };
