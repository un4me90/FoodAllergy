import webpush from 'web-push';
import { deleteByEndpoint } from '../db/subscriptions';
import { NotificationPayload, PushSubscriptionRecord } from '../types';

let initialized = false;

export interface SendPushResult {
  status: 'sent' | 'expired' | 'skipped';
}

function initVapid(): void {
  if (initialized) {
    return;
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = 'https://food-allergy-app.onrender.com';

  if (!publicKey || !privateKey) {
    console.warn('[webpush] VAPID keys are not configured.');
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  initialized = true;
}

export async function sendPush(
  record: PushSubscriptionRecord,
  payload: NotificationPayload,
  throwOnError = false
): Promise<SendPushResult> {
  initVapid();

  if (!initialized) {
    console.warn('[webpush] push send skipped because VAPID is not initialized.');
    return { status: 'skipped' };
  }

  const subscription: webpush.PushSubscription = {
    endpoint: record.endpoint,
    keys: {
      p256dh: record.p256dh,
      auth: record.auth,
    },
  };

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log(`[webpush] delivered: ${record.endpoint.slice(0, 50)}...`);
    return { status: 'sent' };
  } catch (err: any) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      console.log(`[webpush] expired subscription removed: ${record.endpoint.slice(0, 50)}...`);
      await deleteByEndpoint(record.endpoint);
      return { status: 'expired' };
    }

    console.error(`[webpush] delivery failed (${err.statusCode}):`, err.message);
    if (throwOnError) {
      throw new Error(`Push delivery failed (HTTP ${err.statusCode}): ${err.body || err.message}`);
    }

    return { status: 'skipped' };
  }
}

export function getVapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY || '';
}
