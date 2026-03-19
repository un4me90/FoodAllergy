import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import mealRouter from './routes/meal';
import pushRouter from './routes/push';
import { startScheduler } from './jobs/scheduler';
import { initializeDatabase } from './db/client';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/meal', mealRouter);
app.use('/api/push', pushRouter);

const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist, { maxAge: 0 }));

app.get('*', (req, res) => {
  if (req.path.startsWith('/assets/') || req.path.includes('.')) {
    return res.status(404).send('Not found');
  }
  return res.sendFile(path.join(frontendDist, 'index.html'));
});

async function start(): Promise<void> {
  await initializeDatabase();
  startScheduler();

  app.listen(PORT, () => {
    console.log(`[server] started: http://localhost:${PORT}`);
    console.log(`[server] API: http://localhost:${PORT}/api`);
  });
}

void start().catch(err => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
