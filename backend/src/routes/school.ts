import { Router, Request, Response } from 'express';
import { searchSchools } from '../services/neis';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const query = req.query.q as string;
  if (!query || query.trim().length < 2) {
    return res.json([]);
  }

  try {
    const schools = await searchSchools(query.trim());
    return res.json(schools);
  } catch (err) {
    console.error('[school] 학교 검색 오류:', err);
    return res.status(500).json({ error: '학교 검색 중 오류가 발생했습니다.' });
  }
});

export default router;
