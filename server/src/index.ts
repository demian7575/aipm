import cors from 'cors';
import express from 'express';
import router from './routes.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', router);

const port = Number(process.env.PORT) || 5174;

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Mock API listening on http://localhost:${port}`);
  });
}

export default app;
