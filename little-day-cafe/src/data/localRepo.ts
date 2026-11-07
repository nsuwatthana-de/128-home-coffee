import type {
  Category, Expense, Ingredient, Order, OrderLine, OrderStatus, PaymentMethod, PaymentStatus, Product,
  RecipeItem, ShopSettings, StockReason, TableRow,
} from '../types';
import { priceLine, ValidationError, sumLines } from '../domain/pricing';
import { canTransition } from '../domain/status';
import { recipeCost, requiredStock, shortages, type Recipes } from '../domain/stock';
import type { CreateOrderInput, ProductInput, Range, Repo } from './repo';
import { seedDB, type LocalDB } from './seed';

export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = 'little-day-cafe:v1';
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// โหมดทดลอง: เก็บทุกอย่างใน localStorage ของเบราว์เซอร์เดียวกัน (ไม่มีการตรวจสิทธิ์)
export function createLocalRepo(storage: KV, channel?: { postMessage(m: unknown): void; onmessage: ((e: MessageEvent) => void) | null; close?: () => void }): Repo {
  const listeners = new Set<() => void>();
  let db: LocalDB = load();

  function load(): LocalDB {
    try {
      const raw = storage.getItem(KEY);
      if (raw) return JSON.parse(raw) as LocalDB;
    } catch { /* เริ่มใหม่ */ }
    const fresh = seedDB(uid);
    storage.setItem(KEY, JSON.stringify(fresh));
    return fresh;
  }
  function commit() {
    try { storage.setItem(KEY, JSON.stringify(db)); } catch { /* พื้นที่เต็ม */ }
    channel?.postMessage('changed');
    listeners.forEach((fn) => fn());
  }
  if (channel) {
    channel.onmessage = () => { db = load(); listeners.forEach((fn) => fn()); };
  }

  const recipesMap = (): Recipes => db.recipes;
  const productOf = (id: string) => db.products.find((p) => p.id === id);
  const costOf = (productId: string) => recipeCost(db.recipes[productId] ?? [], db.ingredients);

  function toOrder(o: Order) { return structuredClone(o); }

  return {
    mode: 'local',

    async listCategories(): Promise<Category[]> { return structuredClone(db.categories); },
    async listProducts(): Promise<Product[]> { return structuredClone(db.products); },
    async saveProduct(input: ProductInput) {
      if (!input.name.trim()) throw new ValidationError('กรอกชื่อสินค้า');
      if (!(input.price >= 0)) throw new ValidationError('ราคาต้องไม่ติดลบ');
      if (input.id) {
        const p = productOf(input.id);
        if (!p) throw new ValidationError('ไม่พบสินค้า');
        Object.assign(p, { ...input, name: input.name.trim(), description: input.description.trim() }, { id: p.id, options: p.options });
      } else {
        db.products.push({ ...input, id: uid(), name: input.name.trim(), description: input.description.trim(), options: [] });
      }
      commit();
    },
    async setProductAvailable(id, available) {
      const p = productOf(id);
      if (p) p.available = available;
      commit();
    },

    async listTables(): Promise<TableRow[]> {
      return db.tables.map((t) => ({ id: t.id, code: t.code, active: t.active, hasToken: !!t.tokenHash }));
    },
    async createTable(code) {
      const c = code.trim().toUpperCase();
      if (!c) throw new ValidationError('กรอกรหัสโต๊ะ');
      if (db.tables.some((t) => t.code === c)) throw new ValidationError(`มีโต๊ะ ${c} แล้ว`);
      db.tables.push({ id: uid(), code: c, active: true, tokenHash: null });
      commit();
    },
    async setTableActive(id, active) {
      const t = db.tables.find((x) => x.id === id);
      if (t) t.active = active;
      commit();
    },
    async rotateTableToken(id) {
      const t = db.tables.find((x) => x.id === id);
      if (!t) throw new ValidationError('ไม่พบโต๊ะ');
      const token = newToken();
      t.tokenHash = await sha256Hex(token); // เก็บเฉพาะ hash
      commit();
      return token;
    },
    async resolveToken(token) {
      if (!token) return null;
      const h = await sha256Hex(token);
      const t = db.tables.find((x) => x.tokenHash === h && x.active);
      return t ? { tableId: t.id, code: t.code } : null;
    },

    async createOrder(input: CreateOrderInput): Promise<Order> {
      let table: { id: string; code: string } | null = null;
      if (input.tableToken) {
        const r = await this.resolveToken(input.tableToken);
        if (!r) throw new ValidationError('QR ไม่ถูกต้องหรือโต๊ะถูกปิดใช้งาน');
        table = { id: r.tableId, code: r.code };
      }
      if (input.channel === 'dine_in' && !table) throw new ValidationError('ทานที่ร้านต้องสแกน QR ของโต๊ะ');
      if (input.channel !== 'dine_in' && table) throw new ValidationError('เฉพาะออเดอร์ทานที่ร้านที่ผูกกับโต๊ะ');

      const lines: OrderLine[] = input.items.map((it) => {
        const p = productOf(it.productId);
        const priced = priceLine(p, p?.categoryId ? (db.categories.find((c) => c.id === p.categoryId)?.station ?? 'beverage') : 'beverage', it);
        return { ...priced, unitCost: costOf(it.productId) };
      });
      if (lines.length === 0) throw new ValidationError('ไม่มีรายการในออเดอร์');

      const need = requiredStock(lines, recipesMap());
      const short = shortages(need, db.ingredients);
      if (short.length) throw new ValidationError(`วัตถุดิบไม่พอ: ${short.join(', ')}`);
      for (const [ingId, qty] of need) {
        const ing = db.ingredients.find((i) => i.id === ingId)!;
        ing.qty -= qty;
        db.stockTx.push({ id: uid(), ingredientId: ingId, delta: -qty, reason: 'order', createdAt: new Date().toISOString() });
      }

      db.seq += 1;
      const order: Order = {
        id: uid(),
        no: `A${String(db.seq).padStart(3, '0')}`,
        channel: input.channel,
        tableId: table?.id,
        table: table?.code,
        customer: input.customer?.trim() || undefined,
        note: input.note?.trim().slice(0, 200) || undefined,
        status: 'new',
        paymentStatus: (input.method === 'cash' ? 'unpaid' : 'pending') as PaymentStatus,
        method: input.method,
        total: sumLines(lines),
        costTotal: lines.reduce((s, l) => s + l.unitCost * l.qty, 0),
        createdAt: new Date().toISOString(),
        lines,
      };
      db.orders.push(order);
      commit();
      return toOrder(order);
    },
    async listOrders({ from, to }: Range) {
      return db.orders
        .filter((o) => o.createdAt >= from && o.createdAt < to)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(toOrder);
    },
    async getOrder(id) {
      const o = db.orders.find((x) => x.id === id);
      return o ? toOrder(o) : null;
    },
    async setOrderStatus(id, to: OrderStatus) {
      const o = db.orders.find((x) => x.id === id);
      if (!o) throw new ValidationError('ไม่พบออเดอร์');
      if (!canTransition(o.status, to)) throw new ValidationError('เปลี่ยนสถานะนี้ไม่ได้');
      if (to === 'cancelled') {
        if (o.paymentStatus === 'paid') throw new ValidationError('ออเดอร์ที่ชำระแล้วยกเลิกไม่ได้ (ต้องคืนเงินก่อน)');
        for (const l of o.lines) {
          for (const it of db.recipes[l.productId] ?? []) {
            const ing = db.ingredients.find((i) => i.id === it.ingredientId);
            if (!ing) continue;
            const back = it.qty * l.qty;
            ing.qty += back;
            db.stockTx.push({ id: uid(), ingredientId: ing.id, delta: back, reason: 'cancel', createdAt: new Date().toISOString() });
          }
        }
      }
      o.status = to;
      commit();
    },
    async confirmPayment(id, method: PaymentMethod, reference?: string) {
      const o = db.orders.find((x) => x.id === id);
      if (!o) throw new ValidationError('ไม่พบออเดอร์');
      // ลูกค้ามักจ่ายหลังทานเสร็จ จึงรับเงินได้จนกว่าออเดอร์จะถูกยกเลิก
      if (o.status === 'cancelled') throw new ValidationError('ออเดอร์นี้ถูกยกเลิกแล้ว');
      if (o.paymentStatus === 'paid') throw new ValidationError('ออเดอร์นี้ชำระแล้ว (ป้องกันการบันทึกซ้ำ)');
      o.paymentStatus = 'paid';
      o.method = method;
      o.paymentRef = reference?.trim() || undefined;
      commit();
    },

    async listIngredients() { return structuredClone(db.ingredients); },
    async saveIngredient(input) {
      if (!input.name.trim()) throw new ValidationError('กรอกชื่อวัตถุดิบ');
      if (input.qty < 0 || input.minQty < 0 || input.unitCost < 0) throw new ValidationError('ค่าต้องไม่ติดลบ');
      if (input.id) {
        const i = db.ingredients.find((x) => x.id === input.id);
        if (i) Object.assign(i, input, { id: i.id, qty: i.qty });
      } else {
        db.ingredients.push({ ...input, id: uid(), name: input.name.trim() } as Ingredient);
      }
      commit();
    },
    async adjustStock(id, delta, reason: StockReason) {
      const i = db.ingredients.find((x) => x.id === id);
      if (!i) throw new ValidationError('ไม่พบวัตถุดิบ');
      if (i.qty + delta < 0) throw new ValidationError('ปรับจนเหลือติดลบไม่ได้');
      i.qty += delta;
      db.stockTx.push({ id: uid(), ingredientId: id, delta, reason, createdAt: new Date().toISOString() });
      commit();
    },
    async listRecipes() { return structuredClone(db.recipes); },
    async saveRecipe(productId, items: RecipeItem[]) {
      if (items.some((i) => !(i.qty > 0))) throw new ValidationError('ปริมาณต้องมากกว่า 0');
      if (items.length) db.recipes[productId] = items; else delete db.recipes[productId];
      commit();
    },

    async listExpenses({ from, to }) {
      return db.expenses.filter((e) => e.spentOn >= from && e.spentOn <= to)
        .sort((a, b) => b.spentOn.localeCompare(a.spentOn)).map((e) => ({ ...e }));
    },
    async addExpense(e) {
      if (!(e.amount > 0)) throw new ValidationError('จำนวนเงินต้องมากกว่า 0');
      db.expenses.push({ ...e, id: uid() } as Expense);
      commit();
    },
    async deleteExpense(id) {
      db.expenses = db.expenses.filter((e) => e.id !== id);
      commit();
    },

    async getSettings(): Promise<ShopSettings> { return { ...db.settings }; },
    async saveSettings(s) {
      db.settings = { ...s };
      commit();
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
  };
}

export type { PaymentMethod };
