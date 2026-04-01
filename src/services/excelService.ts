import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import { ContactEntry } from '../types';

export async function parseMenuExcel(buffer: Buffer): Promise<{ name: string; price: number; weight: string }[]> {
  const workbook = new ExcelJS.Workbook();
  const stream = Readable.from(buffer);
  await workbook.xlsx.read(stream);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('Файл не содержит листов');

  const rows: { name: string; price: number; weight: string }[] = [];

  sheet.eachRow((row, rowIndex) => {
    if (rowIndex === 1) return; // пропускаем заголовок

    const name = String(row.getCell(1).value || '').trim();
    const price = parseInt(String(row.getCell(2).value || '0'), 10);
    const weight = String(row.getCell(3).value || '').trim();

    if (name) {
      rows.push({ name, price: isNaN(price) ? 0 : price, weight });
    }
  });

  return rows;
}

export async function buildMenuTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Меню');

  sheet.columns = [
    { header: 'Название', key: 'name', width: 30 },
    { header: 'Цена', key: 'price', width: 10 },
    { header: 'Вес', key: 'weight', width: 10 },
  ];

  sheet.addRow({ name: 'Блюдо 1', price: 100, weight: '100' });
  sheet.addRow({ name: 'Блюдо 2', price: 150, weight: '150' });

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function buildContactsExcel(contacts: ContactEntry[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Контакты');

  sheet.columns = [
    { header: '№', key: 'num', width: 6 },
    { header: 'Имя', key: 'name', width: 25 },
    { header: 'Телефон', key: 'phone', width: 18 },
    { header: 'Кол-во заказов', key: 'ordersCount', width: 16 },
  ];

  contacts.forEach((c, i) => {
    sheet.addRow({ num: i + 1, name: c.name, phone: c.phone, ordersCount: c.ordersCount });
  });

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// Не используется в production — только для совместимости типов
export function bufferToReadable(buf: Buffer): Readable {
  const readable = new Readable();
  readable.push(buf);
  readable.push(null);
  return readable;
}
