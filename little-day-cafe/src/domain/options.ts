import type { Product } from '../types';
import type { SelectionInput } from './pricing';

// ใช้ที่หน้าจอเพื่อให้ผู้ใช้เห็นราคาก่อนยืนยัน (คำนวณจริงอีกครั้งที่ฝั่งเซิร์ฟเวอร์)
export function selectionLabels(product: Product, selections: SelectionInput[]): string[] {
  const names: string[] = [];
  for (const g of product.options) {
    const ids = selections.find((s) => s.groupId === g.id)?.valueIds ?? [];
    for (const id of ids) {
      const v = g.values.find((x) => x.id === id);
      if (v) names.push(v.name);
    }
  }
  return names;
}

export function unitPriceWith(product: Product, selections: SelectionInput[]): number {
  let total = product.price;
  for (const g of product.options) {
    const ids = selections.find((s) => s.groupId === g.id)?.valueIds ?? [];
    for (const id of ids) total += g.values.find((x) => x.id === id)?.priceDelta ?? 0;
  }
  return total;
}

// ตัวเลือกที่บังคับแต่ยังไม่ได้เลือก (ว่าง = ครบ)
export function missingRequired(product: Product, selections: SelectionInput[]): string[] {
  return product.options
    .filter((g) => g.required && !(selections.find((s) => s.groupId === g.id)?.valueIds.length))
    .map((g) => g.name);
}
