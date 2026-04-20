import fetch from 'node-fetch';
import { MealInfo, NeisMealRow, ParsedDish } from '../types';

const BASE_URL = 'https://open.neis.go.kr/hub';

interface NeisError extends Error {
  code?: string;
}

/**
 * Example DDISH_NM:
 * "Rice<br/>Soup (1.5.6)<br/>Kimchi (9)"
 */
export function parseDishName(ddishNm: string): ParsedDish[] {
  const dishes: ParsedDish[] = [];
  const items = ddishNm.split(/<br\s*\/?>/gi);

  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) continue;

    const codeMatch = trimmed.match(/\s*\(?(\d+(?:\.\d+)*)\.?\)?\s*$/);
    const codePart = codeMatch?.[1] || '';
    const namePart = codeMatch
      ? trimmed.slice(0, codeMatch.index).trim()
      : trimmed;

    if (!namePart) continue;

    const allergens = codePart
      .split('.')
      .map(s => parseInt(s, 10))
      .filter(n => !isNaN(n) && n > 0);

    dishes.push({ name: namePart, allergens });
  }

  return dishes;
}

function createNeisError(code: string, message: string): NeisError {
  const error = new Error(message) as NeisError;
  error.code = code;
  return error;
}

function getApiKey(): string | null {
  const value = process.env.NEIS_API_KEY?.trim();
  if (!value || value === 'undefined' || value === 'null') {
    return null;
  }

  return value;
}

function isRetryableAuthError(error: unknown): error is NeisError {
  const code = (error as NeisError | undefined)?.code;
  return code === 'ERROR-290' || code === 'ERROR-300';
}

async function requestMeals(
  regionCode: string,
  schoolCode: string,
  date: string,
  apiKey: string | null
): Promise<MealInfo[]> {
  const params = new URLSearchParams({
    Type: 'json',
    pIndex: '1',
    pSize: '10',
    ATPT_OFCDC_SC_CODE: regionCode,
    SD_SCHUL_CODE: schoolCode,
    MLSV_YMD: date,
  });

  if (apiKey) {
    params.set('KEY', apiKey);
  }

  const url = `${BASE_URL}/mealServiceDietInfo?${params}`;
  const res = await fetch(url);
  const data = await res.json() as any;

  if (data.RESULT) {
    throw createNeisError(data.RESULT.CODE, data.RESULT.MESSAGE || 'NEIS request failed.');
  }

  if (!data.mealServiceDietInfo) {
    return [];
  }

  const headResult = data.mealServiceDietInfo[0]?.head?.[1]?.RESULT;
  const resultCode = headResult?.CODE;
  if (resultCode !== 'INFO-000') {
    throw createNeisError(resultCode || 'NEIS_UNKNOWN', headResult?.MESSAGE || 'NEIS request failed.');
  }

  const rows: NeisMealRow[] = data.mealServiceDietInfo[1]?.row ?? [];

  return rows.map(row => ({
    mealType: row.MMEAL_SC_NM,
    mealTypeCode: row.MMEAL_SC_CODE,
    date: row.MLSV_YMD,
    dishes: parseDishName(row.DDISH_NM),
    calInfo: row.CAL_INFO,
  }));
}

export async function fetchMeal(
  regionCode: string,
  schoolCode: string,
  date: string
): Promise<MealInfo[]> {
  const apiKey = getApiKey();

  try {
    return await requestMeals(regionCode, schoolCode, date, apiKey);
  } catch (error) {
    if (apiKey && isRetryableAuthError(error)) {
      console.warn(`[neis] request with API key failed (${error.code}); retrying without key.`);
      return requestMeals(regionCode, schoolCode, date, null);
    }

    throw error;
  }
}
