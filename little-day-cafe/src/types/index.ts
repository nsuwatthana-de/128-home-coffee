// ชนิดข้อมูลให้ตรงกับ ER ใน docs/ARCHITECTURE.md (Phase 1 ใช้ mock จากชนิดนี้)
export type Station = 'beverage' | 'bakery';

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

export interface OrderLine {
  name: string;
  qty: number;
  station: Station;
  options: string[];
  note?: string;
}

export interface Order {
  id: string;
  no: string;
  channel: Channel;
  table?: string;
  customer?: string;
  status: OrderStatus;
  paid: boolean;
  method: PaymentMethod;
  total: number;
  createdAt: string;
  lines: OrderLine[];
}

export interface Table {
  id: string;
  code: string;
  active: boolean;
}
