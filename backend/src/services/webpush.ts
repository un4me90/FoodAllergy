import webpush from 'web-push';
import { NotificationPayload, PushSubscriptionRecord } from '../types';
import { deleteByEndpoint } from '../db/subscriptions';

let initialized = false;

function initVapid(): void {
  if (initialized) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  // Apple APNS requires a valid internet domain in the VAPID subject.
  // .local domains cause BadJwtToken. Use the app's HTTPS URL unconditionally.
  const email = 'https://food-allergy-app.onrender.com';

  if (!publicKey || !privateKey) {
    console.warn('[webpush] VAPID 키가 설정되지 않았습니다. .env 파일을 확인하세요.');
    return;
  }

  webpush.setVapidDetails(email, publicKey, privateKey);
  initialized = true;
}

export async function sendPush(
  record: PushSubscriptionRecord,
  payload: NotificationPayload,
  throwOnError = false
): Promise<void> {
  initVapid();
  if (!initialized) {
    console.warn('[webpush] VAPID 미설정으로 푸시 발송 건너뜀');
    return;
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
    console.log(`[webpush] 발송 성공: ${record.endpoint.slice(0, 50)}...`);
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.log(`[webpush] 만료된 구독 삭제: ${record.endpoint.slice(0, 50)}...`);
      await deleteByEndpoint(record.endpoint);
    } else {
      console.error(`[webpush] 발송 실패 (${err.statusCode}):`, err.message);
    }
    if (throwOnError) throw new Error(`Push 발송 실패 (HTTP ${err.statusCode}): ${err.body || err.message}`);
  }
}

export function getVapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY || '';
}
