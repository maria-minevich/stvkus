import { Router, Request, Response } from 'express';
import { getMenuForDate } from '../services/menuService';

const router = Router();

// GET /api/menu?date=YYYY-MM-DD
// Возвращает только доступные блюда для публичного сайта
router.get('/api/menu', async (req: Request, res: Response) => {
  const { date } = req.query;
  if (!date || typeof date !== 'string') {
    res.json([]);
    return;
  }
  const items = await getMenuForDate(date, true);
  res.json(items);
});

export default router;
