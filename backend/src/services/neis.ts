import fetch from 'node-fetch';
import { MealInfo, NeisSchoolRow, NeisMealRow, ParsedDish, SchoolInfo } from '../types';

const API_KEY = process.env.NEIS_API_KEY!;
const BASE_URL = 'https://open.neis.go.kr/hub';

/**
 * DDISH_NM 예시:
 * "쇠고기배춧국(N) (9.16)<br/>깍두기(N) (9)<br/>절편(N)"
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

export async function searchSchools(query: string): Promise<SchoolInfo[]> {
  const params = new URLSearchParams({
    KEY: API_KEY,
    Type: 'json',
    pIndex: '1',
    pSize: '10',
    SCHUL_NM: query,
  });

  const url = `${BASE_URL}/schoolInfo?${params}`;
  const res = await fetch(url);
  const data = await res.json() as any;

  if (!data.schoolInfo) return [];

  const rows: NeisSchoolRow[] = data.schoolInfo[1]?.row ?? [];
  return rows.map(row => ({
    name: row.SCHUL_NM,
    type: row.SCHUL_KND_SC_NM,
    district: row.LCTN_SC_NM,
    regionCode: row.ATPT_OFCDC_SC_CODE,
    schoolCode: row.SD_SCHUL_CODE,
  }));
}

export async function fetchMeal(
  regionCode: string,
  schoolCode: string,
  date: string
): Promise<MealInfo[]> {
  const params = new URLSearchParams({
    KEY: API_KEY,
    Type: 'json',
    pIndex: '1',
    pSize: '10',
    ATPT_OFCDC_SC_CODE: regionCode,
    SD_SCHUL_CODE: schoolCode,
    MLSV_YMD: date,
  });

  const url = `${BASE_URL}/mealServiceDietInfo?${params}`;
  const res = await fetch(url);
  const data = await res.json() as any;

  if (data.RESULT) {
    const code = data.RESULT.CODE;
    if (code === 'ERROR-300') {
      throw new Error(
        'API_KEY_PERMISSION: NEIS API에 급식식단정보 서비스 권한이 없습니다. open.neis.go.kr에서 급식식단정보 서비스를 활성화해 주세요.'
      );
    }
    throw new Error(`NEIS_ERROR: ${data.RESULT.MESSAGE}`);
  }

  if (!data.mealServiceDietInfo) return [];

  const resultCode = data.mealServiceDietInfo[0]?.head?.[1]?.RESULT?.CODE;
  if (resultCode !== 'INFO-000') return [];

  const rows: NeisMealRow[] = data.mealServiceDietInfo[1]?.row ?? [];

  return rows.map(row => ({
    mealType: row.MMEAL_SC_NM,
    mealTypeCode: row.MMEAL_SC_CODE,
    date: row.MLSV_YMD,
    dishes: parseDishName(row.DDISH_NM),
    calInfo: row.CAL_INFO,
  }));
}
