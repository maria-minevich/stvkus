import { AdminUser } from '@prisma/client';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

declare module 'express' {
  interface Request {
    user?: AdminUser;
  }
}
