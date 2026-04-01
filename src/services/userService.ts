import bcrypt from 'bcryptjs';
import prisma from '../db';
import { UserAccess } from '../types';

const DEFAULT_ACCESS: UserAccess = { orders: true, stats: true, contacts: true, menu: true };

export async function createUser(login: string, password: string) {
  const existing = await prisma.adminUser.findUnique({ where: { login } });
  if (existing) throw new Error('Пользователь с таким логином уже существует');

  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.adminUser.create({
    data: {
      login,
      passwordHash,
      isSuperadmin: false,
      access: JSON.stringify(DEFAULT_ACCESS),
    },
  });
}

export async function updateUserAccess(id: number, access: Partial<UserAccess>) {
  const user = await prisma.adminUser.findUnique({ where: { id } });
  if (!user) throw new Error('Пользователь не найден');
  if (user.isSuperadmin) throw new Error('Нельзя изменить доступ суперадмина');

  let current: UserAccess = { ...DEFAULT_ACCESS };
  try {
    current = JSON.parse(user.access) as UserAccess;
  } catch {
    // оставляем дефолтный доступ
  }

  const updated = { ...current, ...access };
  return prisma.adminUser.update({ where: { id }, data: { access: JSON.stringify(updated) } });
}

export async function deleteUser(id: number) {
  const user = await prisma.adminUser.findUnique({ where: { id } });
  if (!user) throw new Error('Пользователь не найден');
  if (user.isSuperadmin) throw new Error('Нельзя удалить суперадмина');
  await prisma.adminUser.delete({ where: { id } });
}

export async function listUsers() {
  const users = await prisma.adminUser.findMany({
    where: { isSuperadmin: false },
    orderBy: { createdAt: 'asc' },
  });
  return users.map(u => ({
    id: u.id,
    login: u.login,
    access: parseAccess(u.access),
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function verifyUser(login: string, password: string) {
  const user = await prisma.adminUser.findUnique({ where: { login } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

export function parseAccess(accessStr: string): UserAccess {
  try {
    return JSON.parse(accessStr) as UserAccess;
  } catch {
    return { ...DEFAULT_ACCESS };
  }
}
