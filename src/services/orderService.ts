import prisma from '../db';
import { OrderResponse } from '../types';

function formatOrder(order: {
  id: number;
  number: string;
  customerName: string;
  phone: string;
  pickupDate: string;
  pickupTime: string;
  comment: string | null;
  total: number;
  status: string;
  createdAt: Date;
  items: { id: number; name: string; price: number; qty: number }[];
}): OrderResponse {
  return {
    id: order.id,
    number: order.number,
    name: order.customerName,
    phone: order.phone,
    pickupDate: order.pickupDate,
    pickupTime: order.pickupTime,
    comment: order.comment,
    total: order.total,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
  };
}

export async function createOrder(data: {
  name: string;
  phone: string;
  pickupDate: string;
  pickupTime: string;
  comment?: string;
  items: { id: number; qty: number }[];
}): Promise<OrderResponse> {
  const { name, phone, pickupDate, pickupTime, comment, items } = data;

  // Генерируем уникальный номер заказа
  let orderNumber = '';
  let attempts = 0;
  while (attempts < 10) {
    const n = Math.floor(100000 + Math.random() * 900000);
    orderNumber = `ЗАКАЗ-${n}`;
    const existing = await prisma.order.findUnique({ where: { number: orderNumber } });
    if (!existing) break;
    attempts++;
  }

  return await prisma.$transaction(async (tx) => {
    let total = 0;
    const resolvedItems: { menuItemId: number; name: string; price: number; qty: number }[] = [];

    for (const orderItem of items) {
      const menuItem = await tx.menuItem.findFirst({
        where: { id: orderItem.id, menuDate: pickupDate, available: true },
      });
      if (!menuItem) {
        throw new Error(`Блюдо недоступно для выбранной даты`);
      }

      // Проверяем, сколько уже заказано
      const agg = await tx.orderItem.aggregate({
        where: { menuItemId: orderItem.id, order: { pickupDate } },
        _sum: { qty: true },
      });
      const alreadyOrdered = agg._sum.qty || 0;
      if (alreadyOrdered + orderItem.qty > menuItem.quantity) {
        throw new Error(`Недостаточно порций "${menuItem.name}" (доступно: ${menuItem.quantity - alreadyOrdered})`);
      }

      total += menuItem.price * orderItem.qty;
      resolvedItems.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        qty: orderItem.qty,
      });
    }

    const order = await tx.order.create({
      data: {
        number: orderNumber,
        customerName: name,
        phone,
        pickupDate,
        pickupTime,
        comment: comment || null,
        total,
        status: 'new',
        items: {
          create: resolvedItems,
        },
      },
      include: { items: true },
    });

    return formatOrder(order);
  });
}

export async function getOrders(filters: {
  status?: string;
  date?: string;
  search?: string;
}): Promise<OrderResponse[]> {
  const where: Record<string, unknown> = {};
  if (filters.status) where.status = filters.status;
  if (filters.date) where.pickupDate = filters.date;
  if (filters.search) {
    where.number = { contains: filters.search };
  }

  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });

  return orders.map(formatOrder);
}

export async function toggleOrderStatus(number: string): Promise<OrderResponse> {
  const order = await prisma.order.findUnique({ where: { number }, include: { items: true } });
  if (!order) throw new Error('Заказ не найден');

  const newStatus = order.status === 'new' ? 'completed' : 'new';
  const updated = await prisma.order.update({
    where: { number },
    data: { status: newStatus },
    include: { items: true },
  });
  return formatOrder(updated);
}

export async function deleteOrder(number: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { number } });
  if (!order) throw new Error('Заказ не найден');
  await prisma.order.delete({ where: { number } });
}

export async function getStats(filters: {
  type: 'all' | 'date' | 'week' | 'month';
  date?: string;
  from?: string;
  to?: string;
  month?: string;
}) {
  let where: Record<string, unknown> = {};

  if (filters.type === 'date' && filters.date) {
    where = { pickupDate: filters.date };
  } else if (filters.type === 'week' && filters.from && filters.to) {
    where = { pickupDate: { gte: filters.from, lte: filters.to } };
  } else if (filters.type === 'month' && filters.month) {
    where = { pickupDate: { startsWith: filters.month } };
  }

  const [orders, revenue] = await Promise.all([
    prisma.order.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    }),
    prisma.order.aggregate({ where, _sum: { total: true } }),
  ]);

  const total = orders.reduce((s, r) => s + r._count.id, 0);
  const newCount = orders.find(r => r.status === 'new')?._count.id || 0;
  const completedCount = orders.find(r => r.status === 'completed')?._count.id || 0;

  return {
    totalOrders: total,
    newOrders: newCount,
    completedOrders: completedCount,
    totalRevenue: revenue._sum.total || 0,
  };
}

export async function getContacts() {
  const orders = await prisma.order.findMany({
    select: { customerName: true, phone: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  const normalizePhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('8') && digits.length === 11) return '7' + digits.slice(1);
    return digits;
  };

  const map = new Map<string, { name: string; phone: string; ordersCount: number }>();
  for (const o of orders) {
    const key = normalizePhone(o.phone);
    const existing = map.get(key);
    if (existing) {
      existing.ordersCount++;
    } else {
      map.set(key, { name: o.customerName, phone: o.phone, ordersCount: 1 });
    }
  }

  return [...map.values()].sort((a, b) => b.ordersCount - a.ordersCount);
}
