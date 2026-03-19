export interface ParsedDish {
  name: string;
  allergens: number[];
}

export interface MealInfo {
  mealType: string;
  mealTypeCode: string;
  date: string;
  dishes: ParsedDish[];
  calInfo: string;
}

export interface CachedMealRecord {
  regionCode: string;
  schoolCode: string;
  date: string;
  meals: MealInfo[];
  fetchedAt: string;
}

export interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
  schoolCode: string;
  regionCode: string;
  allergens: number[];
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon: string;
  badge: string;
  data: { url: string };
}

export interface NeisMealRow {
  MMEAL_SC_CODE: string;
  MMEAL_SC_NM: string;
  MLSV_YMD: string;
  DDISH_NM: string;
  CAL_INFO: string;
}

export type NotificationJobType = 'prefetch' | 'daily' | 'lunch';

export interface NotificationRunStats {
  subscriptionCount: number;
  schoolCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
}
