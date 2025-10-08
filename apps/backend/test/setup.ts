import { beforeAll } from 'vitest';
import { store } from '../src/store.js';

beforeAll(() => {
  store.seed();
});
