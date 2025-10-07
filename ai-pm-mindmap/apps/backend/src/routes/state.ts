import { Router } from 'express';
import { store } from '../repositories/state.js';

const router = Router();

router.get('/state', (_req, res) => {
  res.json(store.getState());
});

router.post('/reset', (_req, res) => {
  store.reset();
  res.status(204).send();
});

export { router };
