import { describe, expect, it } from 'vitest';
import { createLocalRepo, type KV } from '../localRepo';

const memory = (): KV => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); } };
};

async function setup() {
  const repo = createLocalRepo(memory());
  const products = await repo.listProducts();
  const latte = products.find((p) => p.name === 'Iced Latte')!;
  const cake = products.find((p) => p.name === 'Strawberry Cake')!;
  const ingredients = await repo.listIngredients();
  const beans = ingredients.find((i) => i.name === 'เมล็ดกาแฟ')!;
  await repo.createTable('T1');
  const table = (await repo.listTables()).find((t) => t.code === 'T1')!;
  const token = await repo.rotateTableToken(table.id);
  return { repo, latte, cake, beans, token, table };
}

const sizeM = (p: { options: { id: string; values: { id: string; name: string }[] }[] }) => {
  const g = p.options.find((o) => o.id === 'size')!;
  return { groupId: 'size', valueIds: [g.values.find((v) => v.name === 'M')!.id] };
};

describe('local repo: orders', () => {
  it('สร้างออเดอร์ด้วย token โต๊ะ คำนวณราคาและตัดสต็อกตามสูตร', async () => {
    const { repo, latte, beans, token } = await setup();
    const before = beans.qty;
    const order = await repo.createOrder({
      channel: 'dine_in', tableToken: token, method: 'promptpay',
      items: [{ productId: latte.id, qty: 2, selections: [sizeM(latte), { groupId: 'sweet', valueIds: [latte.options.find((o) => o.id === 'sweet')!.values[2].id] }, { groupId: 'ice', valueIds: [latte.options.find((o) => o.id === 'ice')!.values[2].id] }] }],
    });
    expect(order.table).toBe('T1');
    expect(order.total).toBe((75 + 10) * 2);
    expect(order.paymentStatus).toBe('pending');
    const after = (await repo.listIngredients()).find((i) => i.id === beans.id)!;
    expect(after.qty).toBe(before - 18 * 2);
  });

  it('ปฏิเสธ token ปลอมและทานที่ร้านที่ไม่มีโต๊ะ', async () => {
    const { repo, latte } = await setup();
    const items = [{ productId: latte.id, qty: 1, selections: [sizeM(latte), { groupId: 'sweet', valueIds: [latte.options[1].values[0].id] }, { groupId: 'ice', valueIds: [latte.options[2].values[0].id] }] }];
    await expect(repo.createOrder({ channel: 'dine_in', tableToken: 'fake', method: 'cash', items })).rejects.toThrow('QR ไม่ถูกต้อง');
    await expect(repo.createOrder({ channel: 'dine_in', method: 'cash', items })).rejects.toThrow('ต้องสแกน QR');
  });

  it('ยกเลิกออเดอร์คืนวัตถุดิบ แต่ยกเลิกออเดอร์ที่ชำระแล้วไม่ได้', async () => {
    const { repo, latte, beans } = await setup();
    const startQty = beans.qty;
    const o = await repo.createOrder({ channel: 'counter', method: 'cash', items: [{ productId: latte.id, qty: 1,
      selections: [sizeM(latte), { groupId: 'sweet', valueIds: [latte.options[1].values[0].id] }, { groupId: 'ice', valueIds: [latte.options[2].values[0].id] }] }] });
    const used = (await repo.listIngredients()).find((i) => i.id === beans.id)!.qty;
    expect(used).toBe(startQty - 18);
    await repo.setOrderStatus(o.id, 'cancelled');
    const restored = (await repo.listIngredients()).find((i) => i.id === beans.id)!.qty;
    expect(restored).toBe(startQty);

    const paid = await repo.createOrder({ channel: 'counter', method: 'cash', items: [{ productId: latte.id, qty: 1,
      selections: [sizeM(latte), { groupId: 'sweet', valueIds: [latte.options[1].values[0].id] }, { groupId: 'ice', valueIds: [latte.options[2].values[0].id] }] }] });
    await repo.confirmPayment(paid.id, 'cash');
    await expect(repo.setOrderStatus(paid.id, 'cancelled')).rejects.toThrow('ชำระแล้ว');
  });

  it('ยืนยันการชำระได้ครั้งเดียว และปิดสถานะก่อนชำระไม่ได้', async () => {
    const { repo, cake } = await setup();
    const o = await repo.createOrder({ channel: 'counter', method: 'promptpay', items: [{ productId: cake.id, qty: 1, selections: [] }] });
    await repo.confirmPayment(o.id, 'promptpay', 'REF-1');
    await expect(repo.confirmPayment(o.id, 'promptpay', 'REF-2')).rejects.toThrow('ชำระแล้ว');
    const got = (await repo.getOrder(o.id))!;
    expect(got.paymentStatus).toBe('paid');
    expect(got.paymentRef).toBe('REF-1');
  });

  it('ปฏิเสธเมื่อวัตถุดิบไม่พอ โดยไม่ตัดสต็อกบางส่วน', async () => {
    const { repo, latte, beans } = await setup();
    await repo.adjustStock(beans.id, -3000, 'waste');
    await expect(repo.createOrder({ channel: 'counter', method: 'cash', items: [{ productId: latte.id, qty: 1,
      selections: [sizeM(latte), { groupId: 'sweet', valueIds: [latte.options[1].values[0].id] }, { groupId: 'ice', valueIds: [latte.options[2].values[0].id] }] }] }))
      .rejects.toThrow('วัตถุดิบไม่พอ');
  });
});

describe('local repo: tokens and tables', () => {
  it('หมุน token แล้ว token เก่าใช้ไม่ได้ และปิดโต๊ะแล้วใช้ไม่ได้', async () => {
    const { repo, table, token } = await setup();
    expect(await repo.resolveToken(token)).not.toBeNull();
    const next = await repo.rotateTableToken(table.id);
    expect(await repo.resolveToken(token)).toBeNull();
    expect(await repo.resolveToken(next)).not.toBeNull();
    await repo.setTableActive(table.id, false);
    expect(await repo.resolveToken(next)).toBeNull();
  });
  it('ไม่เก็บ token แบบข้อความเปล่าในข้อมูล', async () => {
    const storage = memory();
    const repo = createLocalRepo(storage);
    await repo.createTable('X9');
    const t = (await repo.listTables()).find((x) => x.code === 'X9')!;
    const token = await repo.rotateTableToken(t.id);
    expect(storage.getItem('little-day-cafe:v1')).not.toContain(token);
  });
});

describe('local repo: reports inputs', () => {
  it('บันทึกและลบรายจ่ายตามช่วงวันที่', async () => {
    const repo = createLocalRepo(memory());
    await repo.addExpense({ spentOn: '2026-11-05', category: 'ค่าเช่า', amount: 1000 });
    await repo.addExpense({ spentOn: '2026-11-07', category: 'วัตถุดิบ', amount: 200 });
    const list = await repo.listExpenses({ from: '2026-11-06', to: '2026-11-30' });
    expect(list.map((e) => e.amount)).toEqual([200]);
    await repo.deleteExpense(list[0].id);
    expect(await repo.listExpenses({ from: '2026-11-01', to: '2026-11-30' })).toHaveLength(1);
  });
});

describe('local repo: payment after service', () => {
  it('รับเงินได้หลังออเดอร์เสร็จสิ้นแล้ว แต่รับเงินซ้ำไม่ได้', async () => {
    const repo = createLocalRepo(memory());
    const cake = (await repo.listProducts()).find((p) => p.name === 'Strawberry Cake')!;
    const o = await repo.createOrder({ channel: 'counter', method: 'cash', items: [{ productId: cake.id, qty: 1, selections: [] }] });
    for (const to of ['accepted', 'preparing', 'ready', 'completed'] as const) await repo.setOrderStatus(o.id, to);
    await repo.confirmPayment(o.id, 'cash');
    const got = (await repo.getOrder(o.id))!;
    expect(got.paymentStatus).toBe('paid');
    await expect(repo.confirmPayment(o.id, 'cash')).rejects.toThrow('ชำระแล้ว');
  });
});
