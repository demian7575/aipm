import { createApp } from './app';
import logger from './utils/logger';

const port = Number(process.env.PORT ?? 3333);
const app = createApp();

app.listen(port, () => {
  logger.info(`Backend listening on port ${port}`);
});
