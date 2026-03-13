import { query } from './client';
import { MealInfo } from '../types';

export async function getCachedMeal(
  regionCode: string,
  schoolCode: string,
  date: string
): Promise<MealInfo[] | null> {
  const result = await query(
    `
      SELECT meals
      FROM meal_cache
      WHERE region_code = $1 AND school_code = $2 AND meal_date = $3
    `,
    [regionCode, schoolCode, date]
  );

  if (result.rowCount === 0) return null;
  return result.rows[0].meals as MealInfo[];
}

export async function setCachedMeal(
  regionCode: string,
  schoolCode: string,
  date: string,
  meals: MealInfo[]
): Promise<void> {
  await query(
    `
      INSERT INTO meal_cache (
        region_code, school_code, meal_date, meals, fetched_at
      ) VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (region_code, school_code, meal_date)
      DO UPDATE SET
        meals = EXCLUDED.meals,
        fetched_at = NOW()
    `,
    [regionCode, schoolCode, date, JSON.stringify(meals)]
  );

  await query(`
    DELETE FROM meal_cache
    WHERE (region_code, school_code, meal_date) IN (
      SELECT region_code, school_code, meal_date
      FROM meal_cache
      ORDER BY fetched_at DESC
      OFFSET 120
    )
  `);
}
