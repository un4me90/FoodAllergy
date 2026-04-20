import { Router, Request, Response } from 'express';
import { getCachedMeal, setCachedMeal } from '../db/meals';
import { fetchMeal } from '../services/neis';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { regionCode, schoolCode, date } = req.query as Record<string, string>;

  if (!regionCode || !schoolCode || !date) {
    return res.status(400).json({ error: 'regionCode, schoolCode, date parameters are required.' });
  }

  if (!/^\d{8}$/.test(date)) {
    return res.status(400).json({ error: 'date must be in YYYYMMDD format.' });
  }

  try {
    try {
      const cached = await getCachedMeal(regionCode, schoolCode, date);
      if (cached) {
        return res.json(cached);
      }
    } catch (cacheErr: any) {
      console.warn('[meal] cache read skipped:', cacheErr.message);
    }

    const meals = await fetchMeal(regionCode, schoolCode, date);

    try {
      await setCachedMeal(regionCode, schoolCode, date, meals);
    } catch (cacheErr: any) {
      console.warn('[meal] cache write skipped:', cacheErr.message);
    }

    return res.json(meals);
  } catch (err: any) {
    console.error('[meal] meal lookup failed:', err.message);
    if (err.code === 'ERROR-300') {
      return res.status(403).json({
        error: 'NEIS API meal service permission is not enabled for the configured key.',
        code: 'API_KEY_PERMISSION',
      });
    }
    if (err.code === 'ERROR-290') {
      return res.status(503).json({
        error: 'The configured NEIS API key is invalid.',
        code: 'API_KEY_INVALID',
      });
    }
    if (err.code) {
      return res.status(502).json({
        error: err.message || 'Failed to fetch meal data from NEIS.',
        code: 'NEIS_ERROR',
      });
    }
    return res.status(500).json({ error: 'An error occurred while fetching meal data.' });
  }
});

export default router;
