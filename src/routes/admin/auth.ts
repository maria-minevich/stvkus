import { Router, Request, Response } from 'express';
import { verifyUser, parseAccess } from '../../services/userService';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

// POST /api/admin/login
router.post('/login', async (req: Request, res: Response) => {
  const { login, password } = req.body as { login: string; password: string };
  if (!login || !password) {
    res.status(400).json({ error: 'Введите логин и пароль' });
    return;
  }

  const user = await verifyUser(login.trim(), password);
  if (!user) {
    res.status(401).json({ error: 'Неверный логин или пароль' });
    return;
  }

  req.session.userId = user.id;
  res.json({
    login: user.login,
    isSuperadmin: user.isSuperadmin,
    access: parseAccess(user.access),
  });
});

// POST /api/admin/logout
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// GET /api/admin/me
router.get('/me', requireAdmin, (req: Request, res: Response) => {
  const user = req.user!;
  res.json({
    login: user.login,
    isSuperadmin: user.isSuperadmin,
    access: parseAccess(user.access),
  });
});

export default router;
