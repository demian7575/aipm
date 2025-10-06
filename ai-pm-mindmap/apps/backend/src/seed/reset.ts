import { store } from '../repositories/state';
import logger from '../utils/logger';

store.reset();
logger.info('Seed data has been reset.');
