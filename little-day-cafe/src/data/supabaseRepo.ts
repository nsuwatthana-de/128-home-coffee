import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Category, Expense, Ingredient, Order, OrderLine, OrderStatus, PaymentMethod, Product, RecipeItem,
  ShopSettings, StockReason, TableRow,
} from '../types';
import type { CreateOrderInput, ProductInput, Range, Repo } from './repo';

type Row = Record<string, any>;

const check = <T>(res: { data: T | null; error: { message: string } | null }): T => {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
};

const mapOrderLine = (oi: Row): OrderLine => ({
  productId: oi.product_id,
  name: oi.product_name,
  categoryId: oi.category_id,
  station: oi.station,
  qty: oi.qty,
  unitPrice: Number(oi.unit_price),
  lineTotal: Number(oi.line_total),
  unitCost: Number(oi.unit_cost),
  options: (oi.order_item_options ?? []).map((o: Row) => o.value_name),
  note: oi.note ?? undefined,
});

const mapOrderRow = (o: Row): Order => ({
  id: o.id,
  no: o.order_no,
  channel: o.channel,
  tableId: o.table_id ?? undefined,
  table: o.tables?.code ?? undefined,
  customer: o.customer_name ?? undefined,
  note: o.note ?? undefined,
  status: o.status,
  paymentStatus: o.payment_status,
  method: o.payment_method,
  paymentRef: o.payment_ref ?? undefined,
  total: Number(o.total),
  costTotal: Number(o.cost_total),
  createdAt: o.created_at,
  lines: (o.order_items ?? []).map(mapOrderLine),
});

// โหมดใช้งานจริง: เรียก function ของ Supabase สำหรับทุกการเปลี่ยนแปลงที่ต้องตรวจสิทธิ์หรือคำนวณเงิน
export function createSupabaseRepo(sb: SupabaseClient): Repo {
  return {
    mode: 'supabase',

    async listCategories(): Promise<Category[]> {
      const rows = check(await sb.from('categories').select('*').order('sort'));
      return rows.map((c: Row) => ({ id: c.id, name: c.name, station: c.station, emoji: c.emoji }));
    },

    async listProducts(): Promise<Product[]> {
      const rows = check(await sb.from('products')
        .select('*, product_options(*, product_option_values(*))').order('sort'));
      return rows.map((p: Row): Product => ({
        id: p.id,
        categoryId: p.category_id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        emoji: p.emoji,
        available: p.is_available,
        featured: p.is_featured,
        options: (p.product_options ?? []).sort((a: Row, b: Row) => a.sort - b.sort).map((g: Row) => ({
          id: g.id,
          name: g.name,
          type: g.type,
          required: g.is_required,
          values: (g.product_option_values ?? []).sort((a: Row, b: Row) => a.sort - b.sort).map((v: Row) => ({
            id: v.id, name: v.name, priceDelta: Number(v.price_delta),
          })),
        })),
      }));
    },

    async saveProduct(input: ProductInput) {
      const row = {
        ...(input.id ? { id: input.id } : {}),
        name: input.name.trim(),
        category_id: input.categoryId,
        description: input.description.trim(),
        price: input.price,
        emoji: input.emoji || '🍽️',
        is_available: input.available,
        is_featured: input.featured,
      };
      check(await sb.from('products').upsert(row));
    },

    async setProductAvailable(id, available) {
      check(await sb.from('products').update({ is_available: available, updated_at: new Date().toISOString() }).eq('id', id));
    },

    async listTables(): Promise<TableRow[]> {
      const rows = check(await sb.from('tables').select('id, code, is_active, table_tokens(revoked_at)').order('code'));
      return rows.map((t: Row) => ({
        id: t.id,
        code: t.code,
        active: t.is_active,
        hasToken: (t.table_tokens ?? []).some((x: Row) => !x.revoked_at),
      }));
    },
    async createTable(code) {
      check(await sb.from('tables').insert({ code: code.trim().toUpperCase() }));
    },
    async setTableActive(id, active) {
      check(await sb.from('tables').update({ is_active: active }).eq('id', id));
    },
    async rotateTableToken(id) {
      return check(await sb.rpc('rotate_table_token', { p_table: id })) as string;
    },
    async resolveToken(token) {
      const r = check(await sb.rpc('resolve_table_token', { p_token: token })) as Row | null;
      return r ? { tableId: r.tableId, code: r.code } : null;
    },

    async createOrder(input: CreateOrderInput): Promise<Order> {
      const res = check(await sb.rpc('create_order', {
        p_token: input.tableToken ?? null,
        p_channel: input.channel,
        p_customer: input.customer ?? '',
        p_note: input.note ?? '',
        p_method: input.method,
        p_items: input.items.map((i) => ({
          productId: i.productId, qty: i.qty, selections: i.selections, note: i.note ?? '',
        })),
      })) as Row;
      const order = await this.getOrder(res.id);
      if (!order) throw new Error('สร้างออเดอร์แล้วแต่อ่านไม่พบ');
      return order;
    },
    async listOrders(range: Range): Promise<Order[]> {
      const rows = check(await sb.from('orders')
        .select('*, tables(code), order_items(*, order_item_options(*))')
        .gte('created_at', range.from).lt('created_at', range.to)
        .order('created_at', { ascending: false }));
      return rows.map(mapOrderRow);
    },
    async getOrder(id: string): Promise<Order | null> {
      const o = check(await sb.rpc('get_order_json', { p_id: id })) as Row | null;
      if (!o) return null;
      return {
        id: o.id, no: o.no, channel: o.channel, tableId: o.tableId ?? undefined, table: o.table ?? undefined,
        customer: o.customer ?? undefined, note: o.note ?? undefined, status: o.status,
        paymentStatus: o.paymentStatus, method: o.method as PaymentMethod, paymentRef: o.paymentRef ?? undefined,
        total: Number(o.total), costTotal: Number(o.costTotal), createdAt: o.createdAt,
        lines: (o.lines ?? []).map((l: Row): OrderLine => ({
          productId: l.productId, name: l.name, categoryId: l.categoryId, station: l.station, qty: l.qty,
          unitPrice: Number(l.unitPrice), lineTotal: Number(l.lineTotal), unitCost: Number(l.unitCost),
          options: l.options ?? [], note: l.note ?? undefined,
        })),
      };
    },
    async setOrderStatus(id, to: OrderStatus) {
      check(await sb.rpc('set_order_status', { p_id: id, p_to: to }));
    },
    async confirmPayment(id, method: PaymentMethod, reference?: string) {
      check(await sb.rpc('confirm_payment', { p_id: id, p_method: method, p_ref: reference ?? '' }));
    },

    async listIngredients(): Promise<Ingredient[]> {
      const rows = check(await sb.from('inventory').select('*').order('name'));
      return rows.map((i: Row) => ({
        id: i.id, name: i.name, unit: i.unit, qty: Number(i.qty), minQty: Number(i.min_qty),
        unitCost: Number(i.unit_cost), supplier: i.supplier ?? undefined,
      }));
    },
    async saveIngredient(input) {
      const base = { name: input.name.trim(), unit: input.unit, min_qty: input.minQty, unit_cost: input.unitCost, supplier: input.supplier ?? null };
      if (input.id) {
        check(await sb.from('inventory').update({ ...base, updated_at: new Date().toISOString() }).eq('id', input.id));
      } else {
        check(await sb.from('inventory').insert({ ...base, qty: input.qty }));
      }
    },
    async adjustStock(id, delta, reason: StockReason) {
      check(await sb.rpc('adjust_stock', { p_id: id, p_delta: delta, p_reason: reason }));
    },
    async listRecipes(): Promise<Record<string, RecipeItem[]>> {
      const rows = check(await sb.from('recipes').select('product_id, recipe_items(ingredient_id, qty)'));
      const out: Record<string, RecipeItem[]> = {};
      for (const r of rows as Row[]) {
        out[r.product_id] = (r.recipe_items ?? []).map((ri: Row) => ({ ingredientId: ri.ingredient_id, qty: Number(ri.qty) }));
      }
      return out;
    },
    async saveRecipe(productId, items: RecipeItem[]) {
      const existing = check(await sb.from('recipes').select('id').eq('product_id', productId).maybeSingle()) as Row | null;
      if (items.length === 0) {
        if (existing) check(await sb.from('recipes').delete().eq('id', existing.id));
        return;
      }
      const recipe = existing ?? check(await sb.from('recipes').insert({ product_id: productId }).select('id').single()) as Row;
      check(await sb.from('recipe_items').delete().eq('recipe_id', recipe.id));
      check(await sb.from('recipe_items').insert(items.map((i) => ({ recipe_id: recipe.id, ingredient_id: i.ingredientId, qty: i.qty }))));
    },

    async listExpenses({ from, to }): Promise<Expense[]> {
      const rows = check(await sb.from('expenses').select('*').gte('spent_on', from).lte('spent_on', to).order('spent_on', { ascending: false }));
      return rows.map((e: Row) => ({ id: e.id, spentOn: e.spent_on, category: e.category, amount: Number(e.amount), note: e.note ?? undefined }));
    },
    async addExpense(e) {
      check(await sb.from('expenses').insert({ spent_on: e.spentOn, category: e.category, amount: e.amount, note: e.note ?? null }));
    },
    async deleteExpense(id) {
      check(await sb.from('expenses').delete().eq('id', id));
    },

    async getSettings(): Promise<ShopSettings> {
      const s = check(await sb.from('shop_settings').select('*').eq('id', 1).single()) as Row;
      return {
        shopName: s.shop_name, phone: s.phone, address: s.address,
        promptpayId: s.promptpay_id, openingHours: s.opening_hours,
      };
    },
    async saveSettings(s) {
      check(await sb.from('shop_settings').update({
        shop_name: s.shopName, phone: s.phone, address: s.address,
        promptpay_id: s.promptpayId, opening_hours: s.openingHours, updated_at: new Date().toISOString(),
      }).eq('id', 1));
    },

    subscribe(fn) {
      const channel = sb.channel(`ldc-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fn)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, fn)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fn)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, fn)
        .subscribe();
      return () => { void sb.removeChannel(channel); };
    },
  };
}
