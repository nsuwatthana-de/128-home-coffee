import type { Expense, Order, OrderLine } from '../types';

export interface Summary {
  orders: number;
  revenue: number;
  cost: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  average: number;
  topProducts: { name: string; qty: number; sales: number }[];
  byCategory: { categoryId: string; sales: number }[];
}

// รายรับนับเฉพาะออเดอร์ที่ชำระแล้วและไม่ถูกยกเลิก
export function summarize(orders: Order[], expenses: Expense[]): Summary {
  const counted = orders.filter((o) => o.status !== 'cancelled');
  const paid = counted.filter((o) => o.paymentStatus === 'paid');
  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const cost = paid.reduce((s, o) => s + o.costTotal, 0);
  const spent = expenses.reduce((s, e) => s + e.amount, 0);

  const products = new Map<string, { name: string; qty: number; sales: number }>();
  const categories = new Map<string, number>();
  for (const o of counted) {
    for (const l of o.lines) {
      const p = products.get(l.productId) ?? { name: l.name, qty: 0, sales: 0 };
      p.qty += l.qty;
      p.sales += l.lineTotal;
      products.set(l.productId, p);
    }
  }
  for (const o of paid) {
    for (const l of o.lines) categories.set(l.categoryId, (categories.get(l.categoryId) ?? 0) + l.lineTotal);
  }

  return {
    orders: counted.length,
    revenue,
    cost,
    grossProfit: revenue - cost,
    expenses: spent,
    netProfit: revenue - cost - spent,
    average: paid.length ? revenue / paid.length : 0,
    topProducts: [...products.values()].sort((a, b) => b.qty - a.qty).slice(0, 10),
    byCategory: [...categories.entries()].map(([categoryId, sales]) => ({ categoryId, sales })),
  };
}

export function toCSV(rows: (string | number | undefined | null)[][]): string {
  const esc = (v: string | number | undefined | null) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map((r) => r.map(esc).join(',')).join('\n'); // BOM ให้ Excel อ่านภาษาไทยได้
}

export const lineSales = (lines: OrderLine[]) => lines.reduce((s, l) => s + l.lineTotal, 0);
