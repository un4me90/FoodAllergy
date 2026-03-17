import cron from 'node-cron';
import { getCachedMeal, setCachedMeal } from '../db/meals';
import { getAll } from '../db/subscriptions';
import { fetchMeal } from '../services/neis';
import { sendPush } from '../services/webpush';
import { MealInfo, PushSubscriptionRecord } from '../types';

const ALLERGEN_NAMES: Record<number, string> = {
  1: '난류',
  2: '우유',
  3: '메밀',
  4: '땅콩',
  5: '대두',
  6: '밀',
  7: '고등어',
  8: '게',
  9: '새우',
  10: '돼지고기',
  11: '복숭아',
  12: '토마토',
  13: '아황산류',
  14: '호두',
  15: '닭고기',
  16: '쇠고기',
  17: '오징어',
  18: '조개류',
  19: '잣',
};

function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function buildSchoolMap(subscriptions: PushSubscriptionRecord[]): Map<string, PushSubscriptionRecord[]> {
  const schoolMap = new Map<string, PushSubscriptionRecord[]>();
  for (const sub of subscriptions) {
    const key = `${sub.regionCode}::${sub.schoolCode}`;
    if (!schoolMap.has(key)) schoolMap.set(key, []);
    schoolMap.get(key)!.push(sub);
  }
  return schoolMap;
}

async function getMealsForSchool(
  regionCode: string,
  schoolCode: string,
  date: string
): Promise<MealInfo[]> {
  const cached = await getCachedMeal(regionCode, schoolCode, date);
  if (cached) return cached;

  const meals = await fetchMeal(regionCode, schoolCode, date);
  await setCachedMeal(regionCode, schoolCode, date, meals);
  return meals;
}

function getPrimaryMeal(meals: MealInfo[]): MealInfo | null {
  if (meals.length === 0) return null;
  return meals.find(meal => meal.mealTypeCode === '2') || meals[0];
}

function buildMealSummary(meal: MealInfo): string {
  const dishNames = meal.dishes.map(dish => dish.name);
  const preview = dishNames.slice(0, 4).join(', ');
  return dishNames.length > 4 ? `${preview} 외 ${dishNames.length - 4}개` : preview;
}

function buildWarningSummary(meal: MealInfo, userAllergens: number[]): string {
  const dangerousDishes = meal.dishes
    .filter(dish => dish.allergens.some(code => userAllergens.includes(code)))
    .map(dish => {
      const names = dish.allergens
        .filter(code => userAllergens.includes(code))
        .map(code => ALLERGEN_NAMES[code] || String(code));
      return `${dish.name}(${names.join('/')})`;
    });

  if (dangerousDishes.length === 0) {
    return '주의 메뉴 없음';
  }

  const preview = dangerousDishes.slice(0, 2).join(', ');
  return dangerousDishes.length > 2
    ? `${preview} 외 ${dangerousDishes.length - 2}개`
    : preview;
}

export async function prefetchDailyMeals(date = getTodayDate()): Promise<void> {
  console.log(`[scheduler] meal prefetch start: ${date}`);
  const subscriptions = await getAll();
  if (subscriptions.length === 0) {
    console.log('[scheduler] no subscriptions; skipping prefetch.');
    return;
  }

  const schoolMap = buildSchoolMap(subscriptions);

  for (const [schoolKey] of schoolMap) {
    const [regionCode, schoolCode] = schoolKey.split('::');
    try {
      const meals = await fetchMeal(regionCode, schoolCode, date);
      await setCachedMeal(regionCode, schoolCode, date, meals);
      console.log(`[scheduler] cached meals for ${schoolCode} (${meals.length})`);
    } catch (err) {
      console.error(`[scheduler] prefetch failed for ${schoolCode}:`, err);
    }
  }
}

export async function sendNotificationToSub(
  sub: PushSubscriptionRecord,
  titlePrefix = '',
  date = getTodayDate()
): Promise<void> {
  const meals = await getMealsForSchool(sub.regionCode, sub.schoolCode, date);
  const meal = getPrimaryMeal(meals);
  if (!meal) return;

  const mealSummary = buildMealSummary(meal);
  const warningSummary = buildWarningSummary(meal, sub.allergens);
  const title = titlePrefix
    ? `${titlePrefix} ${meal.mealType} 급식 안내`
    : `오늘 ${meal.mealType} 급식 안내`;

  await sendPush(sub, {
    title,
    body: `메뉴: ${mealSummary} | 알레르기 주의: ${warningSummary}`,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    data: { url: '/' },
  });
}

export async function runDailyNotification(date = getTodayDate()): Promise<void> {
  console.log(`[scheduler] daily notification start: ${date}`);
  const subscriptions = await getAll();
  if (subscriptions.length === 0) {
    console.log('[scheduler] no subscriptions; exiting.');
    return;
  }

  const schoolMap = buildSchoolMap(subscriptions);

  for (const [schoolKey, subs] of schoolMap) {
    const [regionCode, schoolCode] = schoolKey.split('::');

    let meals: MealInfo[];
    try {
      meals = await getMealsForSchool(regionCode, schoolCode, date);
    } catch (err) {
      console.error(`[scheduler] meal fetch failed for ${schoolCode}:`, err);
      continue;
    }

    const meal = getPrimaryMeal(meals);
    if (!meal) {
      console.log(`[scheduler] no meals found for ${schoolCode}`);
      continue;
    }

    const mealSummary = buildMealSummary(meal);

    for (const sub of subs) {
      const warningSummary = buildWarningSummary(meal, sub.allergens);
      await sendPush(sub, {
        title: `오늘 ${meal.mealType} 급식 안내`,
        body: `메뉴: ${mealSummary} | 알레르기 주의: ${warningSummary}`,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        data: { url: '/' },
      });
    }
  }

  console.log('[scheduler] daily notification finished.');
}

export async function runLunchReminder(date = getTodayDate()): Promise<void> {
  console.log(`[scheduler] lunch reminder start: ${date}`);
  const subscriptions = await getAll();
  if (subscriptions.length === 0) {
    console.log('[scheduler] no subscriptions; exiting.');
    return;
  }

  for (const sub of subscriptions) {
    try {
      await sendNotificationToSub(sub, '🍱 점심 전', date);
    } catch (err) {
      console.error(`[scheduler] lunch reminder failed for ${sub.endpoint.slice(0, 40)}:`, err);
    }
  }

  console.log('[scheduler] lunch reminder finished.');
}

export function startScheduler(): void {
  cron.schedule('30 5 * * *', () => {
    void prefetchDailyMeals();
  }, {
    timezone: 'Asia/Seoul',
  });

  cron.schedule('0 7 * * *', () => {
    void runDailyNotification();
  }, {
    timezone: 'Asia/Seoul',
  });

  cron.schedule('0 11 * * *', () => {
    void runLunchReminder();
  }, {
    timezone: 'Asia/Seoul',
  });

  void prefetchDailyMeals().catch(err => {
    console.error('[scheduler] startup prefetch failed:', err);
  });

  console.log('[scheduler] prefetch scheduled at 05:30 Asia/Seoul');
  console.log('[scheduler] notifications scheduled at 07:00 Asia/Seoul');
  console.log('[scheduler] lunch reminder scheduled at 11:00 Asia/Seoul');
}
