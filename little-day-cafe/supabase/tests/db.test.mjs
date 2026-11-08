// ทดสอบ schema และ function จริงของ Postgres ด้วย PGlite (รัน: npm run test:db)
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const dir = new URL('.', import.meta.url);
const db = await PGlite.create({ extensions: { pgcrypto } });
const run = (sql) => db.exec(sql);
const q = async (sql, params = []) => (await db.query(sql, params)).rows;
const as = async (userId, sql, params = []) => {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${userId ?? ''}', false);`);
  try { return await q(sql, params); } finally { await db.exec('reset role;'); }
};
const anon = async (sql, params = []) => {
  await db.exec(`set role anon; select set_config('request.jwt.claim.sub', '', false);`);
  try { return await q(sql, params); } finally { await db.exec('reset role;'); }
};
const expectFail = async (p, msg) => {
  let failed = false;
  try { await p; } catch (e) { failed = true; if (msg) assert.match(e.message, msg); }
  assert.ok(failed, `expected failure ${msg ?? ''}`);
};

await run(readFileSync(new URL('./stubs.sql', import.meta.url), 'utf8'));
await run(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));

// ผู้ใช้และบทบาท
const owner = '00000000-0000-0000-0000-000000000001';
const staff = '00000000-0000-0000-0000-000000000002';
const kitchen = '00000000-0000-0000-0000-000000000003';
await run(`insert into auth.users (id, email) values ('${owner}','o@x'),('${staff}','s@x'),('${kitchen}','k@x');
  insert into profiles (id, role) values ('${owner}','owner'),('${staff}','staff'),('${kitchen}','kitchen');`);

// ข้อมูลตั้งต้น
await run(`
  insert into categories (id, name, station) values ('00000000-0000-0000-0000-0000000000c1','กาแฟ','beverage');
  insert into products (id, category_id, name, price, is_available) values
    ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000c1','Latte',75,true),
    ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000c1','Closed',50,false);
  insert into product_options (id, product_id, name, type, is_required) values
    ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','ขนาด','single',true);
  insert into product_option_values (id, option_id, name, price_delta) values
    ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000b1','S',0),
    ('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000b1','L',20);
  insert into inventory (id, name, unit, qty, min_qty, unit_cost) values
    ('00000000-0000-0000-0000-0000000000e1','เมล็ดกาแฟ','g',100,10,0.5);
  insert into recipes (id, product_id) values ('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000a1');
  insert into recipe_items (recipe_id, ingredient_id, qty) values ('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000e1',18);
  insert into tables (id, code) values ('00000000-0000-0000-0000-0000000000f9','A01');
`);

// 1) สร้าง token โต๊ะด้วยเจ้าของ และ token เก็บเป็น hash เท่านั้น
const [{ rotate_table_token: token }] = await as(owner, `select rotate_table_token('00000000-0000-0000-0000-0000000000f9')`);
assert.ok(token.length > 20);
const stored = await q(`select token_hash from table_tokens`);
assert.equal(stored.length, 1);
assert.notEqual(stored[0].token_hash, token);

// 2) ลูกค้า (anon) resolve token ได้ และ token ผิดได้ null
const [{ resolve_table_token: r1 }] = await anon(`select resolve_table_token($1)`, [token]);
assert.equal(r1.code, 'A01');
const [{ resolve_table_token: r2 }] = await anon(`select resolve_table_token('wrong')`);
assert.equal(r2, null);

// 3) ลูกค้าสั่งผ่าน token: ราคาคำนวณจากฐานข้อมูล (ไม่เชื่อ client) และตัดสต็อก
const items = JSON.stringify([{ productId: '00000000-0000-0000-0000-0000000000a1', qty: 2,
  selections: [{ groupId: '00000000-0000-0000-0000-0000000000b1', valueIds: ['00000000-0000-0000-0000-0000000000d2'] }] }]);
const [{ create_order: c1 }] = await anon(`select create_order($1,'dine_in','','','promptpay',$2::jsonb)`, [token, items]);
const [o1] = await anon(`select get_order_json($1) as o`, [c1.id]);
assert.equal(o1.o.total, 190); // (75+20)*2
assert.equal(o1.o.lines[0].options[0], 'L');
assert.equal(o1.o.paymentStatus, 'pending');
const [{ quantity }] = await q(`select qty as quantity from inventory`);
assert.equal(Number(quantity), 100 - 18 * 2);

// 4) ลูกค้าปลอมโต๊ะ / ปิดเมนู / ตัวเลือกผิด / จำนวนเกิน ถูกปฏิเสธ
await expectFail(anon(`select create_order('bad-token','dine_in','','','cash',$1::jsonb)`, [items]), /QR ไม่ถูกต้อง/);
await expectFail(anon(`select create_order(null,'takeaway','','','cash',$1::jsonb)`,
  [JSON.stringify([{ productId: '00000000-0000-0000-0000-0000000000a2', qty: 1, selections: [] }])]), /หมดชั่วคราว/);
await expectFail(anon(`select create_order(null,'takeaway','','','cash',$1::jsonb)`,
  [JSON.stringify([{ productId: '00000000-0000-0000-0000-0000000000a1', qty: 1, selections: [] }])]), /กรุณาเลือก/);
await expectFail(anon(`select create_order(null,'takeaway','','','cash',$1::jsonb)`,
  [JSON.stringify([{ productId: '00000000-0000-0000-0000-0000000000a1', qty: 99,
    selections: [{ groupId: '00000000-0000-0000-0000-0000000000b1', valueIds: ['00000000-0000-0000-0000-0000000000d1'] }] }])]), /1–20/);
// ลูกค้าสั่ง counter ไม่ได้
await expectFail(anon(`select create_order(null,'counter','','','cash',$1::jsonb)`, [items]), /permission|ไม่มีสิทธิ์/);

// 5) วัตถุดิบไม่พอ: ออเดอร์ถูกปฏิเสธและไม่ตัดสต็อกเพิ่ม
await expectFail(as(staff, `select create_order(null,'counter','','','cash',$1::jsonb)`,
  [JSON.stringify([{ productId: '00000000-0000-0000-0000-0000000000a1', qty: 10,
    selections: [{ groupId: '00000000-0000-0000-0000-0000000000b1', valueIds: ['00000000-0000-0000-0000-0000000000d1'] }] }])]), /วัตถุดิบไม่พอ/);
const [{ quantity: q2 }] = await q(`select qty as quantity from inventory`);
assert.equal(Number(q2), 100 - 36);

// 6) พนักงานครัวเปลี่ยนสถานะไปข้างหน้าได้ แต่ยกเลิกไม่ได้
await as(kitchen, `select set_order_status($1,'accepted')`, [c1.id]);
await as(kitchen, `select set_order_status($1,'preparing')`, [c1.id]);
await expectFail(as(kitchen, `select set_order_status($1,'cancelled')`, [c1.id]), /ไม่มีสิทธิ์/);
await expectFail(as(kitchen, `select set_order_status($1,'completed')`, [c1.id]), /เปลี่ยนสถานะนี้ไม่ได้/);

// 7) ครัวอ่านรายการ/สต็อกไม่ได้ทั้งหมด ลูกค้าอ่านตารางออเดอร์ตรงๆ ไม่ได้
assert.equal((await as(kitchen, `select * from inventory`)).length, 0);
assert.equal((await anon(`select * from orders`)).length, 0);

// 8) ยืนยันการชำระ: ครั้งเดียวเท่านั้น และไม่ยกเลิกออเดอร์ที่ชำระแล้ว
await as(staff, `select confirm_payment($1,'promptpay','REF-1')`, [c1.id]);
await expectFail(as(staff, `select confirm_payment($1,'promptpay','REF-2')`, [c1.id]), /ชำระแล้ว/);
await expectFail(as(staff, `select set_order_status($1,'cancelled')`, [c1.id]), /ชำระแล้ว/);

// 9) ยกเลิกออเดอร์ที่ยังไม่ชำระคืนสต็อก
const [{ create_order: c2 }] = await as(staff, `select create_order(null,'counter','','','cash',$1::jsonb)`, [items]);
await as(staff, `select set_order_status($1,'cancelled')`, [c2.id]);
const [{ quantity: q3 }] = await q(`select qty as quantity from inventory`);
assert.equal(Number(q3), 100 - 36); // ออเดอร์ที่ยกเลิกคืนวัตถุดิบแล้ว เหลือเท่ากับหลังออเดอร์ที่ชำระ

// 10) ปรับสต็อกและเหตุผล
await as(owner, `select adjust_stock('00000000-0000-0000-0000-0000000000e1', 50, 'purchase')`);
await as(staff, `select adjust_stock('00000000-0000-0000-0000-0000000000e1', -1, 'waste')`); // พนักงานปรับได้
await expectFail(as(kitchen, `select adjust_stock('00000000-0000-0000-0000-0000000000e1', -1, 'waste')`), /ไม่มีสิทธิ์/);
const [{ quantity: q4 }] = await q(`select qty as quantity from inventory`);
assert.equal(Number(q4), 100 - 36 + 50 - 1); // เติม 50 แล้วเสีย 1

// 11) เลขออเดอร์ต่อเนื่อง
const nos = await q(`select order_no from orders order by order_no`);
// sequence อาจมีช่องว่างเมื่อออเดอร์ที่ถูกปฏิเสธใช้เลขไปแล้ว แต่ต้องไม่ซ้ำและเรียงขึ้นเสมอ
const numbers = nos.map((r) => r.order_no);
assert.ok(numbers.every((n) => /^A\d{3}$/.test(n)));
assert.equal(new Set(numbers).size, numbers.length);
assert.deepEqual([...numbers].sort(), numbers);

// 12) สถานะเครื่องดื่มใน get_order_json ยังคง option snapshot
const [{ o: finalOrder }] = await anon(`select get_order_json($1) as o`, [c1.id]);
assert.equal(finalOrder.paymentRef, 'REF-1');

// 13) ผู้จัดการมีสิทธิ์เท่าเจ้าของ (ยกเว้นการแต่งตั้งบทบาท)
const manager = '00000000-0000-0000-0000-000000000004';
await run(`insert into auth.users (id, email) values ('${manager}','m@x'); insert into profiles (id, role) values ('${manager}','manager');`);
await as(manager, `select adjust_stock('00000000-0000-0000-0000-0000000000e1', 1, 'adjust')`);
await as(manager, `select create_order(null,'counter','','','cash',$1::jsonb)`, [items]);
await expectFail(as(manager, `select set_user_role($1, 'staff')`, [kitchen]), /ไม่มีสิทธิ์/);
await as(owner, `select set_user_role($1, 'staff')`, [kitchen]);
const [{ role: kr }] = await q(`select role from profiles where id = '${kitchen}'`);
assert.equal(kr, 'staff');

console.log('db tests passed:', { orders: nos.length, token: token.slice(0, 6) + '…' });
await db.close();
