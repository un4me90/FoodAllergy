export interface SchoolInfo {
  name: string;
  type: string;
  district: string;
  regionCode: string;
  schoolCode: string;
}

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

export interface NeisSchoolRow {
  ATPT_OFCDC_SC_CODE: string;
  SD_SCHUL_CODE: string;
  SCHUL_NM: string;
  SCHUL_KND_SC_NM: string;
  LCTN_SC_NM: string;
  ORG_RDNDA: string;
}

export interface NeisMealRow {
  MMEAL_SC_CODE: string;
  MMEAL_SC_NM: string;
  MLSV_YMD: string;
  DDISH_NM: string;
  CAL_INFO: string;
}
