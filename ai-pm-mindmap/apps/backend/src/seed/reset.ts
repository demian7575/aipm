import { store } from '../repositories/state.js';
import logger from '../utils/logger.js';

store.reset();
logger.info('Seed data has been reset.');
