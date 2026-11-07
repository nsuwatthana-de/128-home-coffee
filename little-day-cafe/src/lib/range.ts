// ช่วงเวลาตามเขตเวลาของเครื่อง (ร้านใช้ Asia/Bangkok)
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function todayRange() {
  const s = startOfDay(new Date());
  return { from: s.toISOString(), to: addDays(s, 1).toISOString() };
}

export function lastDaysRange(days: number) {
  const s = startOfDay(addDays(new Date(), -(days - 1)));
  return { from: s.toISOString(), to: addDays(startOfDay(new Date()), 1).toISOString() };
}

export function monthRange() {
  const now = new Date();
  const s = new Date(now.getFullYear(), now.getMonth(), 1);
  const e = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { from: s.toISOString(), to: e.toISOString(), fromDate: ymd(s), toDate: ymd(addDays(e, -1)) };
}

export type Period = 'today' | 'week' | 'month';

export function periodRange(p: Period) {
  if (p === 'today') {
    const t = todayRange();
    return { ...t, fromDate: ymd(new Date()), toDate: ymd(new Date()) };
  }
  if (p === 'week') {
    const r = lastDaysRange(7);
    return { ...r, fromDate: ymd(addDays(new Date(), -6)), toDate: ymd(new Date()) };
  }
  return monthRange();
}
