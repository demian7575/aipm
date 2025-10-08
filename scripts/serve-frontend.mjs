import { createServer } from 'node:http';
import { statSync, createReadStream } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const publicDir = resolve(__dirname, '../apps/frontend/public');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

const server = createServer((req, res) => {
  try {
    let filePath = join(publicDir, req.url.replace(/^\/+/, ''));
    if (req.url === '/' || req.url === '') {
      filePath = join(publicDir, 'index.html');
    }
    const stats = statSync(filePath);
    if (stats.isDirectory()) {
      filePath = join(filePath, 'index.html');
    }
    const ext = extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': types[ext] ?? 'application/octet-stream' });
    createReadStream(filePath).pipe(res);
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

const port = Number(process.env.PORT ?? 5173);
server.listen(port, '0.0.0.0', () => {
  console.log(`Frontend served at http://localhost:${port}`);
});
