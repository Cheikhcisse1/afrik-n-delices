export type Role = "client" | "staff" | "admin";

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  createdAt: string;
}

export interface MenuItem {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  available: boolean;
  position: number;
}

export interface Category {
  id: number;
  name: string;
  position: number;
  items: MenuItem[];
}

export interface Location {
  id: number;
  name: string;
  address: string;
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  active: boolean;
}

export interface Service {
  date: string;
  location: Location;
}

export type OrderStatus = "received" | "preparing" | "ready" | "collected" | "cancelled";

export interface OrderItem {
  orderId: number;
  menuItemId: number | null;
  name: string;
  unitPriceCents: number;
  quantity: number;
}

export interface Order {
  id: number;
  userId: string | null;
  pickupDate: string;
  pickupTime: string | null;
  status: OrderStatus;
  note: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  totalCents: number;
  createdAt: string;
  updatedAt: string;
  locationId: number;
  locationName: string;
  locationAddress: string;
  items: OrderItem[];
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  handled: boolean;
  createdAt: string;
}
