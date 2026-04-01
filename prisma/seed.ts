import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const login = process.env.SUPERADMIN_LOGIN || 'stvkus';
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!password) {
    console.error('SUPERADMIN_PASSWORD не задан в .env');
    process.exit(1);
  }

  const existing = await prisma.adminUser.findUnique({ where: { login } });
  if (existing) {
    console.log(`Суперадмин "${login}" уже существует, пропускаем.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.create({
    data: {
      login,
      passwordHash,
      isSuperadmin: true,
      access: '{"orders":true,"stats":true,"contacts":true,"menu":true}',
    },
  });

  console.log(`Суперадмин "${login}" создан.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
