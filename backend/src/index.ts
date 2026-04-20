import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import mealRouter from './routes/meal';
import pushRouter from './routes/push';
import { startScheduler } from './jobs/scheduler';
import { initializeDatabase, isDatabaseReady } from './db/client';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const DB_RETRY_DELAY_MS = 5000;
let schedulerStarted = false;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, databaseReady: isDatabaseReady() });
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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function connectDatabaseInBackground(): Promise<void> {
  while (true) {
    try {
      await initializeDatabase();
      if (!schedulerStarted) {
        startScheduler();
        schedulerStarted = true;
      }
      console.log('[server] database initialized successfully');
      return;
    } catch (err) {
      console.error('[server] database initialization failed, retrying:', err);
      await sleep(DB_RETRY_DELAY_MS);
    }
  }
}

function start(): void {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] started: http://localhost:${PORT}`);
    console.log(`[server] API: http://localhost:${PORT}/api`);
    void connectDatabaseInBackground();
  });
}

start();
