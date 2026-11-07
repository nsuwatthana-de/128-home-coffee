import type { Ingredient, RecipeItem } from '../types';

export type Recipes = Record<string, RecipeItem[]>; // productId -> วัตถุดิบต่อ 1 ชิ้น

// คำนวณปริมาณวัตถุดิบที่ต้องใช้จากรายการสินค้า
export function requiredStock(lines: { productId: string; qty: number }[], recipes: Recipes): Map<string, number> {
  const need = new Map<string, number>();
  for (const line of lines) {
    for (const item of recipes[line.productId] ?? []) {
      need.set(item.ingredientId, (need.get(item.ingredientId) ?? 0) + item.qty * line.qty);
    }
  }
  return need;
}

// คืนชื่อวัตถุดิบที่ไม่พอ (ว่าง = พอทั้งหมด)
export function shortages(need: Map<string, number>, ingredients: Ingredient[]): string[] {
  const out: string[] = [];
  for (const [id, qty] of need) {
    const ing = ingredients.find((i) => i.id === id);
    if (!ing || ing.qty < qty) out.push(ing?.name ?? id);
  }
  return out;
}

export function recipeCost(items: RecipeItem[], ingredients: Ingredient[]): number {
  return items.reduce((sum, it) => {
    const ing = ingredients.find((i) => i.id === it.ingredientId);
    return sum + (ing ? ing.unitCost * it.qty : 0);
  }, 0);
}
