import { Router, Request, Response } from 'express';
import { requireAdmin, requireSuperadmin } from '../../middleware/auth';
import { createUser, updateUserAccess, deleteUser, listUsers } from '../../services/userService';
import { UserAccess } from '../../types';

const router = Router();

router.use(requireAdmin, requireSuperadmin);

// GET /api/admin/users
router.get('/', async (_req: Request, res: Response) => {
  const users = await listUsers();
  res.json(users);
});

// POST /api/admin/users — создать пользователя { login, password }
router.post('/', async (req: Request, res: Response) => {
  const { login, password } = req.body as { login: string; password: string };
  if (!login?.trim() || !password) {
    res.status(400).json({ error: 'Введите логин и пароль' }); return;
  }
  try {
    const user = await createUser(login.trim(), password);
    res.json({ id: user.id, login: user.login });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// PATCH /api/admin/users/:id/access — обновить доступ { orders, stats, contacts, menu }
router.patch('/:id/access', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  try {
    await updateUserAccess(id, req.body as Partial<UserAccess>);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  try {
    await deleteUser(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
