import { Router, Request, Response } from 'express';
import { upsert, deleteByEndpoint } from '../db/subscriptions';
import { getVapidPublicKey } from '../services/webpush';
import { runDailyNotification } from '../jobs/scheduler';

const router = Router();

router.get('/vapid-public-key', (_req: Request, res: Response) => {
  const key = getVapidPublicKey();
  if (!key) {
    return res.status(503).json({ error: 'VAPID key is not configured.' });
  }
  return res.json({ publicKey: key });
});

router.post('/subscribe', async (req: Request, res: Response) => {
  const { subscription, schoolCode, regionCode, allergens } = req.body;

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return res.status(400).json({ error: 'Invalid subscription payload.' });
  }
  if (!schoolCode || !regionCode) {
    return res.status(400).json({ error: 'schoolCode and regionCode are required.' });
  }
  if (!Array.isArray(allergens)) {
    return res.status(400).json({ error: 'allergens must be an array.' });
  }

  try {
    await upsert({
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      schoolCode,
      regionCode,
      allergens,
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('[push] subscribe failed:', err);
    return res.status(500).json({ error: 'Failed to save subscription.' });
  }
});

router.delete('/subscribe', async (req: Request, res: Response) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    return res.status(400).json({ error: 'endpoint is required.' });
  }

  try {
    await deleteByEndpoint(endpoint);
    return res.json({ success: true });
  } catch (err) {
    console.error('[push] unsubscribe failed:', err);
    return res.status(500).json({ error: 'Failed to delete subscription.' });
  }
});

router.post('/test', async (_req: Request, res: Response) => {
  try {
    await runDailyNotification();
    return res.json({ success: true, message: 'Test notifications sent.' });
  } catch (err) {
    console.error('[push] test notification failed:', err);
    return res.status(500).json({ error: 'Failed to send test notification.' });
  }
});

export default router;
