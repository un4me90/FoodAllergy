import { apiBaseUrl } from '../config/base';

export interface MealInfo {
  mealType: string;
  mealTypeCode: string;
  date: string;
  dishes: { name: string; allergens: number[] }[];
  calInfo: string;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const e: Error & { code?: string } = new Error(err.error || '요청 실패');
    e.code = err.code;
    throw e;
  }
  return res.json() as Promise<T>;
}

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export async function getMeal(
  regionCode: string,
  schoolCode: string,
  date?: string
): Promise<MealInfo[]> {
  const d = date || getTodayDateString();
  return request<MealInfo[]>(
    `${apiBaseUrl}/meal?regionCode=${regionCode}&schoolCode=${schoolCode}&date=${d}`
  );
}

export async function getVapidPublicKey(): Promise<string> {
  const data = await request<{ publicKey: string }>(`${apiBaseUrl}/push/vapid-public-key`);
  return data.publicKey;
}

export async function subscribePush(payload: {
  subscription: PushSubscriptionJSON;
  schoolCode: string;
  regionCode: string;
  allergens: number[];
}): Promise<void> {
  await request(`${apiBaseUrl}/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function unsubscribePush(endpoint: string): Promise<void> {
  await request(`${apiBaseUrl}/push/subscribe`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  });
}

export async function testPush(endpoint?: string): Promise<void> {
  await request(`${apiBaseUrl}/push/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(endpoint ? { endpoint } : {}),
  });
}
