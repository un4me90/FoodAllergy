export interface AllergenInfo {
  code: number;
  name: string;
  emoji: string;
}

export const ALLERGENS: AllergenInfo[] = [
  { code: 1, name: '난류', emoji: '🥚' },
  { code: 2, name: '우유', emoji: '🥛' },
  { code: 3, name: '메밀', emoji: '🌾' },
  { code: 4, name: '땅콩', emoji: '🥜' },
  { code: 5, name: '대두', emoji: '🫘' },
  { code: 6, name: '밀', emoji: '🌾' },
  { code: 7, name: '고등어', emoji: '🐟' },
  { code: 8, name: '게', emoji: '🦀' },
  { code: 9, name: '새우', emoji: '🦐' },
  { code: 10, name: '돼지고기', emoji: '🐷' },
  { code: 11, name: '복숭아', emoji: '🍑' },
  { code: 12, name: '토마토', emoji: '🍅' },
  { code: 13, name: '아황산류', emoji: '🧪' },
  { code: 14, name: '호두', emoji: '🌰' },
  { code: 15, name: '닭고기', emoji: '🍗' },
  { code: 16, name: '쇠고기', emoji: '🥩' },
  { code: 17, name: '오징어', emoji: '🦑' },
  { code: 18, name: '조개류', emoji: '🦪' },
  { code: 19, name: '잣', emoji: '🌰' },
];

export const ALLERGEN_MAP = new Map<number, AllergenInfo>(
  ALLERGENS.map(a => [a.code, a])
);

export function getAllergenName(code: number): string {
  return ALLERGEN_MAP.get(code)?.name ?? `알레르기${code}`;
}

export function getAllergenNames(codes: number[]): string {
  return codes.map(getAllergenName).join(', ');
}

export interface ParsedDish {
  name: string;
  allergens: number[];
}

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
