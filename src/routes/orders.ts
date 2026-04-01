import { Router, Request, Response } from 'express';
import { createOrder } from '../services/orderService';

const router = Router();

const VALID_TIMES = ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30'];

function isWeekday(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function isFutureDate(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr + 'T00:00:00');
  return date > today;
}

// POST /api/orders — публичное оформление заказа
router.post('/api/orders', async (req: Request, res: Response) => {
  const { name, phone, pickupDate, pickupTime, comment, items } = req.body as {
    name: string;
    phone: string;
    pickupDate: string;
    pickupTime: string;
    comment?: string;
    items: { id: number; qty: number }[];
  };

  if (!name?.trim()) { res.status(400).json({ error: 'Укажите имя' }); return; }
  if (!phone?.trim()) { res.status(400).json({ error: 'Укажите телефон' }); return; }
  if (!pickupDate) { res.status(400).json({ error: 'Укажите дату самовывоза' }); return; }
  if (!pickupTime) { res.status(400).json({ error: 'Укажите время самовывоза' }); return; }
  if (!Array.isArray(items) || items.length === 0) { res.status(400).json({ error: 'Корзина пуста' }); return; }
  if (!VALID_TIMES.includes(pickupTime)) { res.status(400).json({ error: 'Недопустимое время' }); return; }
  if (!isWeekday(pickupDate)) { res.status(400).json({ error: 'Самовывоз только в рабочие дни' }); return; }
  if (!isFutureDate(pickupDate)) { res.status(400).json({ error: 'Выберите будущую дату' }); return; }

  try {
    const order = await createOrder({ name: name.trim(), phone: phone.trim(), pickupDate, pickupTime, comment, items });
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
