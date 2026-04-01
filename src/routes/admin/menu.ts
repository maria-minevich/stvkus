import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAdmin, checkAccess } from '../../middleware/auth';
import {
  getMenuForDate,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  bulkDeleteMenuItems,
  copyMenuFromDate,
  setAllAvailability,
  importMenuFromData,
} from '../../services/menuService';
import { parseMenuExcel, buildMenuTemplate } from '../../services/excelService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(requireAdmin, checkAccess('menu'));

// GET /api/admin/menu?date=YYYY-MM-DD — все блюда на дату (включая недоступные)
router.get('/', async (req: Request, res: Response) => {
  const { date } = req.query as { date?: string };
  if (!date) { res.json([]); return; }
  const items = await getMenuForDate(date);
  res.json(items);
});

// POST /api/admin/menu/items — добавить блюдо
router.post('/items', async (req: Request, res: Response) => {
  const { menuDate, name, price, weight } = req.body as {
    menuDate: string; name: string; price: number; weight?: string;
  };
  if (!menuDate || !name || !price) {
    res.status(400).json({ error: 'Заполните обязательные поля' }); return;
  }
  const item = await addMenuItem({ menuDate, name, price: Number(price), weight: weight || '' });
  res.json(item);
});

// PATCH /api/admin/menu/items/:id — обновить поля блюда
router.patch('/items/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  try {
    const item = await updateMenuItem(id, req.body as Parameters<typeof updateMenuItem>[1]);
    res.json(item);
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

// DELETE /api/admin/menu/items/:id — удалить одно блюдо
router.delete('/items/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  try {
    await deleteMenuItem(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

// DELETE /api/admin/menu/items — массовое удаление { ids: number[] }
router.delete('/items', async (req: Request, res: Response) => {
  const { ids } = req.body as { ids: number[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'Передайте массив ids' }); return;
  }
  const count = await bulkDeleteMenuItems(ids);
  res.json({ deleted: count });
});

// POST /api/admin/menu/copy — скопировать меню с одной даты на другую
router.post('/copy', async (req: Request, res: Response) => {
  const { fromDate, toDate } = req.body as { fromDate: string; toDate: string };
  if (!fromDate || !toDate) {
    res.status(400).json({ error: 'Укажите fromDate и toDate' }); return;
  }
  try {
    const count = await copyMenuFromDate(fromDate, toDate);
    res.json({ copied: count });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// PATCH /api/admin/menu/availability — установить доступность всех блюд на дату
router.patch('/availability', async (req: Request, res: Response) => {
  const { date, available } = req.body as { date: string; available: boolean };
  if (!date) { res.status(400).json({ error: 'Укажите date' }); return; }
  await setAllAvailability(date, Boolean(available));
  res.json({ ok: true });
});

// POST /api/admin/menu/import — загрузить меню из Excel
router.post('/import', upload.single('file'), async (req: Request, res: Response) => {
  const { date } = req.body as { date: string };
  if (!date) { res.status(400).json({ error: 'Укажите date' }); return; }
  if (!req.file) { res.status(400).json({ error: 'Прикрепите файл' }); return; }

  try {
    const rows = await parseMenuExcel(req.file.buffer);
    if (rows.length === 0) { res.status(400).json({ error: 'Файл не содержит данных' }); return; }
    const count = await importMenuFromData(date, rows);
    res.json({ imported: count });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// GET /api/admin/menu/template — скачать шаблон Excel
router.get('/template', async (_req: Request, res: Response) => {
  const buf = await buildMenuTemplate();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="menu_template.xlsx"');
  res.send(buf);
});

export default router;
