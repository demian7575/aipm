import { createApp } from './app.js';
import logger from './utils/logger.js';

const port = Number(process.env.PORT ?? 3333);
const app = createApp();

app.listen(port, () => {
  logger.info(`Backend listening on port ${port}`);
});
