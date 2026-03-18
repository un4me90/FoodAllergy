import { getVapidPublicKey, subscribePush, unsubscribePush } from './api';
import { getSchool, getAllergens, getPushSubscription, setPushSubscription } from './storage';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export function isPushSubscriptionSupported(): boolean {
  return isNotificationSupported() && 'PushManager' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

export function hasStoredSubscription(): boolean {
  return getPushSubscription() !== null;
}

async function saveSubscription(subscription: PushSubscriptionJSON): Promise<void> {
  const school = getSchool();
  if (!school) {
    throw new Error('school-not-configured');
  }

  await subscribePush({
    subscription,
    schoolCode: school.schoolCode,
    regionCode: school.regionCode,
    allergens: getAllergens(),
  });

  setPushSubscription(subscription);
}

export async function requestAndSubscribe(): Promise<{ success: boolean; message: string }> {
  if (!isNotificationSupported()) {
    return { success: false, message: '이 브라우저는 알림 기능을 지원하지 않습니다.' };
  }

  if (!isPushSubscriptionSupported()) {
    return { success: false, message: '이 브라우저 환경에서는 푸시 알림을 사용할 수 없습니다.' };
  }

  const school = getSchool();
  if (!school) {
    return { success: false, message: '학교 정보가 없습니다. 먼저 설정을 완료해 주세요.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { success: false, message: '알림 권한이 허용되지 않았습니다.' };
  }

  let vapidKey: string;
  try {
    vapidKey = await getVapidPublicKey();
  } catch {
    return { success: false, message: '서버에서 VAPID 키를 가져오지 못했습니다.' };
  }

  if (!vapidKey) {
    return { success: false, message: '서버에 VAPID 키가 설정되어 있지 않습니다.' };
  }

  const registration = await navigator.serviceWorker.ready;

  let subscription: PushSubscription;
  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
    });
  } catch {
    return { success: false, message: '푸시 구독 생성에 실패했습니다.' };
  }

  try {
    await saveSubscription(subscription.toJSON());
  } catch {
    return { success: false, message: '서버에 구독 정보를 저장하지 못했습니다.' };
  }

  return { success: true, message: '알림이 설정되었습니다.' };
}

export async function syncSubscriptionPreferences(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const pushSub = 'PushManager' in window
    ? await registration.pushManager.getSubscription()
    : null;
  const subJson = pushSub?.toJSON() || getPushSubscription();

  if (!subJson) return;
  await saveSubscription(subJson);
}

export async function unsubscribe(): Promise<void> {
  const subJson = getPushSubscription();
  const registration = await navigator.serviceWorker.ready;
  const pushSub = 'PushManager' in window
    ? await registration.pushManager.getSubscription()
    : null;

  if (pushSub) {
    await pushSub.unsubscribe();
  }

  if (subJson?.endpoint) {
    try {
      await unsubscribePush(subJson.endpoint);
    } catch {
      // Ignore server-side removal errors.
    }
  }

  setPushSubscription(null);
}

export async function forceResubscribe(): Promise<{ success: boolean; message: string }> {
  // Clear all push subscriptions and unregister all service workers
  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const reg of registrations) {
    const pushSub = await reg.pushManager.getSubscription().catch(() => null);
    if (pushSub) {
      try { await unsubscribePush(pushSub.endpoint); } catch { /* ignore */ }
      await pushSub.unsubscribe().catch(() => null);
    }
    await reg.unregister();
  }
  setPushSubscription(null);

  // Re-register sw.js and wait until it is fully active
  await navigator.serviceWorker.register('/sw.js');
  const activeReg = await waitForActiveSW();
  if (!activeReg) {
    return { success: false, message: '서비스 워커 활성화에 실패했습니다. 앱을 새로고침 후 다시 시도해주세요.' };
  }

  // Get VAPID key
  let vapidKey: string;
  try {
    vapidKey = await getVapidPublicKey();
  } catch {
    return { success: false, message: 'VAPID 키를 가져오지 못했습니다.' };
  }

  // Subscribe using the active registration
  let subscription: PushSubscription;
  try {
    subscription = await activeReg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
    });
  } catch (err: any) {
    return { success: false, message: `푸시 구독 실패: ${err?.message || '알림 권한을 확인해주세요.'}` };
  }

  try {
    await saveSubscription(subscription.toJSON());
  } catch (err: any) {
    return { success: false, message: `서버 저장 실패: ${err?.message}` };
  }

  return { success: true, message: '알림 구독이 초기화되었습니다. 테스트 알림을 눌러 확인해보세요.' };
}

function waitForActiveSW(timeoutMs = 10000): Promise<ServiceWorkerRegistration | null> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(null), timeoutMs);

    function check() {
      navigator.serviceWorker.ready.then(reg => {
        clearTimeout(timer);
        resolve(reg);
      });
    }

    // Poll until ready
    const interval = setInterval(() => {
      if (navigator.serviceWorker.controller) {
        clearInterval(interval);
        check();
      }
    }, 200);

    // Also try immediately
    check();
  });
}

export async function isSubscribed(): Promise<boolean> {
  if (hasStoredSubscription()) return true;
  if (!isPushSubscriptionSupported()) return false;

  const registration = await navigator.serviceWorker.ready;
  const sub = await registration.pushManager.getSubscription();
  if (sub) {
    setPushSubscription(sub.toJSON());
    return true;
  }

  return false;
}
