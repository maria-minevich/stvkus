import dotenv from 'dotenv';
dotenv.config();

export const PORT = parseInt(process.env.PORT || '3000', 10);
export const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
export const SUPERADMIN_LOGIN = process.env.SUPERADMIN_LOGIN || 'stvkus';
export const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || '';
