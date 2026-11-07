import type { Category, Expense, Ingredient, Product, RecipeItem, ShopSettings, StockReason } from '../types';

export interface StockTx { id: string; ingredientId: string; delta: number; reason: StockReason; createdAt: string }

export interface LocalDB {
  seq: number;
  categories: Category[];
  products: Product[];
  tables: { id: string; code: string; active: boolean; tokenHash: string | null }[];
  orders: import('../types').Order[];
  ingredients: Ingredient[];
  recipes: Record<string, RecipeItem[]>;
  stockTx: StockTx[];
  expenses: Expense[];
  settings: ShopSettings;
}

const opt = (id: string, name: string, type: 'single' | 'multi', required: boolean, values: [string, string, number][]) => ({
  id, name, type, required, values: values.map(([vid, vname, d]) => ({ id: `${id}-${vid}`, name: vname, priceDelta: d })),
});
const size = opt('size', 'ขนาด', 'single', true, [['s', 'S', 0], ['m', 'M', 10], ['l', 'L', 20]]);
const sweet = opt('sweet', 'ระดับความหวาน', 'single', true, [['0', '0%', 0], ['25', '25%', 0], ['50', '50%', 0], ['75', '75%', 0], ['100', '100%', 0]]);
const ice = opt('ice', 'ระดับน้ำแข็ง', 'single', true, [['0', 'ไม่ใส่', 0], ['1', 'น้อย', 0], ['2', 'ปกติ', 0], ['3', 'เพิ่ม', 0]]);
const milk = opt('milk', 'ประเภทนม', 'single', false, [['fresh', 'นมสด', 0], ['oat', 'นมโอ๊ต', 15], ['almond', 'นมอัลมอนด์', 15]]);
const shot = opt('shot', 'เพิ่มช็อต', 'multi', false, [['1', 'เพิ่ม 1 ช็อต', 20]]);

// ข้อมูลเริ่มต้นสำหรับโหมดทดลอง (สินค้าตัวอย่างตามสเปก LITTLE DAY CAFE)
export function seedDB(uid: () => string): LocalDB {
  const cat = { coffee: uid(), tea: uid(), cake: uid(), bread: uid() };
  const categories: Category[] = [
    { id: cat.coffee, name: 'กาแฟ', station: 'beverage', emoji: '☕' },
    { id: cat.tea, name: 'ชาและมัทฉะ', station: 'beverage', emoji: '🍵' },
    { id: cat.cake, name: 'เค้ก', station: 'bakery', emoji: '🍰' },
    { id: cat.bread, name: 'ขนมปัง', station: 'bakery', emoji: '🥐' },
  ];
  const ing = { milk: uid(), beans: uid(), matcha: uid(), berry: uid(), flour: uid(), butter: uid(), cheese: uid(), oat: uid() };
  const ingredients: Ingredient[] = [
    { id: ing.milk, name: 'นมสด', unit: 'ml', qty: 8000, minQty: 2000, unitCost: 0.05 },
    { id: ing.beans, name: 'เมล็ดกาแฟ', unit: 'g', qty: 3000, minQty: 500, unitCost: 0.8 },
    { id: ing.matcha, name: 'ผงมัทฉะ', unit: 'g', qty: 800, minQty: 150, unitCost: 3 },
    { id: ing.berry, name: 'สตรอว์เบอร์รี', unit: 'g', qty: 1500, minQty: 300, unitCost: 0.4 },
    { id: ing.flour, name: 'แป้งสาลี', unit: 'g', qty: 5000, minQty: 1000, unitCost: 0.06 },
    { id: ing.butter, name: 'เนยสด', unit: 'g', qty: 2000, minQty: 400, unitCost: 0.35 },
    { id: ing.cheese, name: 'ครีมชีส', unit: 'g', qty: 1200, minQty: 300, unitCost: 0.5 },
    { id: ing.oat, name: 'นมโอ๊ต', unit: 'ml', qty: 4000, minQty: 1000, unitCost: 0.12 },
  ];
  const p = (categoryId: string, name: string, description: string, price: number, emoji: string, options: Product['options'], featured = false): Product =>
    ({ id: uid(), categoryId, name, description, price, emoji, available: true, featured, options });
  const products: Product[] = [
    p(cat.coffee, 'Iced Latte', 'เอสเปรสโซ่กับนมเย็น', 75, '🥛', [size, sweet, ice, milk, shot], true),
    p(cat.coffee, 'Americano', 'เอสเปรสโซ่เข้มกับน้ำเปล่า', 60, '☕', [size, ice, shot]),
    p(cat.tea, 'Iced Matcha Latte', 'มัทฉะญี่ปุ่นกับนมสด', 85, '🍵', [size, sweet, ice, milk], true),
    p(cat.cake, 'Strawberry Cake', 'เค้กสตรอว์เบอร์รีครีมนุ่ม', 95, '🍓', [], true),
    p(cat.cake, 'Basque Cheesecake', 'ชีสเค้กเนื้อเข้มผิวไหม้', 110, '🧀', []),
    p(cat.bread, 'Croissant', 'ครัวซองต์เนยอบกรอบ', 65, '🥐', [], true),
    p(cat.bread, 'Shokupan', 'ขนมปังโชกุปังนุ่มหอม', 120, '🍞', []),
  ];
  const byName = (n: string) => products.find((x) => x.name === n)!.id;
  const recipes: Record<string, RecipeItem[]> = {
    [byName('Iced Latte')]: [{ ingredientId: ing.milk, qty: 200 }, { ingredientId: ing.beans, qty: 18 }],
    [byName('Americano')]: [{ ingredientId: ing.beans, qty: 18 }],
    [byName('Iced Matcha Latte')]: [{ ingredientId: ing.matcha, qty: 4 }, { ingredientId: ing.milk, qty: 200 }],
    [byName('Strawberry Cake')]: [{ ingredientId: ing.berry, qty: 60 }, { ingredientId: ing.cheese, qty: 40 }, { ingredientId: ing.flour, qty: 80 }],
    [byName('Basque Cheesecake')]: [{ ingredientId: ing.cheese, qty: 150 }],
    [byName('Croissant')]: [{ ingredientId: ing.butter, qty: 40 }, { ingredientId: ing.flour, qty: 60 }],
    [byName('Shokupan')]: [{ ingredientId: ing.flour, qty: 200 }, { ingredientId: ing.butter, qty: 20 }],
  };
  const tables = [
    { id: uid(), code: 'A01', active: true, tokenHash: null },
    { id: uid(), code: 'A02', active: true, tokenHash: null },
    { id: uid(), code: 'B01', active: true, tokenHash: null },
    { id: uid(), code: 'B02', active: false, tokenHash: null },
  ];
  return {
    seq: 0,
    categories,
    products,
    tables,
    orders: [],
    ingredients,
    recipes,
    stockTx: [],
    expenses: [],
    settings: {
      shopName: 'LITTLE DAY CAFE',
      phone: '',
      address: '',
      promptpayId: '',
      openingHours: '08:00 – 18:00',
    },
  };
}
