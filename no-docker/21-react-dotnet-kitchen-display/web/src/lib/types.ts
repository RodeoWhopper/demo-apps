export type Role = "Admin" | "Staff";
export type OrderStatus = "Received" | "Preparing" | "Ready" | "Served" | "Cancelled";

export interface User {
  id: number;
  email: string;
  role: Role;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresAt: string;
  user: User;
}

export interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
  isAvailable: boolean;
}

export interface OrderLine {
  menuItemId: number;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface Order {
  id: number;
  tableCode: string;
  status: OrderStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  readyAt: string | null;
  servedAt: string | null;
  total: number;
  lines: OrderLine[];
}

export interface BoardOrder {
  id: number;
  tableCode: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
}

export interface BoardSnapshot {
  generatedAt: string;
  orders: BoardOrder[];
}

export interface Stats {
  generatedAt: string;
  today: Record<string, number>;
  avgPrepMinutes: number | null;
  revenueToday: number;
  activeOrders: number;
}

export interface MenuChangedEvent {
  action: "created" | "updated" | "deleted";
  itemId: number;
}

/** RFC 9457 problem document as produced by the API for every error. */
export interface Problem {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errors?: Record<string, string[]>;
}
