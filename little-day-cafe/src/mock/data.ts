// ข้อมูลตัวอย่างสำหรับ Phase 1 (UI เท่านั้น) จะถูกแทนด้วย Supabase ใน Phase 3
import type { Category, Order, Product, Table } from '../types';

export const categories: Category[] = [
  { id: 'coffee', name: 'กาแฟ', station: 'beverage', emoji: '☕' },
  { id: 'tea', name: 'ชาและมัทฉะ', station: 'beverage', emoji: '🍵' },
  { id: 'cake', name: 'เค้ก', station: 'bakery', emoji: '🍰' },
  { id: 'bread', name: 'ขนมปัง', station: 'bakery', emoji: '🥐' },
];

const sizeOption = {
  id: 'size', name: 'ขนาด', type: 'single' as const, required: true,
  values: [
    { id: 's', name: 'S', priceDelta: 0 },
    { id: 'm', name: 'M', priceDelta: 10 },
    { id: 'l', name: 'L', priceDelta: 20 },
  ],
};
const sweetOption = {
  id: 'sweet', name: 'ระดับความหวาน', type: 'single' as const, required: true,
  values: [0, 25, 50, 75, 100].map((v) => ({ id: `sw${v}`, name: `${v}%`, priceDelta: 0 })),
};
const iceOption = {
  id: 'ice', name: 'ระดับน้ำแข็ง', type: 'single' as const, required: true,
  values: ['ไม่ใส่', 'น้อย', 'ปกติ', 'เพิ่ม'].map((v, i) => ({ id: `ice${i}`, name: v, priceDelta: 0 })),
};
const milkOption = {
  id: 'milk', name: 'ประเภทนม', type: 'single' as const, required: false,
  values: [
    { id: 'fresh', name: 'นมสด', priceDelta: 0 },
    { id: 'oat', name: 'นมโอ๊ต', priceDelta: 15 },
    { id: 'almond', name: 'นมอัลมอนด์', priceDelta: 15 },
  ],
};
const shotOption = {
  id: 'shot', name: 'เพิ่มช็อต', type: 'multi' as const, required: false,
  values: [{ id: 'shot1', name: 'เพิ่ม 1 ช็อต', priceDelta: 20 }],
};

export const products: Product[] = [
  { id: 'p1', categoryId: 'coffee', name: 'Iced Latte', description: 'เอสเปรสโซ่กับนมเย็น', price: 75, emoji: '🥛', available: true, featured: true,
    options: [sizeOption, sweetOption, iceOption, milkOption, shotOption] },
  { id: 'p2', categoryId: 'coffee', name: 'Americano', description: 'เอสเปรสโซ่เข้มกับน้ำเปล่า', price: 60, emoji: '☕', available: true, featured: false,
    options: [sizeOption, iceOption, shotOption] },
  { id: 'p3', categoryId: 'tea', name: 'Iced Matcha Latte', description: 'มัทฉะญี่ปุ่นกับนมสด', price: 85, emoji: '🍵', available: true, featured: true,
    options: [sizeOption, sweetOption, iceOption, milkOption] },
  { id: 'p4', categoryId: 'tea', name: 'Hojicha Latte', description: 'ชาโฮจิฉะคั่วหอม', price: 80, emoji: '🫖', available: false, featured: false,
    options: [sizeOption, sweetOption, iceOption, milkOption] },
  { id: 'p5', categoryId: 'cake', name: 'Strawberry Cake', description: 'เค้กสตรอว์เบอร์รีครีมนุ่ม', price: 95, emoji: '🍓', available: true, featured: true, options: [] },
  { id: 'p6', categoryId: 'cake', name: 'Basque Cheesecake', description: 'ชีสเค้กเนื้อเข้มผิวไหม้', price: 110, emoji: '🧀', available: true, featured: false, options: [] },
  { id: 'p7', categoryId: 'bread', name: 'Croissant', description: 'ครัวซองต์เนยอบกรอบ', price: 65, emoji: '🥐', available: true, featured: true, options: [] },
  { id: 'p8', categoryId: 'bread', name: 'Shokupan', description: 'ขนมปังโชกุปังนุ่มหอม', price: 120, emoji: '🍞', available: true, featured: false, options: [] },
];

export const tables: Table[] = [
  { id: 't1', code: 'A01', active: true },
  { id: 't2', code: 'A02', active: true },
  { id: 't3', code: 'B01', active: true },
  { id: 't4', code: 'B02', active: false },
];

const now = Date.now();
const min = (m: number) => new Date(now - m * 60_000).toISOString();

export const orders: Order[] = [
  { id: 'o1', no: 'A013', channel: 'dine_in', table: 'A01', status: 'new', paid: false, method: 'promptpay', total: 265, createdAt: min(1),
    lines: [{ name: 'Iced Latte', qty: 2, station: 'beverage', options: ['M', 'หวาน 50%', 'น้ำแข็งปกติ'] }, { name: 'Strawberry Cake', qty: 1, station: 'bakery', options: [] }] },
  { id: 'o2', no: 'A012', channel: 'dine_in', table: 'B02', status: 'preparing', paid: true, method: 'cash', total: 85, createdAt: min(6),
    lines: [{ name: 'Iced Matcha Latte', qty: 1, station: 'beverage', options: ['M', 'หวาน 25%', 'นมโอ๊ต'], note: 'ไม่เอาวิปครีม' }] },
  { id: 'o3', no: 'A011', channel: 'takeaway', customer: 'คุณแพร', status: 'ready', paid: true, method: 'promptpay', total: 195, createdAt: min(12),
    lines: [{ name: 'Croissant', qty: 2, station: 'bakery', options: [] }, { name: 'Americano', qty: 1, station: 'beverage', options: ['เย็น'] }] },
  { id: 'o4', no: 'A010', channel: 'counter', status: 'completed', paid: true, method: 'cash', total: 120, createdAt: min(40),
    lines: [{ name: 'Shokupan', qty: 1, station: 'bakery', options: [] }] },
];

export const salesSeries = [
  { day: 'จ.', value: 3200 }, { day: 'อ.', value: 4100 }, { day: 'พ.', value: 3800 },
  { day: 'พฤ.', value: 4600 }, { day: 'ศ.', value: 5200 }, { day: 'ส.', value: 6100 }, { day: 'อา.', value: 4850 },
];
