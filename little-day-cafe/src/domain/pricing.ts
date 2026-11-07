import type { OrderLine, Product, Station } from '../types';

export class ValidationError extends Error {}

export interface SelectionInput {
  groupId: string;
  valueIds: string[];
}

export interface LineInput {
  productId: string;
  qty: number;
  selections: SelectionInput[];
  note?: string;
}

// ตรวจตัวเลือกและคำนวณราคาต่อชิ้นฝั่งกลาง (ใช้ซ้ำทั้งโหมดทดลองและ function ใน Supabase)
export function priceLine(product: Product | undefined, station: Station, input: LineInput): Omit<OrderLine, 'unitCost'> {
  if (!product) throw new ValidationError('ไม่พบเมนูนี้');
  if (!product.available) throw new ValidationError(`${product.name} หมดชั่วคราว`);
  if (!Number.isInteger(input.qty) || input.qty < 1 || input.qty > 20) {
    throw new ValidationError('จำนวนต้องเป็นจำนวนเต็มระหว่าง 1–20');
  }
  for (const s of input.selections) {
    if (!product.options.some((g) => g.id === s.groupId)) throw new ValidationError('ตัวเลือกไม่ถูกต้อง');
  }

  const names: string[] = [];
  let delta = 0;
  for (const group of product.options) {
    const ids = input.selections.find((s) => s.groupId === group.id)?.valueIds ?? [];
    if (group.type === 'single' && ids.length > 1) throw new ValidationError(`เลือก${group.name}ได้เพียงอย่างเดียว`);
    if (group.required && ids.length === 0) throw new ValidationError(`กรุณาเลือก${group.name}`);
    for (const id of ids) {
      const value = group.values.find((v) => v.id === id);
      if (!value) throw new ValidationError('ตัวเลือกไม่ถูกต้อง');
      names.push(value.name);
      delta += value.priceDelta;
    }
  }

  const unitPrice = product.price + delta;
  const note = input.note?.trim().slice(0, 200) || undefined;
  return {
    productId: product.id,
    name: product.name,
    categoryId: product.categoryId,
    station,
    qty: input.qty,
    unitPrice,
    lineTotal: unitPrice * input.qty,
    options: names,
    note,
  };
}

export const sumLines = (lines: Pick<OrderLine, 'lineTotal'>[]) => lines.reduce((s, l) => s + l.lineTotal, 0);
