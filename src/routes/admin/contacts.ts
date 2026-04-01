import { Router, Request, Response } from 'express';
import { requireAdmin, checkAccess } from '../../middleware/auth';
import { getContacts } from '../../services/orderService';
import { buildContactsExcel } from '../../services/excelService';

const router = Router();

router.use(requireAdmin, checkAccess('contacts'));

// GET /api/admin/contacts
router.get('/', async (_req: Request, res: Response) => {
  const contacts = await getContacts();
  res.json(contacts);
});

// GET /api/admin/contacts/export — скачать Excel
router.get('/export', async (_req: Request, res: Response) => {
  const contacts = await getContacts();
  const buf = await buildContactsExcel(contacts);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="contacts.xlsx"');
  res.send(buf);
});

export default router;
