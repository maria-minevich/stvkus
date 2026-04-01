import { Router, Request, Response } from 'express';
import { requireAdmin, checkAccess } from '../../middleware/auth';
import { getOrders, toggleOrderStatus, deleteOrder } from '../../services/orderService';

const router = Router();

router.use(requireAdmin, checkAccess('orders'));

// GET /api/admin/orders?status=&date=&search=
router.get('/', async (req: Request, res: Response) => {
  const { status, date, search } = req.query as Record<string, string | undefined>;
  const orders = await getOrders({ status, date, search });
  res.json(orders);
});

// PATCH /api/admin/orders/:number/status
router.patch('/:number/status', async (req: Request, res: Response) => {
  try {
    const order = await toggleOrderStatus(req.params.number);
    res.json(order);
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

// DELETE /api/admin/orders/:number
router.delete('/:number', async (req: Request, res: Response) => {
  try {
    await deleteOrder(req.params.number);
    res.json({ ok: true });
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

export default router;
