export type OrderStatus = 'new' | 'completed';
export type AdminSection = 'orders' | 'stats' | 'contacts' | 'menu';

export interface UserAccess {
  orders: boolean;
  stats: boolean;
  contacts: boolean;
  menu: boolean;
}

// Форма данных заказа, которую ожидает фронтенд (поле name вместо customerName)
export interface OrderResponse {
  id: number;
  number: string;
  name: string; // customerName из БД
  phone: string;
  pickupDate: string;
  pickupTime: string;
  comment: string | null;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItemResponse[];
}

export interface OrderItemResponse {
  id: number;
  name: string;
  price: number;
  qty: number;
}

export interface MenuItemResponse {
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
}

export interface ContactEntry {
  name: string;
  phone: string;
  ordersCount: number;
}

export interface StatsResult {
  totalOrders: number;
  newOrders: number;
  completedOrders: number;
  totalRevenue: number;
}
