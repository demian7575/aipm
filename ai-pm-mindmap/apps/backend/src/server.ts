import { createServer } from 'node:http';
import { createApp } from './app';
import { PORT } from './config';

const app = createApp();
const server = createServer(app);

server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
