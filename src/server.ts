import './config'; // загружает dotenv первым делом
import express from 'express';
import session from 'express-session';
import FileStore from 'session-file-store';
import path from 'path';
import { PORT, SESSION_SECRET } from './config';
import { errorHandler } from './middleware/errorHandler';

import publicRoutes from './routes/public';
import ordersRoutes from './routes/orders';
import adminAuthRoutes from './routes/admin/auth';
import adminOrdersRoutes from './routes/admin/orders';
import adminMenuRoutes from './routes/admin/menu';
import adminStatsRoutes from './routes/admin/stats';
import adminContactsRoutes from './routes/admin/contacts';
import adminUsersRoutes from './routes/admin/users';

const SessionFileStore = FileStore(session);
const app = express();

// Парсинг тела запроса
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Сессии
app.use(
  session({
    store: new SessionFileStore({
      path: path.join(__dirname, '../sessions'),
      ttl: 86400, // 24 часа
      retries: 0,
    }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 часа
    },
  })
);

// Статические файлы
app.use(express.static(path.join(__dirname, '../public')));

// Публичные API
app.use(publicRoutes);
app.use(ordersRoutes);

// Admin API
app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin/orders', adminOrdersRoutes);
app.use('/api/admin/menu', adminMenuRoutes);
app.use('/api/admin/stats', adminStatsRoutes);
app.use('/api/admin/contacts', adminContactsRoutes);
app.use('/api/admin/users', adminUsersRoutes);

// SPA fallback — admin.html для /admin, index.html для остального
app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Обработчик ошибок (должен быть последним)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
  console.log(`Публичный сайт: http://localhost:${PORT}/`);
  console.log(`Админ-панель:   http://localhost:${PORT}/admin`);
});

export default app;
