import { Router } from 'express';
import {
  MergeRequestSchema,
  MergeRequestStatusSchema,
  MergeRequest,
} from '@ai-pm-mindmap/shared';
import { store } from '../repositories/state';
import { z } from 'zod';

const router = Router();

const CreateMergeRequestSchema = MergeRequestSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  lastSyncAt: true,
});

router.get('/', (_req, res) => {
  res.json(store.listMergeRequests());
});

router.post('/', (req, res, next) => {
  try {
    const payload = CreateMergeRequestSchema.parse(req.body);
    const createPayload: Omit<MergeRequest, 'id' | 'createdAt' | 'updatedAt'> = {
      title: payload.title,
      description: payload.description,
      repository: payload.repository,
      branch: payload.branch,
      status: payload.status ?? 'open',
      drifted: payload.drifted ?? false,
      lastSyncAt: payload.lastSyncAt ?? null,
    };
    const mergeRequest = store.createMergeRequest(createPayload);
    res.status(201).json(mergeRequest);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const mergeRequest = store.getMergeRequest(req.params.id);
    if (!mergeRequest) {
      return res.status(404).json({ code: 'not_found', message: 'Merge request not found' });
    }
    res.json(mergeRequest);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const payload = CreateMergeRequestSchema.partial().parse(req.body);
    const mergeRequest = store.updateMergeRequest(req.params.id, payload as Partial<MergeRequest>);
    res.json(mergeRequest);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    store.deleteMergeRequest(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

const StatusSchema = z.object({ status: MergeRequestStatusSchema });

router.patch('/:id/status', (req, res, next) => {
  try {
    const payload = StatusSchema.parse(req.body);
    const mergeRequest = store.updateMergeRequestStatus(req.params.id, payload.status);
    res.json(mergeRequest);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/update-branch', (req, res, next) => {
  try {
    const mergeRequest = store.toggleMergeRequestDrift(req.params.id);
    res.json({ ...mergeRequest, lastSyncAt: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

export { router };
