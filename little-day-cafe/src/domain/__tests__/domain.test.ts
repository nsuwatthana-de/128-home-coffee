import { describe, expect, it } from 'vitest';
import { priceLine, ValidationError } from '../pricing';
import { canTransition, nextStatus } from '../status';
import { requiredStock, shortages, recipeCost } from '../stock';
import { buildPromptPayPayload, crc16, normalizeTarget } from '../promptpay';
import { summarize, toCSV } from '../reports';
import type { Ingredient, Order, Product } from '../../types';

const latte: Product = {
  id: 'p1', categoryId: 'coffee', name: 'Iced Latte', description: '', price: 75, emoji: '', available: true, featured: false,
  options: [
    { id: 'size', name: 'ขนาด', type: 'single', required: true, values: [
      { id: 's', name: 'S', priceDelta: 0 }, { id: 'l', name: 'L', priceDelta: 20 }] },
    { id: 'shot', name: 'เพิ่มช็อต', type: 'multi', required: false, values: [{ id: 'sh', name: 'ช็อต', priceDelta: 20 }] },
  ],
};

describe('pricing', () => {
  it('คำนวณราคาจากตัวเลือกและจำนวน', () => {
    const l = priceLine(latte, 'beverage', { productId: 'p1', qty: 2, selections: [
      { groupId: 'size', valueIds: ['l'] }, { groupId: 'shot', valueIds: ['sh'] }] });
    expect(l.unitPrice).toBe(115);
    expect(l.lineTotal).toBe(230);
    expect(l.options).toEqual(['L', 'ช็อต']);
  });
  it('ปฏิเสธตัวเลือกที่บังคับแต่ไม่ได้เลือก', () => {
    expect(() => priceLine(latte, 'beverage', { productId: 'p1', qty: 1, selections: [] })).toThrow(ValidationError);
  });
  it('ปฏิเสธจำนวนผิดและเมนูที่หมด', () => {
    expect(() => priceLine(latte, 'beverage', { productId: 'p1', qty: 0, selections: [{ groupId: 'size', valueIds: ['s'] }] })).toThrow();
    expect(() => priceLine({ ...latte, available: false }, 'beverage', { productId: 'p1', qty: 1, selections: [{ groupId: 'size', valueIds: ['s'] }] })).toThrow('หมดชั่วคราว');
  });
  it('ปฏิเสธตัวเลือกที่ไม่มีอยู่จริงในสินค้า', () => {
    expect(() => priceLine(latte, 'beverage', { productId: 'p1', qty: 1, selections: [{ groupId: 'size', valueIds: ['xxl'] }] })).toThrow();
    expect(() => priceLine(latte, 'beverage', { productId: 'p1', qty: 1, selections: [{ groupId: 'nope', valueIds: [] }] })).toThrow();
  });
});

describe('status', () => {
  it('ไปตามลำดับและยกเลิกได้ก่อนเสร็จสิ้นเท่านั้น', () => {
    expect(nextStatus('new')).toBe('accepted');
    expect(canTransition('new', 'preparing')).toBe(false);
    expect(canTransition('ready', 'completed')).toBe(true);
    expect(canTransition('preparing', 'cancelled')).toBe(true);
    expect(canTransition('completed', 'cancelled')).toBe(false);
  });
});

describe('stock', () => {
  const ings: Ingredient[] = [
    { id: 'milk', name: 'นม', unit: 'ml', qty: 500, minQty: 100, unitCost: 0.05 },
    { id: 'beans', name: 'เมล็ดกาแฟ', unit: 'g', qty: 10, minQty: 50, unitCost: 0.8 },
  ];
  const recipes = { p1: [{ ingredientId: 'milk', qty: 200 }, { ingredientId: 'beans', qty: 18 }] };
  it('คำนวณปริมาณที่ใช้และหาวัตถุดิบที่ไม่พอ', () => {
    const need = requiredStock([{ productId: 'p1', qty: 2 }], recipes);
    expect(need.get('milk')).toBe(400);
    expect(shortages(need, ings)).toEqual(['เมล็ดกาแฟ']);
  });
  it('คำนวณต้นทุนต่อชิ้นจากสูตร', () => {
    expect(recipeCost(recipes.p1, ings)).toBeCloseTo(200 * 0.05 + 18 * 0.8);
  });
});

describe('promptpay', () => {
  it('CRC-16/CCITT-FALSE ตรงกับค่าอ้างอิง', () => {
    expect(crc16('123456789')).toBe('29B1');
  });
  it('แปลงเบอร์มือถือเป็นรูปแบบ 0066', () => {
    expect(normalizeTarget('081-234-5678')).toEqual({ subTag: '01', value: '0066812345678' });
  });
  it('สร้าง payload ที่มียอดและจบด้วย CRC ถูกต้อง', () => {
    const payload = buildPromptPayPayload({ target: '0812345678', amount: 265, reference: 'A013' });
    expect(payload).toContain('5406265.00');
    expect(payload).toContain('0066812345678');
    const body = payload.slice(0, -4);
    expect(payload.slice(-4)).toBe(crc16(body));
    expect(body.endsWith('6304')).toBe(true);
  });
  it('ไม่สร้าง QR สำหรับยอด 0', () => {
    expect(() => buildPromptPayPayload({ target: '0812345678', amount: 0 })).toThrow();
  });
});

describe('reports', () => {
  const base = { channel: 'counter', status: 'completed', method: 'cash', createdAt: '', lines: [], note: undefined } as const;
  const orders: Order[] = [
    { ...base, id: 'a', no: 'A001', paymentStatus: 'paid', total: 100, costTotal: 30, lines: [
      { productId: 'p1', name: 'Latte', categoryId: 'coffee', station: 'beverage', qty: 2, unitPrice: 50, lineTotal: 100, unitCost: 15, options: [] }] },
    { ...base, id: 'b', no: 'A002', paymentStatus: 'unpaid', total: 50, costTotal: 10, status: 'ready', lines: [
      { productId: 'p2', name: 'Cake', categoryId: 'cake', station: 'bakery', qty: 1, unitPrice: 50, lineTotal: 50, unitCost: 10, options: [] }] },
    { ...base, id: 'c', no: 'A003', paymentStatus: 'paid', total: 999, costTotal: 999, status: 'cancelled', lines: [] },
  ];
  it('รายรับนับเฉพาะที่ชำระแล้วและไม่ยกเลิก', () => {
    const s = summarize(orders, [{ id: 'e', spentOn: '2026-11-07', category: 'วัตถุดิบ', amount: 20 }]);
    expect(s.revenue).toBe(100);
    expect(s.cost).toBe(30);
    expect(s.grossProfit).toBe(70);
    expect(s.netProfit).toBe(50);
    expect(s.orders).toBe(2);
    expect(s.topProducts[0].name).toBe('Latte');
  });
  it('CSV หนีอักขระพิเศษและมี BOM', () => {
    const csv = toCSV([['a', 'b,c'], ['"x"', 1]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"b,c"');
    expect(csv).toContain('"""x"""');
  });
});
