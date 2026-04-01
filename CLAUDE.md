# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Node.js/TypeScript web application for cafe «Столичный вкус» at БЦ «Искра-парк». Express backend with SQLite (Prisma), session-based auth, and a vanilla JS frontend.

## Commands

```bash
# Установить зависимости
npm install

# Применить миграции БД и сгенерировать Prisma Client
npm run db:migrate

# Создать суперадмина из .env (SUPERADMIN_LOGIN / SUPERADMIN_PASSWORD)
npm run db:seed

# Запустить сервер в dev-режиме (nodemon + ts-node)
npm run dev

# Сборка в dist/
npm run build

# Запустить собранное приложение
npm run start

# Мигрировать данные из localStorage (одноразово)
npm run migrate -- localstorage-dump.json

# Открыть Prisma Studio
npm run db:studio
```

## Architecture

### Backend (`src/`)

- **`server.ts`** — Express bootstrap: сессии, статика из `public/`, монтирование роутов
- **`config.ts`** — переменные окружения (dotenv)
- **`db.ts`** — Prisma Client singleton
- **`types/index.ts`** — общие TypeScript-интерфейсы; `types/express.d.ts` — расширение `express-session` и `Request`
- **`middleware/auth.ts`** — `requireAdmin` (проверка сессии), `checkAccess(section)`, `requireSuperadmin`
- **`routes/public.ts`** — `GET /api/menu?date=` (только `available: true`, для публичного сайта)
- **`routes/orders.ts`** — `POST /api/orders` (создание заказа с серверной проверкой остатков в транзакции)
- **`routes/admin/`** — auth, orders, menu, stats, contacts, users (все защищены `requireAdmin`)
- **`services/`** — бизнес-логика: `orderService`, `menuService`, `excelService` (ExcelJS), `userService` (bcryptjs)

### Frontend (`public/`)

- **`index.html`** — публичный сайт. Статический HTML + inline JS. `filterMenuByDate()` вызывает `GET /api/menu`, `submitOrder()` — `POST /api/orders`
- **`admin.html`** — HTML-оболочка для админки, загружает `/js/admin-app.js`
- **`js/admin-app.js`** — весь JS-код админки. Каждый `localStorage.getItem/setItem` заменён на `fetch()` к соответствующему API. Структура рендеринга (`renderOrders`, `renderMenuItems` и т.д.) сохранена из оригинала
- **`styles/main.css`** / **`styles/admin.css`** — CSS, извлечённый из оригинальных HTML-файлов

### Database (Prisma / SQLite)

Файл БД: `prisma/dev.db` (путь задаётся через `DATABASE_URL` в `.env`)

Модели: `AdminUser`, `MenuItem` (индекс по `menuDate`), `Order`, `OrderItem`

Ключевые особенности схемы:
- `AdminUser.access` — JSON-строка `{"orders":bool,"stats":bool,"contacts":bool,"menu":bool}`, парсится вручную (SQLite не поддерживает тип Json в Prisma)
- `Order.customerName` маппится в `name` во всех API-ответах (для совместимости с фронтендом)
- `OrderItem` хранит денормализованные `name` и `price` — снимок на момент заказа

### Sessions

`express-session` + `session-file-store` (файлы в `sessions/`). Session key: `userId` (ID пользователя из `AdminUser`).

### localStorage keys → API mapping

| Оригинальный ключ | Теперь |
|---|---|
| `stvkus_menu` | `GET/POST/PATCH/DELETE /api/admin/menu*` |
| `stvkus_orders` | `GET/POST /api/admin/orders*` |
| `stvkus_users` | `GET/POST/PATCH/DELETE /api/admin/users*` |
| `admin_logged_in` / `admin_user` | `express-session` на сервере |

## Environment Variables (`.env`)

```
DATABASE_URL="file:./prisma/dev.db"
SESSION_SECRET="..."
PORT=3000
SUPERADMIN_LOGIN="stvkus"
SUPERADMIN_PASSWORD="..."
```

## First-time Setup

```bash
npm install
npm run db:migrate    # создаёт prisma/dev.db
npm run db:seed       # создаёт суперадмина из .env
npm run dev           # http://localhost:3000
```

Публичный сайт: `http://localhost:3000/`  
Админ-панель: `http://localhost:3000/admin`

## Code Conventions

CSS variables (main): `--highlight` (#f59f00), `--border` (#b24701), `--dark`, `--gray`, `--light-gray`  
CSS variables (admin): те же + `--success`, `--danger`

- JavaScript в фронтенде — vanilla ES6+, без фреймворков
- Inline `onclick` в HTML вызывают функции из `admin-app.js`; функции `async`, возвращаемый Promise игнорируется (браузер)
- Названия переменных/функций: `camelCase`; CSS классы: `kebab-case`
