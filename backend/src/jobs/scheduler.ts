import cron from 'node-cron';
import { FIXED_SCHOOL } from '../config/school';
import { claimRun, completeRun, failRun } from '../db/notificationRuns';
import { getCachedMeal, setCachedMeal } from '../db/meals';
import { getAll } from '../db/subscriptions';
import { fetchMeal } from '../services/neis';
import { sendPush } from '../services/webpush';
import { MealInfo, NotificationJobType, NotificationRunStats, PushSubscriptionRecord } from '../types';

const notificationIcon = '/seokam_logo_transparent_small.png';

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

function getSeoulDateParts(date = new Date()): {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
} {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const read = (type: string) => parts.find(part => part.type === type)?.value ?? '00';

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
  };
}

function getTodayDate(): string {
  const parts = getSeoulDateParts();
  return `${parts.year}${parts.month}${parts.day}`;
}

function getSeoulMinutesOfDay(date = new Date()): number {
  const parts = getSeoulDateParts(date);
  return Number(parts.hour) * 60 + Number(parts.minute);
}

function emptyStats(subscriptionCount = 0, schoolCount = 0): NotificationRunStats {
  return {
    subscriptionCount,
    schoolCount,
    sentCount: 0,
    failedCount: 0,
    skippedCount: 0,
  };
}

function buildSchoolMap(subscriptions: PushSubscriptionRecord[]): Map<string, PushSubscriptionRecord[]> {
  const schoolMap = new Map<string, PushSubscriptionRecord[]>();

  for (const sub of subscriptions) {
    const key = `${sub.regionCode}::${sub.schoolCode}`;
    if (!schoolMap.has(key)) {
      schoolMap.set(key, []);
    }
    schoolMap.get(key)!.push(sub);
  }

  return schoolMap;
}

function chunkSubscriptions(
  subscriptions: PushSubscriptionRecord[],
  chunkSize = 20
): PushSubscriptionRecord[][] {
  const chunks: PushSubscriptionRecord[][] = [];

  for (let index = 0; index < subscriptions.length; index += chunkSize) {
    chunks.push(subscriptions.slice(index, index + chunkSize));
  }

  return chunks;
}

async function getMealsForSchool(
  regionCode: string,
  schoolCode: string,
  date: string
): Promise<MealInfo[]> {
  const cached = await getCachedMeal(regionCode, schoolCode, date);
  if (cached) {
    return cached;
  }

  const meals = await fetchMeal(regionCode, schoolCode, date);
  await setCachedMeal(regionCode, schoolCode, date, meals);
  return meals;
}

function getPrimaryMeal(meals: MealInfo[]): MealInfo | null {
  if (meals.length === 0) {
    return null;
  }

  return meals.find(meal => meal.mealTypeCode === '2') || meals[0];
}

function buildMealSummary(meal: MealInfo): string {
  const dishNames = meal.dishes.map(dish => dish.name);
  const preview = dishNames.slice(0, 4).join(', ');

  return dishNames.length > 4
    ? `${preview} 외 ${dishNames.length - 4}개`
    : preview;
}

function buildWarningSummary(meal: MealInfo, userAllergens: number[]): string {
  const dangerousDishes = meal.dishes
    .filter(dish => dish.allergens.some(code => userAllergens.includes(code)))
    .map(dish => {
      const allergenNames = dish.allergens
        .filter(code => userAllergens.includes(code))
        .map(code => ALLERGEN_NAMES[code] || String(code));
      return `${dish.name}(${allergenNames.join('/')})`;
    });

  if (dangerousDishes.length === 0) {
    return '주의 메뉴 없음';
  }

  const preview = dangerousDishes.slice(0, 2).join(', ');
  return dangerousDishes.length > 2
    ? `${preview} 외 ${dangerousDishes.length - 2}개`
    : preview;
}

async function sendBatch(
  subscriptions: PushSubscriptionRecord[],
  createPayload: (sub: PushSubscriptionRecord) => {
    title: string;
    body: string;
    icon: string;
    badge: string;
    data: { url: string };
  }
): Promise<Pick<NotificationRunStats, 'sentCount' | 'failedCount' | 'skippedCount'>> {
  const stats = {
    sentCount: 0,
    failedCount: 0,
    skippedCount: 0,
  };

  for (const chunk of chunkSubscriptions(subscriptions)) {
    const results = await Promise.allSettled(
      chunk.map(async sub => {
        const result = await sendPush(sub, createPayload(sub));
        return result.status;
      })
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        stats.failedCount += 1;
        continue;
      }

      if (result.value === 'sent') {
        stats.sentCount += 1;
      } else {
        stats.skippedCount += 1;
      }
    }
  }

  return stats;
}

async function runTrackedJob(
  jobType: NotificationJobType,
  date: string,
  runner: () => Promise<NotificationRunStats>
): Promise<void> {
  const claimed = await claimRun(jobType, date);
  if (!claimed) {
    console.log(`[scheduler] ${jobType} already handled or running for ${date}`);
    return;
  }

  try {
    const stats = await runner();
    await completeRun(jobType, date, stats);
    console.log(`[scheduler] ${jobType} completed for ${date}:`, stats);
  } catch (err: any) {
    const stats = emptyStats();
    const message = err?.message || 'Unknown scheduler error';
    await failRun(jobType, date, message, stats);
    console.error(`[scheduler] ${jobType} failed for ${date}:`, err);
  }
}

async function catchUpMissedJobs(date = getTodayDate()): Promise<void> {
  const currentMinutes = getSeoulMinutesOfDay();

  if (currentMinutes >= 5 * 60 + 30) {
    await runTrackedJob('prefetch', date, () => prefetchDailyMeals(date));
  }

  if (currentMinutes >= 7 * 60) {
    await runTrackedJob('daily', date, () => runDailyNotification(date));
  }

  if (currentMinutes >= 11 * 60) {
    await runTrackedJob('lunch', date, () => runLunchReminder(date));
  }
}

export async function prefetchDailyMeals(date = getTodayDate()): Promise<NotificationRunStats> {
  console.log(`[scheduler] meal prefetch start: ${date}`);

  const subscriptions = await getAll();
  if (subscriptions.length === 0) {
    console.log('[scheduler] no subscriptions; skipping prefetch.');
    return emptyStats();
  }

  const schoolMap = buildSchoolMap(subscriptions);
  const stats = emptyStats(subscriptions.length, schoolMap.size);

  for (const [schoolKey] of schoolMap) {
    const [regionCode, schoolCode] = schoolKey.split('::');

    try {
      const meals = await fetchMeal(regionCode, schoolCode, date);
      await setCachedMeal(regionCode, schoolCode, date, meals);
      stats.sentCount += 1;
      console.log(`[scheduler] cached meals for ${schoolCode} (${meals.length})`);
    } catch (err) {
      stats.failedCount += 1;
      console.error(`[scheduler] prefetch failed for ${schoolCode}:`, err);
    }
  }

  return stats;
}

export async function sendNotificationToSub(
  sub: PushSubscriptionRecord,
  titlePrefix = '',
  date = getTodayDate()
): Promise<void> {
  const meals = await getMealsForSchool(sub.regionCode, sub.schoolCode, date);
  const meal = getPrimaryMeal(meals);
  if (!meal) {
    return;
  }

  const mealSummary = buildMealSummary(meal);
  const warningSummary = buildWarningSummary(meal, sub.allergens);
  const title = titlePrefix
    ? `${titlePrefix} ${meal.mealType} 급식 안내`
    : `오늘 ${meal.mealType} 급식 안내`;

  await sendPush(sub, {
    title,
    body: `메뉴: ${mealSummary} | 알레르기 주의: ${warningSummary}`,
    icon: notificationIcon,
    badge: notificationIcon,
    data: { url: '/' },
  });
}

export async function runDailyNotification(date = getTodayDate()): Promise<NotificationRunStats> {
  console.log(`[scheduler] daily notification start: ${date}`);

  const subscriptions = await getAll();
  if (subscriptions.length === 0) {
    console.log('[scheduler] no subscriptions; exiting.');
    return emptyStats();
  }

  const schoolMap = buildSchoolMap(subscriptions);
  const totalStats = emptyStats(subscriptions.length, schoolMap.size);

  for (const [schoolKey, subs] of schoolMap) {
    const [regionCode, schoolCode] = schoolKey.split('::');

    let meals: MealInfo[];
    try {
      meals = await getMealsForSchool(regionCode, schoolCode, date);
    } catch (err) {
      totalStats.failedCount += subs.length;
      console.error(`[scheduler] meal fetch failed for ${schoolCode}:`, err);
      continue;
    }

    const meal = getPrimaryMeal(meals);
    if (!meal) {
      totalStats.skippedCount += subs.length;
      console.log(`[scheduler] no meals found for ${schoolCode}`);
      continue;
    }

    const mealSummary = buildMealSummary(meal);
    const batchStats = await sendBatch(subs, sub => {
      const warningSummary = buildWarningSummary(meal, sub.allergens);
      return {
        title: `오늘 ${meal.mealType} 급식 안내`,
        body: `메뉴: ${mealSummary} | 알레르기 주의: ${warningSummary}`,
        icon: notificationIcon,
        badge: notificationIcon,
        data: { url: '/' },
      };
    });

    totalStats.sentCount += batchStats.sentCount;
    totalStats.failedCount += batchStats.failedCount;
    totalStats.skippedCount += batchStats.skippedCount;
  }

  console.log('[scheduler] daily notification finished.');
  return totalStats;
}

export async function runLunchReminder(date = getTodayDate()): Promise<NotificationRunStats> {
  console.log(`[scheduler] lunch reminder start: ${date}`);

  const subscriptions = await getAll();
  if (subscriptions.length === 0) {
    console.log('[scheduler] no subscriptions; exiting.');
    return emptyStats();
  }

  let meals: MealInfo[];
  try {
    meals = await getMealsForSchool(FIXED_SCHOOL.regionCode, FIXED_SCHOOL.schoolCode, date);
  } catch (err) {
    const stats = emptyStats(subscriptions.length, 1);
    stats.failedCount = subscriptions.length;
    console.error('[scheduler] lunch reminder meal fetch failed:', err);
    return stats;
  }

  const meal = getPrimaryMeal(meals);
  if (!meal) {
    const stats = emptyStats(subscriptions.length, 1);
    stats.skippedCount = subscriptions.length;
    console.log('[scheduler] no meal found for lunch reminder.');
    return stats;
  }

  const mealSummary = buildMealSummary(meal);
  const batchStats = await sendBatch(subscriptions, sub => {
    const warningSummary = buildWarningSummary(meal, sub.allergens);
    return {
      title: `점심 전 ${meal.mealType} 급식 안내`,
      body: `메뉴: ${mealSummary} | 알레르기 주의: ${warningSummary}`,
      icon: notificationIcon,
      badge: notificationIcon,
      data: { url: '/' },
    };
  });

  const stats = emptyStats(subscriptions.length, 1);
  stats.sentCount = batchStats.sentCount;
  stats.failedCount = batchStats.failedCount;
  stats.skippedCount = batchStats.skippedCount;

  console.log('[scheduler] lunch reminder finished.');
  return stats;
}

export function startScheduler(): void {
  cron.schedule('30 5 * * *', () => {
    const date = getTodayDate();
    void runTrackedJob('prefetch', date, () => prefetchDailyMeals(date));
  }, {
    timezone: 'Asia/Seoul',
  });

  cron.schedule('0 7 * * *', () => {
    const date = getTodayDate();
    void runTrackedJob('daily', date, () => runDailyNotification(date));
  }, {
    timezone: 'Asia/Seoul',
  });

  cron.schedule('0 11 * * *', () => {
    const date = getTodayDate();
    void runTrackedJob('lunch', date, () => runLunchReminder(date));
  }, {
    timezone: 'Asia/Seoul',
  });

  void catchUpMissedJobs().catch(err => {
    console.error('[scheduler] startup catch-up failed:', err);
  });

  console.log('[scheduler] prefetch scheduled at 05:30 Asia/Seoul');
  console.log('[scheduler] notifications scheduled at 07:00 Asia/Seoul');
  console.log('[scheduler] lunch reminder scheduled at 11:00 Asia/Seoul');
}
