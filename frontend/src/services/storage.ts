export interface SchoolInfo {
  name: string;
  type: string;
  district: string;
  regionCode: string;
  schoolCode: string;
}

const KEYS = {
  SCHOOL: 'fa_school',
  ALLERGENS: 'fa_allergens',
  PUSH_SUBSCRIPTION: 'fa_push_sub',
};

export function getSchool(): SchoolInfo | null {
  const raw = localStorage.getItem(KEYS.SCHOOL);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSchool(school: SchoolInfo): void {
  localStorage.setItem(KEYS.SCHOOL, JSON.stringify(school));
}

export function getAllergens(): number[] {
  const raw = localStorage.getItem(KEYS.ALLERGENS);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function setAllergens(allergens: number[]): void {
  localStorage.setItem(KEYS.ALLERGENS, JSON.stringify(allergens));
}

export function hasCompletedSetup(): boolean {
  return getSchool() !== null;
}

export function getPushSubscription(): PushSubscriptionJSON | null {
  const raw = localStorage.getItem(KEYS.PUSH_SUBSCRIPTION);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setPushSubscription(sub: PushSubscriptionJSON | null): void {
  if (sub === null) {
    localStorage.removeItem(KEYS.PUSH_SUBSCRIPTION);
  } else {
    localStorage.setItem(KEYS.PUSH_SUBSCRIPTION, JSON.stringify(sub));
  }
}

export function clearSetup(): void {
  localStorage.removeItem(KEYS.SCHOOL);
  localStorage.removeItem(KEYS.ALLERGENS);
  localStorage.removeItem(KEYS.PUSH_SUBSCRIPTION);
}
