import { store } from './store.js';
import { CONFIG } from '../config.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '฿' + Number(n).toLocaleString('th-TH');
const CATS = { drink: 'เครื่องดื่ม', cake: 'เค้ก', bread: 'ขนมปัง' };
const STATUS = {
  new: 'รับออเดอร์แล้ว',
  preparing: 'กำลังทำ',
  ready: 'ทำเสร็จแล้ว รอเสิร์ฟ',
  served: 'เสิร์ฟแล้ว ขอบคุณที่มาใช้บริการค่ะ',
  cancelled: 'ออเดอร์นี้ถูกยกเลิก',
};
const LAST_KEY = 'cafe-last-order';

const table = (new URLSearchParams(location.search).get('table') || '').slice(0, 20);
let menu = [];
let cat = 'drink';
const cart = new Map(); // key = id|option -> line
let timer = null;

function renderTabs() {
  $('#tabs').innerHTML = Object.entries(CATS)
    .map(([k, v]) => `<button class="${k === cat ? 'on' : ''}" data-cat="${k}">${v}</button>`)
    .join('');
}

function renderMenu() {
  const items = menu.filter((m) => m.category === cat);
  $('#menu').innerHTML = items.map((m) => {
    const opts = m.options || [];
    return `<article class="card ${m.available ? '' : 'soldout'}">
      <div class="emoji">${esc(m.emoji || '🍽️')}</div>
      <h3>${esc(m.name)}</h3>
      <div class="price">${money(m.price)}</div>
      ${opts.length ? `<select data-opt="${esc(m.id)}" aria-label="ตัวเลือก">${opts.map((o) => `<option>${esc(o)}</option>`).join('')}</select>` : ''}
      <button class="add" data-add="${esc(m.id)}" ${m.available ? '' : 'disabled'}>${m.available ? '+ เพิ่ม' : 'หมดชั่วคราว'}</button>
    </article>`;
  }).join('') || '<p class="muted">ยังไม่มีเมนูในหมวดนี้</p>';
}

function renderCart() {
  const lines = [...cart.entries()].filter(([, l]) => l.qty > 0);
  const count = lines.reduce((s, [, l]) => s + l.qty, 0);
  const total = lines.reduce((s, [, l]) => s + l.qty * l.price, 0);
  $('#bar').hidden = count === 0;
  $('#bar-text').textContent = `${count} รายการ · ${money(total)}`;
  $('#cart-lines').innerHTML = lines.map(([key, l]) => `
    <div class="line">
      <div><b>${esc(l.name)}</b>${l.option ? `<small class="muted"> (${esc(l.option)})</small>` : ''}
        <div class="price">${money(l.price * l.qty)}</div></div>
      <div class="qty">
        <button data-dec="${esc(key)}" aria-label="ลด">−</button>
        <span>${l.qty}</span>
        <button data-inc="${esc(key)}" aria-label="เพิ่ม">+</button>
      </div>
    </div>`).join('') || '<p class="muted">ยังไม่มีรายการ</p>';
  $('#cart-total').textContent = money(total);
  $('#submit').disabled = count === 0;
}

function openCart(open) {
  $('#sheet').hidden = !open;
  $('#backdrop').hidden = !open;
}

async function trackOrder(id) {
  try { localStorage.setItem(LAST_KEY, id); } catch { /* ignore */ }
  $('#track').hidden = false;
  clearInterval(timer);
  const tick = async () => {
    try {
      const o = await store.getOrder(id);
      if (!o) return;
      $('#track-status').textContent = STATUS[o.status] || o.status;
      $('#track-items').textContent = o.items.map((l) => `${l.name}×${l.qty}`).join(', ');
      if (o.status === 'served' || o.status === 'cancelled') clearInterval(timer);
    } catch { /* จะลองใหม่รอบถัดไป */ }
  };
  await tick();
  timer = setInterval(tick, 4000);
}

$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]');
  if (!b) return;
  cat = b.dataset.cat;
  renderTabs();
  renderMenu();
});

$('#menu').addEventListener('click', (e) => {
  const b = e.target.closest('[data-add]');
  if (!b) return;
  const m = menu.find((x) => x.id === b.dataset.add);
  if (!m || !m.available) return;
  const sel = document.querySelector(`[data-opt="${CSS.escape(m.id)}"]`);
  const option = sel ? sel.value : '';
  const key = `${m.id}|${option}`;
  const line = cart.get(key) || { id: m.id, name: m.name, price: m.price, option, qty: 0 };
  line.qty += 1;
  cart.set(key, line);
  renderCart();
});

$('#cart-lines').addEventListener('click', (e) => {
  const inc = e.target.closest('[data-inc]');
  const dec = e.target.closest('[data-dec]');
  const key = (inc || dec)?.dataset[inc ? 'inc' : 'dec'];
  if (!key || !cart.has(key)) return;
  const line = cart.get(key);
  line.qty += inc ? 1 : -1;
  if (line.qty <= 0) cart.delete(key);
  renderCart();
});

$('#open-cart').addEventListener('click', () => openCart(true));
$('#close-cart').addEventListener('click', () => openCart(false));
$('#backdrop').addEventListener('click', () => openCart(false));

$('#submit').addEventListener('click', async () => {
  const items = [...cart.values()].filter((l) => l.qty > 0)
    .map((l) => ({ id: l.id, qty: l.qty, option: l.option }));
  if (!items.length) return;
  const btn = $('#submit');
  btn.disabled = true;
  $('#msg').textContent = '';
  try {
    const order = await store.placeOrder({
      table,
      customer: $('#cname').value.trim(),
      note: $('#note').value.trim(),
      items,
    });
    cart.clear();
    renderCart();
    openCart(false);
    $('#note').value = '';
    trackOrder(order.id);
  } catch (err) {
    $('#msg').textContent = 'ส่งออเดอร์ไม่สำเร็จ: ' + err.message;
    btn.disabled = false;
  }
});

async function init() {
  $('#shop').textContent = CONFIG.shopName;
  document.title = CONFIG.shopName;
  $('#table').textContent = table ? `โต๊ะ ${table}` : 'ไม่ระบุโต๊ะ';
  try {
    menu = await store.listMenu();
  } catch (err) {
    $('#menu').innerHTML = `<p class="err">โหลดเมนูไม่สำเร็จ: ${esc(err.message)}</p>`;
    return;
  }
  renderTabs();
  renderMenu();
  renderCart();
  store.onChange(async () => {
    try { menu = await store.listMenu(); renderMenu(); } catch { /* ignore */ }
  });
  let last = null;
  try { last = localStorage.getItem(LAST_KEY); } catch { /* ignore */ }
  if (last) trackOrder(last);
}

init();
