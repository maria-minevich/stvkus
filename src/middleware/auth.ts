import { Request, Response, NextFunction } from 'express';
import prisma from '../db';
import { AdminSection, UserAccess } from '../types';

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Не авторизован' });
    return;
  }
  const user = await prisma.adminUser.findUnique({ where: { id: req.session.userId } });
  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: 'Сессия устарела' });
    return;
  }
  req.user = user;
  next();
}

export function checkAccess(section: AdminSection) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Не авторизован' });
      return;
    }
    if (user.isSuperadmin) {
      next();
      return;
    }
    let access: Partial<UserAccess> = {};
    try {
      access = JSON.parse(user.access) as UserAccess;
    } catch {
      // оставляем пустым
    }
    if (!access[section]) {
      res.status(403).json({ error: 'Нет доступа к этому разделу' });
      return;
    }
    next();
  };
}

export function requireSuperadmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.isSuperadmin) {
    res.status(403).json({ error: 'Требуются права суперадмина' });
    return;
  }
  next();
}
