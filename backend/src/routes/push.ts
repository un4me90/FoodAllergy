import { Router, Request, Response } from 'express';
import { upsert, deleteByEndpoint, getByEndpoint } from '../db/subscriptions';
import { getVapidPublicKey, sendPush } from '../services/webpush';
import { runDailyNotification, sendNotificationToSub } from '../jobs/scheduler';

const router = Router();
const notificationIcon = '/seokam_logo_transparent_small.png';

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

router.post('/test', async (req: Request, res: Response) => {
  const { endpoint } = req.body;

  try {
    if (endpoint) {
      const sub = await getByEndpoint(endpoint);
      if (!sub) return res.status(404).json({ error: '구독 정보를 찾을 수 없습니다. 알림을 껐다가 다시 켜주세요.' });
      // Send a direct ping (no meal dependency) so we can confirm delivery
      await sendPush(sub, {
        title: '석암초 안전급식 테스트',
        body: '알림이 정상 작동합니다! 🎉',
        icon: notificationIcon,
        badge: notificationIcon,
        data: { url: '/' },
      }, true /* throwOnError */);
    } else {
      await runDailyNotification();
    }
    return res.json({ success: true, message: 'Test notifications sent.' });
  } catch (err: any) {
    console.error('[push] test notification failed:', err);
    return res.status(500).json({ error: err.message || 'Failed to send test notification.' });
  }
});

export default router;
