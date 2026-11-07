// ชั้นข้อมูลกลาง: ใช้ Supabase ถ้าตั้งค่าไว้ ไม่งั้นใช้ localStorage (โหมดทดลอง)
// หน้าลูกค้าและหน้าพนักงานเรียกใช้ฟังก์ชันชุดเดียวกันจากไฟล์นี้
import { CONFIG } from '../config.js';

const LOCAL_KEY = 'cafe-app:v1';
const listeners = new Set();
const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cafe-app') : null;
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const notify = () => listeners.forEach((fn) => fn());

const SEED = {
  menu: [
    { id: 'd1', name: 'เอสเปรสโซ่', category: 'drink', price: 45, cost: 12, emoji: '☕', options: ['ร้อน', 'เย็น'], available: true, sort: 1 },
    { id: 'd2', name: 'ลาเต้', category: 'drink', price: 60, cost: 18, emoji: '🥛', options: ['ร้อน', 'เย็น', 'ปั่น'], available: true, sort: 2 },
    { id: 'd3', name: 'ชาเขียวนม', category: 'drink', price: 55, cost: 15, emoji: '🍵', options: ['ร้อน', 'เย็น'], available: true, sort: 3 },
    { id: 'c1', name: 'ชีสเค้ก', category: 'cake', price: 95, cost: 40, emoji: '🍰', options: [], available: true, sort: 4 },
    { id: 'c2', name: 'ช็อกโกแลตเค้ก', category: 'cake', price: 110, cost: 45, emoji: '🎂', options: [], available: true, sort: 5 },
    { id: 'b1', name: 'ครัวซองต์', category: 'bread', price: 65, cost: 22, emoji: '🥐', options: [], available: true, sort: 6 },
    { id: 'b2', name: 'ขนมปังกระเทียม', category: 'bread', price: 50, cost: 14, emoji: '🥖', options: [], available: true, sort: 7 },
  ],
  orders: [],
  expenses: [],
};

// ---------- โหมดทดลอง: localStorage ----------
function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ใช้ค่าเริ่มต้น */ }
  const db = structuredClone(SEED);
  writeLocal(db);
  return db;
}

function writeLocal(db) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(db)); } catch { /* พื้นที่เต็มหรือถูกบล็อก */ }
  bc?.postMessage('changed');
  notify();
}

function buildLines(menu, items) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('ไม่มีรายการในออเดอร์');
  let total = 0;
  let cost = 0;
  const lines = items.map((it) => {
    const m = menu.find((x) => x.id === it.id);
    if (!m || !m.available) throw new Error(`เมนูนี้หมดแล้ว: ${m?.name ?? it.id}`);
    const qty = Math.min(20, Math.max(1, parseInt(it.qty, 10) || 1));
    total += m.price * qty;
    cost += m.cost * qty;
    return { id: m.id, name: m.name, price: m.price, qty, option: it.option || '' };
  });
  return { lines, total, cost };
}

const localStore = {
  mode: 'local',
  async listMenu() {
    return readLocal().menu.slice().sort((a, b) => a.sort - b.sort);
  },
  async saveMenuItem(item) {
    const db = readLocal();
    const row = { ...item, id: item.id || uid() };
    const idx = db.menu.findIndex((m) => m.id === row.id);
    if (idx >= 0) db.menu[idx] = { ...db.menu[idx], ...row };
    else db.menu.push(row);
    writeLocal(db);
    return row;
  },
  async deleteMenuItem(id) {
    const db = readLocal();
    db.menu = db.menu.filter((m) => m.id !== id);
    writeLocal(db);
  },
  async placeOrder({ table, customer, note, items }) {
    const db = readLocal();
    const { lines, total, cost } = buildLines(db.menu, items);
    const order = {
      id: uid(),
      table_code: table || null,
      customer_name: customer || null,
      note: (note || '').slice(0, 200) || null,
      items: lines,
      total,
      cost_total: cost,
      status: 'new',
      paid: false,
      payment_method: null,
      created_at: new Date().toISOString(),
    };
    db.orders.push(order);
    writeLocal(db);
    return order;
  },
  async getOrder(id) {
    return readLocal().orders.find((o) => o.id === id) ?? null;
  },
  async listOrders(from) {
    const since = new Date(`${from}T00:00:00`).toISOString();
    return readLocal().orders
      .filter((o) => o.created_at >= since)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async updateOrder(id, patch) {
    const db = readLocal();
    const o = db.orders.find((x) => x.id === id);
    if (o) Object.assign(o, patch);
    writeLocal(db);
  },
  async listExpenses(from) {
    return readLocal().expenses
      .filter((e) => e.spent_on >= from)
      .sort((a, b) => b.spent_on.localeCompare(a.spent_on));
  },
  async addExpense(e) {
    const db = readLocal();
    db.expenses.push({ ...e, id: uid(), created_at: new Date().toISOString() });
    writeLocal(db);
  },
  async deleteExpense(id) {
    const db = readLocal();
    db.expenses = db.expenses.filter((e) => e.id !== id);
    writeLocal(db);
  },
  onChange(fn) {
    const storageHandler = (e) => { if (e.key === LOCAL_KEY) fn(); };
    const bcHandler = () => fn();
    listeners.add(fn);
    window.addEventListener('storage', storageHandler);
    bc?.addEventListener('message', bcHandler);
    return () => {
      listeners.delete(fn);
      window.removeEventListener('storage', storageHandler);
      bc?.removeEventListener('message', bcHandler);
    };
  },
  async getSession() { return true; },
  async signIn() { return true; },
  async signOut() {},
};

// ---------- โหมดจริง: Supabase ----------
let sbPromise = null;
function sb() {
  if (!sbPromise) {
    sbPromise = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/+esm')
      .then(({ createClient }) => createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey));
  }
  return sbPromise;
}
const check = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

const remoteStore = {
  mode: 'supabase',
  async listMenu() {
    const c = await sb();
    return check(await c.from('menu_items').select('*').order('sort'));
  },
  async saveMenuItem(item) {
    const c = await sb();
    const row = { ...item };
    if (!row.id) delete row.id;
    return check(await c.from('menu_items').upsert(row).select().single());
  },
  async deleteMenuItem(id) {
    const c = await sb();
    check(await c.from('menu_items').delete().eq('id', id));
  },
  async placeOrder({ table, customer, note, items }) {
    const c = await sb();
    return check(await c.rpc('place_order', {
      p_table: table || '',
      p_customer: customer || '',
      p_note: note || '',
      p_items: items,
    }));
  },
  async getOrder(id) {
    const c = await sb();
    return check(await c.rpc('get_order', { p_id: id }));
  },
  async listOrders(from) {
    const c = await sb();
    return check(await c.from('orders').select('*')
      .gte('created_at', new Date(`${from}T00:00:00`).toISOString())
      .order('created_at', { ascending: false }));
  },
  async updateOrder(id, patch) {
    const c = await sb();
    check(await c.from('orders').update(patch).eq('id', id));
  },
  async listExpenses(from) {
    const c = await sb();
    return check(await c.from('expenses').select('*').gte('spent_on', from).order('spent_on', { ascending: false }));
  },
  async addExpense(e) {
    const c = await sb();
    check(await c.from('expenses').insert(e));
  },
  async deleteExpense(id) {
    const c = await sb();
    check(await c.from('expenses').delete().eq('id', id));
  },
  onChange(fn) {
    let channel = null;
    let cancelled = false;
    sb().then((c) => {
      if (cancelled) return;
      channel = c.channel(`cafe-${uid()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fn)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, fn)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fn)
        .subscribe();
    });
    return () => {
      cancelled = true;
      if (channel) sb().then((c) => c.removeChannel(channel));
    };
  },
  async getSession() {
    const c = await sb();
    const { data } = await c.auth.getSession();
    return !!data.session;
  },
  async signIn(email, password) {
    const c = await sb();
    check(await c.auth.signInWithPassword({ email, password }));
    return true;
  },
  async signOut() {
    const c = await sb();
    await c.auth.signOut();
  },
};

const useRemote = Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);
export const store = useRemote ? remoteStore : localStore;
