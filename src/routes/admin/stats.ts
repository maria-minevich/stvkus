import { Router, Request, Response } from 'express';
import { requireAdmin, checkAccess } from '../../middleware/auth';
import { getStats } from '../../services/orderService';

const router = Router();

router.use(requireAdmin, checkAccess('stats'));

// GET /api/admin/stats?type=all|date|week|month&date=&from=&to=&month=
router.get('/', async (req: Request, res: Response) => {
  const { type = 'all', date, from, to, month } = req.query as Record<string, string | undefined>;

  const validTypes = ['all', 'date', 'week', 'month'];
  const statsType = validTypes.includes(type) ? (type as 'all' | 'date' | 'week' | 'month') : 'all';

  const stats = await getStats({ type: statsType, date, from, to, month });
  res.json(stats);
});

export default router;
