/**
 * Скрипт одноразовой миграции данных из localStorage в SQLite.
 *
 * Использование:
 *   1. В браузере откройте DevTools → Console на странице admin.html
 *   2. Выполните: copy(JSON.stringify({ menu: JSON.parse(localStorage.getItem('stvkus_menu')||'{}'), orders: JSON.parse(localStorage.getItem('stvkus_orders')||'[]'), users: JSON.parse(localStorage.getItem('stvkus_users')||'[]') }))
 *   3. Сохраните содержимое буфера в файл localstorage-dump.json
 *   4. Запустите: ts-node scripts/migrate-from-localstorage.ts localstorage-dump.json
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

interface LSMenuItem {
  id: number;
  name: string;
  price: number;
  weight?: string;
  category?: string;
  composition?: string;
  calories?: number;
  available?: boolean;
  quantity?: number;
}

interface LSOrderItem {
  id: number;
  name: string;
  price: number;
  qty: number;
}

interface LSOrder {
  number: string;
  name: string;
  phone: string;
  pickupDate: string;
  pickupTime: string;
  comment?: string;
  total: number;
  status: string;
  createdAt: string;
  items: LSOrderItem[];
}

interface LSUser {
  login: string;
  password: string;
  access?: { orders?: boolean; stats?: boolean; contacts?: boolean; menu?: boolean };
}

interface Dump {
  menu: Record<string, LSMenuItem[]>;
  orders: LSOrder[];
  users: LSUser[];
}

async function main() {
  const dumpPath = process.argv[2];
  if (!dumpPath) {
    console.error('Укажите путь к JSON-файлу: ts-node scripts/migrate-from-localstorage.ts localstorage-dump.json');
    process.exit(1);
  }

  const dump: Dump = JSON.parse(fs.readFileSync(path.resolve(dumpPath), 'utf-8'));

  console.log('Миграция меню...');
  let menuCount = 0;
  for (const [date, items] of Object.entries(dump.menu || {})) {
    if (!Array.isArray(items) || items.length === 0) continue;
    await prisma.menuItem.createMany({
      data: items.map(item => ({
        menuDate: date,
        name: item.name,
        price: item.price,
        weight: item.weight || '',
        category: item.category || 'lunch',
        composition: item.composition || '',
        calories: item.calories || 0,
        available: item.available !== false,
        quantity: item.quantity || 50,
      })),
      skipDuplicates: true,
    });
    menuCount += items.length;
  }
  console.log(`  Создано блюд: ${menuCount}`);

  console.log('Миграция заказов...');
  let orderCount = 0;
  for (const o of (dump.orders || [])) {
    const existing = await prisma.order.findUnique({ where: { number: o.number } });
    if (existing) {
      console.log(`  Заказ ${o.number} уже существует, пропускаем`);
      continue;
    }
    await prisma.order.create({
      data: {
        number: o.number,
        customerName: o.name,
        phone: o.phone,
        pickupDate: o.pickupDate,
        pickupTime: o.pickupTime,
        comment: o.comment || null,
        total: o.total,
        status: o.status || 'new',
        createdAt: new Date(o.createdAt),
        items: {
          create: (o.items || []).map(item => ({
            name: item.name,
            price: item.price,
            qty: item.qty,
          })),
        },
      },
    });
    orderCount++;
  }
  console.log(`  Создано заказов: ${orderCount}`);

  console.log('Миграция пользователей...');
  let userCount = 0;
  for (const u of (dump.users || [])) {
    const existing = await prisma.adminUser.findUnique({ where: { login: u.login } });
    if (existing) {
      console.log(`  Пользователь ${u.login} уже существует, пропускаем`);
      continue;
    }
    const passwordHash = await bcrypt.hash(u.password, 12);
    const access = {
      orders: u.access?.orders !== false,
      stats: u.access?.stats !== false,
      contacts: u.access?.contacts !== false,
      menu: u.access?.menu !== false,
    };
    await prisma.adminUser.create({
      data: {
        login: u.login,
        passwordHash,
        isSuperadmin: false,
        access: JSON.stringify(access),
      },
    });
    userCount++;
  }
  console.log(`  Создано пользователей: ${userCount}`);

  console.log('\nМиграция завершена!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
