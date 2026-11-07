import type {
  Category, Channel, Expense, Ingredient, Order, OrderStatus, PaymentMethod, Product, RecipeItem,
  ShopSettings, StockReason, TableRow,
} from '../types';
import type { LineInput } from '../domain/pricing';

export interface ProductInput {
  id?: string;
  name: string;
  categoryId: string;
  description: string;
  price: number;
  emoji: string;
  available: boolean;
  featured: boolean;
}

export interface CreateOrderInput {
  channel: Channel;
  tableToken?: string; // โทเคนจาก QR (ลูกค้า) ห้ามใช้เลขโต๊ะจาก URL ยืนยันตัวตน
  customer?: string;
  note?: string;
  method: PaymentMethod;
  items: LineInput[];
}

export interface Range {
  from: string; // ISO datetime (รวม)
  to: string; // ISO datetime (ไม่รวม)
}

// ชั้นข้อมูลกลาง: หน้าจอเรียกใช้เฉพาะ interface นี้ ไม่รู้ว่าข้อมูลเก็บที่ไหน
export interface Repo {
  readonly mode: 'local' | 'supabase';

  listCategories(): Promise<Category[]>;
  listProducts(): Promise<Product[]>;
  saveProduct(input: ProductInput): Promise<void>;
  setProductAvailable(id: string, available: boolean): Promise<void>;

  listTables(): Promise<TableRow[]>;
  createTable(code: string): Promise<void>;
  setTableActive(id: string, active: boolean): Promise<void>;
  rotateTableToken(id: string): Promise<string>; // คืน token ใหม่ครั้งเดียวเพื่อสร้าง QR
  resolveToken(token: string): Promise<{ tableId: string; code: string } | null>;

  createOrder(input: CreateOrderInput): Promise<Order>;
  listOrders(range: Range): Promise<Order[]>;
  getOrder(id: string): Promise<Order | null>;
  setOrderStatus(id: string, to: OrderStatus): Promise<void>;
  confirmPayment(id: string, method: PaymentMethod, reference?: string): Promise<void>;

  listIngredients(): Promise<Ingredient[]>;
  saveIngredient(input: Omit<Ingredient, 'id'> & { id?: string }): Promise<void>;
  adjustStock(id: string, delta: number, reason: StockReason): Promise<void>;
  listRecipes(): Promise<Record<string, RecipeItem[]>>;
  saveRecipe(productId: string, items: RecipeItem[]): Promise<void>;

  listExpenses(range: { from: string; to: string }): Promise<Expense[]>; // วันที่ YYYY-MM-DD
  addExpense(e: Omit<Expense, 'id'>): Promise<void>;
  deleteExpense(id: string): Promise<void>;

  getSettings(): Promise<ShopSettings>;
  saveSettings(s: ShopSettings): Promise<void>;

  subscribe(fn: () => void): () => void;
}
