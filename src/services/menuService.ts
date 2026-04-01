import prisma from '../db';
import { MenuItemResponse } from '../types';

function formatItem(item: {
  id: number;
  menuDate: string;
  name: string;
  price: number;
  weight: string;
  category: string;
  composition: string;
  calories: number;
  available: boolean;
  quantity: number;
}): MenuItemResponse {
  return {
    id: item.id,
    menuDate: item.menuDate,
    name: item.name,
    price: item.price,
    weight: item.weight,
    category: item.category,
    composition: item.composition,
    calories: item.calories,
    available: item.available,
    quantity: item.quantity,
  };
}

export async function getMenuForDate(date: string, onlyAvailable = false): Promise<MenuItemResponse[]> {
  const items = await prisma.menuItem.findMany({
    where: { menuDate: date, ...(onlyAvailable ? { available: true } : {}) },
    orderBy: { id: 'asc' },
  });
  return items.map(formatItem);
}

export async function addMenuItem(data: {
  menuDate: string;
  name: string;
  price: number;
  weight: string;
}): Promise<MenuItemResponse> {
  const item = await prisma.menuItem.create({
    data: {
      menuDate: data.menuDate,
      name: capitalizeFirst(data.name),
      price: data.price,
      weight: normalizeWeight(data.weight),
      available: true,
      quantity: 50,
    },
  });
  return formatItem(item);
}

export async function updateMenuItem(
  id: number,
  data: Partial<{ name: string; price: number; weight: string; available: boolean; quantity: number }>
): Promise<MenuItemResponse> {
  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = capitalizeFirst(data.name);
  if (data.price !== undefined) update.price = data.price;
  if (data.weight !== undefined) update.weight = normalizeWeight(data.weight);
  if (data.available !== undefined) update.available = data.available;
  if (data.quantity !== undefined) update.quantity = data.quantity;

  const item = await prisma.menuItem.update({ where: { id }, data: update });
  return formatItem(item);
}

export async function deleteMenuItem(id: number): Promise<void> {
  await prisma.menuItem.delete({ where: { id } });
}

export async function bulkDeleteMenuItems(ids: number[]): Promise<number> {
  const result = await prisma.menuItem.deleteMany({ where: { id: { in: ids } } });
  return result.count;
}

export async function copyMenuFromDate(fromDate: string, toDate: string): Promise<number> {
  const sourceItems = await prisma.menuItem.findMany({ where: { menuDate: fromDate } });
  if (sourceItems.length === 0) throw new Error('Нет меню для выбранной даты');

  // Удаляем существующее меню на целевую дату
  await prisma.menuItem.deleteMany({ where: { menuDate: toDate } });

  await prisma.menuItem.createMany({
    data: sourceItems.map(item => ({
      menuDate: toDate,
      name: item.name,
      price: item.price,
      weight: item.weight,
      category: item.category,
      composition: item.composition,
      calories: item.calories,
      available: item.available,
      quantity: item.quantity,
    })),
  });

  return sourceItems.length;
}

export async function setAllAvailability(menuDate: string, available: boolean): Promise<void> {
  await prisma.menuItem.updateMany({ where: { menuDate }, data: { available } });
}

export async function importMenuFromData(
  menuDate: string,
  rows: { name: string; price: number; weight: string }[]
): Promise<number> {
  // Удаляем существующее меню на эту дату
  await prisma.menuItem.deleteMany({ where: { menuDate } });

  await prisma.menuItem.createMany({
    data: rows.map(row => ({
      menuDate,
      name: capitalizeFirst(row.name),
      price: row.price,
      weight: normalizeWeight(row.weight),
      available: true,
      quantity: 50,
    })),
  });

  return rows.length;
}

function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function normalizeWeight(w: string): string {
  if (!w) return '';
  const trimmed = w.trim();
  if (trimmed && !trimmed.endsWith('г')) return trimmed + ' г';
  return trimmed;
}
