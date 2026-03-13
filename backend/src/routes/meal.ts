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
    const cached = await getCachedMeal(regionCode, schoolCode, date);
    if (cached) {
      return res.json(cached);
    }

    const meals = await fetchMeal(regionCode, schoolCode, date);
    await setCachedMeal(regionCode, schoolCode, date, meals);
    return res.json(meals);
  } catch (err: any) {
    console.error('[meal] meal lookup failed:', err.message);
    if (err.message?.startsWith('API_KEY_PERMISSION:')) {
      return res.status(403).json({
        error: err.message.replace('API_KEY_PERMISSION: ', ''),
        code: 'API_KEY_PERMISSION',
      });
    }
    return res.status(500).json({ error: 'An error occurred while fetching meal data.' });
  }
});

export default router;
