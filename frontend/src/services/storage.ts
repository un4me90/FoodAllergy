export interface SchoolInfo {
  name: string;
  type: string;
  district: string;
  regionCode: string;
  schoolCode: string;
}

export interface ChildProfile {
  id: string;
  name: string;
  allergens: number[];
}

const KEYS = {
  SCHOOL: 'fa_school',
  ALLERGENS: 'fa_allergens',
  CHILDREN: 'fa_children',
  PUSH_ENABLED: 'fa_push_enabled',
  PUSH_SUBSCRIPTION: 'fa_push_sub',
};

function normalizeChild(raw: unknown, index: number): ChildProfile | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as Partial<ChildProfile>;
  const allergens = Array.isArray(candidate.allergens)
    ? candidate.allergens
        .map(code => Number(code))
        .filter(code => Number.isInteger(code) && code > 0)
    : [];

  return {
    id: typeof candidate.id === 'string' && candidate.id
      ? candidate.id
      : `child-${index + 1}`,
    name: typeof candidate.name === 'string' ? candidate.name : '',
    allergens,
  };
}

function uniqueSortedAllergens(allergens: number[]): number[] {
  return [...new Set(allergens)].sort((a, b) => a - b);
}

function readLegacyAllergens(): number[] {
  const raw = localStorage.getItem(KEYS.ALLERGENS);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return uniqueSortedAllergens(
      parsed.map(code => Number(code)).filter(code => Number.isInteger(code) && code > 0)
    );
  } catch {
    return [];
  }
}

function createDefaultChild(allergens: number[] = []): ChildProfile {
  return {
    id: `child-${Date.now()}`,
    name: '',
    allergens: uniqueSortedAllergens(allergens),
  };
}

export function createEmptyChildProfile(): ChildProfile {
  return createDefaultChild();
}

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

export function getChildren(): ChildProfile[] {
  const raw = localStorage.getItem(KEYS.CHILDREN);

  if (!raw) {
    const legacyAllergens = readLegacyAllergens();
    if (legacyAllergens.length === 0) {
      return [];
    }

    const migrated = [{
      ...createDefaultChild(legacyAllergens),
      name: '첫째',
    }];
    localStorage.setItem(KEYS.CHILDREN, JSON.stringify(migrated));
    return migrated;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((child, index) => normalizeChild(child, index))
      .filter((child): child is ChildProfile => child !== null);
  } catch {
    return [];
  }
}

export function setChildren(children: ChildProfile[]): void {
  const normalized = children.map((child, index) => ({
    id: child.id || `child-${index + 1}`,
    name: child.name.trim(),
    allergens: uniqueSortedAllergens(child.allergens),
  }));

  localStorage.setItem(KEYS.CHILDREN, JSON.stringify(normalized));
}

export function getAllergens(): number[] {
  const children = getChildren();
  if (children.length === 0) {
    return readLegacyAllergens();
  }

  return uniqueSortedAllergens(children.flatMap(child => child.allergens));
}

export function setAllergens(allergens: number[]): void {
  const children = getChildren();

  if (children.length === 0) {
    setChildren([{
      ...createDefaultChild(allergens),
      name: '첫째',
    }]);
    return;
  }

  const [firstChild, ...rest] = children;
  setChildren([
    {
      ...firstChild,
      allergens,
    },
    ...rest,
  ]);
}

export function hasCompletedSetup(): boolean {
  return getSchool() !== null && getChildren().length > 0;
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

export function getPushEnabledPreference(): boolean {
  const raw = localStorage.getItem(KEYS.PUSH_ENABLED);
  if (raw === null) {
    return true;
  }

  return raw === 'true';
}

export function setPushEnabledPreference(enabled: boolean): void {
  localStorage.setItem(KEYS.PUSH_ENABLED, enabled ? 'true' : 'false');
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
  localStorage.removeItem(KEYS.CHILDREN);
  localStorage.removeItem(KEYS.PUSH_ENABLED);
  localStorage.removeItem(KEYS.PUSH_SUBSCRIPTION);
}
