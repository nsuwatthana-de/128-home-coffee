// ชนิดข้อมูลให้ตรงกับ ER ใน docs/ARCHITECTURE.md
export type Station = 'beverage' | 'bakery';
export type Role = 'owner' | 'manager' | 'staff' | 'kitchen';

export interface Category {
  id: string;
  name: string;
  station: Station;
  emoji: string;
}

export interface OptionValue {
  id: string;
  name: string;
  priceDelta: number;
}

export interface ProductOption {
  id: string;
  name: string;
  type: 'single' | 'multi';
  required: boolean;
  values: OptionValue[];
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  available: boolean;
  featured: boolean;
  options: ProductOption[];
}

export type OrderStatus = 'new' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type Channel = 'dine_in' | 'takeaway' | 'counter';
export type PaymentMethod = 'cash' | 'promptpay';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid';

export interface OrderLine {
  productId: string;
  name: string;
  categoryId: string;
  station: Station;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  unitCost: number;
  options: string[];
  note?: string;
}

export interface Order {
  id: string;
  no: string;
  channel: Channel;
  tableId?: string;
  table?: string;
  customer?: string;
  note?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  method: PaymentMethod;
  paymentRef?: string;
  total: number;
  costTotal: number;
  createdAt: string;
  lines: OrderLine[];
}

export interface TableRow {
  id: string;
  code: string;
  active: boolean;
  hasToken: boolean;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  qty: number;
  minQty: number;
  unitCost: number;
  supplier?: string;
}

export interface RecipeItem {
  ingredientId: string;
  qty: number;
}

export type StockReason = 'purchase' | 'order' | 'adjust' | 'waste' | 'cancel';

export interface Expense {
  id: string;
  spentOn: string; // YYYY-MM-DD
  category: string;
  amount: number;
  note?: string;
}

export interface ShopSettings {
  shopName: string;
  phone: string;
  address: string;
  promptpayId: string;
  openingHours: string;
}
