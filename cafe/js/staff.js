import { store } from './store.js';
import { CONFIG } from '../config.js';

const $ = (s) => document.querySelector(s);
const app = $('#app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '฿' + Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 });
const sum = (arr, k) => arr.reduce((s, x) => s + Number(x[k] || 0), 0);
const CATS = { drink: 'เครื่องดื่ม', cake: 'เค้ก', bread: 'ขนมปัง' };
const EXP_CATS = ['วัตถุดิบ', 'ค่าเช่า', 'ค่าน้ำ/ไฟ', 'ค่าแก๊ส/อินเทอร์เน็ต', 'ค่าขนส่ง', 'อุปกรณ์', 'อื่นๆ'];
const LABEL = { new: 'ใหม่', preparing: 'กำลังทำ', ready: 'รอเสิร์ฟ', served: 'เสิร์ฟแล้ว', cancelled: 'ยกเลิก' };
const NEXT = { new: 'preparing', preparing: 'ready', ready: 'served' };

const d2s = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const today = () => d2s(new Date());
const monthStart = () => today().slice(0, 8) + '01';

const state = {
  tab: 'orders',
  period: 'today', // today | month  (ใช้กับแท็บการเงินและรายงาน)
  menu: [],
  orders: [],
  expenses: [],
  editing: null, // null | {} (เมนูใหม่) | item (แก้ไข)
  error: '',
};

// ---------- โหลดข้อมูล ----------
async function load() {
  const from = monthStart(); // ดึงตั้งแต่ต้นเดือน แล้วกรองตามแท็บในฝั่งหน้าจอ
  const [menu, orders, expenses] = await Promise.all([
    store.listMenu(),
    store.listOrders(from),
    store.listExpenses(from),
  ]);
  Object.assign(state, { menu, orders, expenses });
}

const inPeriod = (dateStr) => state.period === 'month' ? dateStr >= monthStart() : dateStr === today();
const periodOrders = () => state.orders.filter((o) => inPeriod(d2s(new Date(o.created_at))));
const periodExpenses = () => state.expenses.filter((e) => inPeriod(e.spent_on));

// ---------- การแสดงผล ----------
function orderCard(o) {
  const time = new Date(o.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const items = o.items.map((l) => `${esc(l.name)}${l.option ? ` (${esc(l.option)})` : ''} × ${l.qty}`).join('<br>');
  const open = o.status !== 'cancelled';
  return `<div class="ocard st-${o.status}">
    <div class="row"><b>${o.table_code ? 'โต๊ะ ' + esc(o.table_code) : 'ไม่ระบุโต๊ะ'}</b><span class="muted">${time} · ${LABEL[o.status] || o.status}</span></div>
    ${o.customer_name ? `<div class="muted">ชื่อ: ${esc(o.customer_name)}</div>` : ''}
    <div class="items">${items}</div>
    ${o.note ? `<div class="note">📝 ${esc(o.note)}</div>` : ''}
    <div class="row"><b>${money(o.total)}</b><span class="${o.paid ? 'ok' : 'warn'}">${o.paid ? 'ชำระแล้ว (' + (o.payment_method === 'cash' ? 'เงินสด' : 'โอน') + ')' : 'ยังไม่ชำระ'}</span></div>
    <div class="actions">
      ${NEXT[o.status] ? `<button data-status="${esc(o.id)}" data-to="${NEXT[o.status]}">→ ${LABEL[NEXT[o.status]]}</button>` : ''}
      ${open && !o.paid ? `<button data-pay="${esc(o.id)}" data-method="cash">รับเงินสด</button><button data-pay="${esc(o.id)}" data-method="transfer">รับโอน</button>` : ''}
      ${open && o.status !== 'served' ? `<button class="danger" data-cancel="${esc(o.id)}">ยกเลิก</button>` : ''}
    </div>
  </div>`;
}

function renderOrders() {
  const list = state.orders.filter((o) => d2s(new Date(o.created_at)) === today());
  const active = list.filter((o) => o.status !== 'cancelled' && (o.status !== 'served' || !o.paid)).length;
  return `<h2 class="sec">ออเดอร์วันนี้ (${list.length} รายการ, ค้างอยู่ ${active})</h2>
    <div class="list">${list.map(orderCard).join('') || '<p class="muted">ยังไม่มีออเดอร์วันนี้</p>'}</div>`;
}

function menuForm(m) {
  const cats = Object.entries(CATS).map(([k, v]) => `<option value="${k}" ${m.category === k ? 'selected' : ''}>${v}</option>`).join('');
  return `<form class="form-box" id="menu-form">
    <input name="name" placeholder="ชื่อเมนู" required value="${esc(m.name || '')}">
    <select name="category">${cats}</select>
    <div class="grid2">
      <input name="price" type="number" min="0" step="1" placeholder="ราคาขาย" required value="${m.price ?? ''}">
      <input name="cost" type="number" min="0" step="1" placeholder="ต้นทุนต่อชิ้น" value="${m.cost ?? 0}">
    </div>
    <div class="grid2">
      <input name="emoji" placeholder="อีโมจิ" maxlength="4" value="${esc(m.emoji || '')}">
      <input name="options" placeholder="ตัวเลือก คั่นด้วยลูกน้ำ เช่น ร้อน,เย็น" value="${esc((m.options || []).join(','))}">
    </div>
    <div class="actions">
      <button type="submit">บันทึกเมนู</button>
      <button type="button" data-close-form>ยกเลิก</button>
    </div>
  </form>`;
}

function renderMenuTab() {
  const rows = state.menu.map((m) => `
    <div class="mrow">
      <span class="emoji">${esc(m.emoji || '🍽️')}</span>
      <div><b>${esc(m.name)}</b><br><small>${CATS[m.category]} · ขาย ${money(m.price)} · ต้นทุน ${money(m.cost)}${m.options?.length ? ' · ' + esc(m.options.join('/')) : ''}</small></div>
      <div class="stack">
        <label class="row"><input type="checkbox" data-avail="${esc(m.id)}" ${m.available ? 'checked' : ''} style="width:auto"> ขาย</label>
        <div class="row"><button data-edit="${esc(m.id)}">แก้ไข</button><button class="danger" data-del="${esc(m.id)}">ลบ</button></div>
      </div>
    </div>`).join('');
  return `<div class="toolbar"><button class="primary" data-new>+ เพิ่มเมนู</button></div>
    ${state.editing ? menuForm(state.editing) : ''}
    <div class="list">${rows || '<p class="muted">ยังไม่มีเมนู</p>'}</div>`;
}

function renderFinance() {
  const orders = periodOrders();
  const paid = orders.filter((o) => o.paid && o.status !== 'cancelled');
  const revenue = sum(paid, 'total');
  const cogs = sum(paid, 'cost_total');
  const exp = periodExpenses();
  const expTotal = sum(exp, 'amount');
  const unpaid = sum(orders.filter((o) => !o.paid && o.status !== 'cancelled'), 'total');
  const tile = (label, v, cls = '') => `<div class="tile"><small>${label}</small><b class="${cls}">${money(v)}</b></div>`;
  return `<div class="toolbar">${periodButtons()}</div>
    <div class="grid2">
      ${tile('รายรับ (ชำระแล้ว)', revenue, 'ok')}
      ${tile('ต้นทุนสินค้า', cogs)}
      ${tile('รายจ่ายอื่น', expTotal, 'warn')}
      ${tile('กำไรสุทธิ', revenue - cogs - expTotal, revenue - cogs - expTotal >= 0 ? 'ok' : 'warn')}
    </div>
    <p class="muted">เงินสด ${money(sum(paid.filter((o) => o.payment_method === 'cash'), 'total'))} · โอน ${money(sum(paid.filter((o) => o.payment_method === 'transfer'), 'total'))} · ค้างรับ ${money(unpaid)}</p>

    <h2 class="sec">บันทึกรายจ่าย</h2>
    <form class="form-box" id="expense-form">
      <div class="grid2">
        <input name="spent_on" type="date" value="${today()}" required>
        <select name="category">${EXP_CATS.map((c) => `<option>${c}</option>`).join('')}</select>
      </div>
      <div class="grid2">
        <input name="amount" type="number" min="1" step="1" placeholder="จำนวนเงิน" required>
        <input name="note" maxlength="60" placeholder="บันทึกเพิ่ม (ไม่บังคับ)">
      </div>
      <div class="actions"><button type="submit">บันทึกรายจ่าย</button></div>
    </form>
    <div class="list">${exp.map((e) => `
      <div class="mrow" style="grid-template-columns:1fr auto">
        <div><b>${money(e.amount)}</b> · ${esc(e.category)}<br><small>${e.spent_on}${e.note ? ' · ' + esc(e.note) : ''}</small></div>
        <button class="danger" data-exp-del="${esc(e.id)}">ลบ</button>
      </div>`).join('') || '<p class="muted">ยังไม่มีรายจ่ายในช่วงนี้</p>'}</div>`;
}

function renderReport() {
  const orders = periodOrders().filter((o) => o.status !== 'cancelled');
  const count = orders.length;
  const revenue = sum(orders, 'total');
  const avg = count ? revenue / count : 0;
  const tally = {};
  for (const o of orders) for (const l of o.items) {
    tally[l.name] = tally[l.name] || { qty: 0, sales: 0 };
    tally[l.name].qty += l.qty;
    tally[l.name].sales += l.qty * l.price;
  }
  const top = Object.entries(tally).sort((a, b) => b[1].qty - a[1].qty).slice(0, 10);
  const max = top[0]?.[1].qty || 1;
  return `<div class="toolbar">${periodButtons()}</div>
    <div class="grid2">
      <div class="tile"><small>จำนวนออเดอร์</small><b>${count}</b></div>
      <div class="tile"><small>ยอดเฉลี่ยต่อออเดอร์</small><b>${money(avg)}</b></div>
    </div>
    <h2 class="sec">เมนูขายดี</h2>
    <div class="bar-chart">${top.map(([name, v]) => `
      <div><div class="row"><span>${esc(name)}</span><small class="muted">${v.qty} ชิ้น · ${money(v.sales)}</small></div>
      <div class="b" style="width:${Math.round((v.qty / max) * 100)}%"></div></div>`).join('') || '<p class="muted">ยังไม่มีข้อมูลในช่วงนี้</p>'}</div>`;
}

function periodButtons() {
  return [['today', 'วันนี้'], ['month', 'เดือนนี้']]
    .map(([k, v]) => `<button data-period="${k}" class="${state.period === k ? 'on' : ''}">${v}</button>`).join('');
}

function render() {
  const views = { orders: renderOrders, menu: renderMenuTab, finance: renderFinance, report: renderReport };
  const err = state.error ? `<p class="err">${esc(state.error)}</p>` : '';
  app.innerHTML = err + views[state.tab]();
  document.querySelectorAll('#nav [data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === state.tab));
}

async function refresh() {
  try {
    await load();
    state.error = '';
  } catch (err) {
    state.error = 'โหลดข้อมูลไม่สำเร็จ: ' + err.message;
  }
  render();
}

// ---------- เหตุการณ์ ----------
app.addEventListener('click', async (e) => {
  const t = e.target.closest('button, [data-close-form]');
  if (!t) return;
  const run = async (fn) => {
    try { await fn(); state.error = ''; } catch (err) { state.error = err.message; }
    await refresh();
  };
  if (t.dataset.period) { state.period = t.dataset.period; return render(); }
  if (t.dataset.status) return run(() => store.updateOrder(t.dataset.status, { status: t.dataset.to }));
  if (t.dataset.pay) return run(() => store.updateOrder(t.dataset.pay, { paid: true, payment_method: t.dataset.method }));
  if (t.dataset.cancel) {
    if (!confirm('ยกเลิกออเดอร์นี้ใช่ไหม?')) return;
    return run(() => store.updateOrder(t.dataset.cancel, { status: 'cancelled' }));
  }
  if ('new' in t.dataset) { state.editing = {}; return render(); }
  if (t.dataset.edit) { state.editing = state.menu.find((m) => m.id === t.dataset.edit); return render(); }
  if ('closeForm' in t.dataset) { state.editing = null; return render(); }
  if (t.dataset.del) {
    if (!confirm('ลบเมนูนี้ถาวรใช่ไหม? (ออเดอร์เก่ายังคงอยู่)')) return;
    return run(() => store.deleteMenuItem(t.dataset.del));
  }
  if (t.dataset.expDel) {
    if (!confirm('ลบรายการนี้ใช่ไหม?')) return;
    return run(() => store.deleteExpense(t.dataset.expDel));
  }
});

app.addEventListener('change', (e) => {
  const cb = e.target.closest('[data-avail]');
  if (!cb) return;
  store.saveMenuItem({ ...state.menu.find((m) => m.id === cb.dataset.avail), available: cb.checked })
    .then(refresh)
    .catch((err) => { state.error = err.message; render(); });
});

app.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  try {
    if (form.id === 'menu-form') {
      const prev = state.editing || {};
      const maxSort = Math.max(0, ...state.menu.map((m) => m.sort || 0));
      await store.saveMenuItem({
        ...(prev.id ? { id: prev.id } : {}),
        name: fd.get('name').trim(),
        category: fd.get('category'),
        price: Number(fd.get('price')),
        cost: Number(fd.get('cost') || 0),
        emoji: fd.get('emoji').trim() || '🍽️',
        options: fd.get('options').split(',').map((s) => s.trim()).filter(Boolean),
        available: prev.available ?? true,
        sort: prev.sort ?? maxSort + 1,
      });
      state.editing = null;
    } else if (form.id === 'expense-form') {
      await store.addExpense({
        spent_on: fd.get('spent_on'),
        category: fd.get('category'),
        amount: Number(fd.get('amount')),
        note: fd.get('note').trim() || null,
      });
    }
    state.error = '';
  } catch (err) {
    state.error = err.message;
  }
  await refresh();
});

document.querySelectorAll('#nav [data-tab]').forEach((b) => b.addEventListener('click', () => {
  state.tab = b.dataset.tab;
  state.editing = null;
  render();
}));

// ---------- ล็อกอิน (เฉพาะโหมด Supabase) ----------
function renderLogin(msg = '') {
  $('#nav').hidden = true;
  $('#logout').hidden = true;
  app.innerHTML = `<form class="card login stack" id="login-form">
    <h2>เข้าสู่ระบบพนักงาน</h2>
    <input name="email" type="email" placeholder="อีเมล" required autocomplete="username">
    <input name="password" type="password" placeholder="รหัสผ่าน" required autocomplete="current-password">
    <p class="err">${esc(msg)}</p>
    <button class="primary big" type="submit">เข้าสู่ระบบ</button>
  </form>`;
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await store.signIn(fd.get('email'), fd.get('password'));
      start();
    } catch (err) {
      renderLogin(err.message);
    }
  });
}

async function start() {
  $('#nav').hidden = false;
  $('#logout').hidden = store.mode !== 'supabase';
  await refresh();
  store.onChange(refresh);
}

async function init() {
  $('#shop-name').textContent = CONFIG.shopName + ' · หลังร้าน';
  document.title = 'หลังร้าน · ' + CONFIG.shopName;
  if (store.mode === 'local') {
    $('#mode-banner').hidden = false;
    $('#mode-banner').textContent = 'โหมดทดลอง: ข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น ตั้งค่า Supabase ใน config.js เพื่อใช้งานจริง';
    return start();
  }
  if (await store.getSession()) return start();
  renderLogin();
}

$('#logout').addEventListener('click', async () => {
  await store.signOut();
  location.reload();
});

init();
