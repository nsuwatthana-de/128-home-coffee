import { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Badge, Button, EmptyState, Segmented, Skeleton } from '../../ui';
import { timeTH, cx } from '../../lib/format';
import { repo } from '../../data';
import { useLive } from '../../hooks/useLive';
import { useAction } from '../../hooks/useAction';
import { todayRange } from '../../lib/range';
import type { Order, OrderStatus, Station } from '../../types';

const columns: { key: string; title: string; statuses: OrderStatus[]; border: string }[] = [
  { key: 'new', title: 'ใหม่', statuses: ['new'], border: 'border-terracotta' },
  { key: 'doing', title: 'กำลังทำ', statuses: ['accepted', 'preparing'], border: 'border-coffee' },
  { key: 'ready', title: 'พร้อมเสิร์ฟ', statuses: ['ready'], border: 'border-matcha' },
  { key: 'done', title: 'เสร็จแล้ว', statuses: ['completed'], border: 'border-oat' },
];

const next: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  new: { to: 'accepted', label: 'รับออเดอร์' },
  accepted: { to: 'preparing', label: 'เริ่มทำ' },
  preparing: { to: 'ready', label: 'พร้อมเสิร์ฟ' },
  ready: { to: 'completed', label: 'เสิร์ฟแล้ว' },
};

const stations: { value: 'all' | Station; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'beverage', label: 'เครื่องดื่ม' },
  { value: 'bakery', label: 'เบเกอรี่' },
];

// เสียงแจ้งเตือนด้วย Web Audio (ไม่ต้องใช้ไฟล์เสียง) อาจถูกบล็อกจนกว่าผู้ใช้จะแตะหน้าจอ
function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
    setTimeout(() => void ctx.close(), 800);
  } catch { /* ไม่รองรับเสียง */ }
}

export function Board() {
  const { sound } = useOutletContext<{ sound: boolean }>();
  const { data, loading, error } = useLive(() => repo.listOrders(todayRange()));
  const action = useAction();
  const [station, setStation] = useState<'all' | Station>('all');
  const seen = useRef<Set<string> | null>(null);

  // เล่นเสียงเมื่อมีออเดอร์ใหม่ที่ยังไม่เคยเห็น
  useEffect(() => {
    if (!data) return;
    const newIds = data.filter((o) => o.status === 'new').map((o) => o.id);
    if (seen.current === null) { seen.current = new Set(newIds); return; }
    const fresh = newIds.filter((id) => !seen.current!.has(id));
    newIds.forEach((id) => seen.current!.add(id));
    if (fresh.length && sound) chime();
  }, [data, sound]);

  const visible = useMemo<Order[]>(() => (data ?? [])
    .filter((o) => o.status !== 'cancelled')
    .map((o) => ({ ...o, lines: station === 'all' ? o.lines : o.lines.filter((l) => l.station === station) }))
    .filter((o) => o.lines.length > 0), [data, station]);

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error) return <EmptyState title="โหลดออเดอร์ไม่สำเร็จ" description={error} />;

  return (
    <div className="flex flex-col gap-4">
      <Segmented options={stations} value={station} onChange={setStation} label="กรองตามสถานี" />
      {action.error && <p role="alert" className="rounded-[12px] bg-terracotta-soft px-3 py-2 text-sm text-terracotta-ink">{action.error}</p>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => {
          const list = visible.filter((o) => col.statuses.includes(o.status));
          return (
            <section key={col.key} aria-label={col.title} className={cx('flex flex-col gap-3 rounded-[16px] md:min-h-[60vh] border-t-4 bg-white/60 p-3', col.border)}>
              <header className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold tracking-wide">{col.title}</h2>
                <Badge tone="neutral">{list.length}</Badge>
              </header>
              {list.length === 0 && <p className="px-1 text-sm text-coffee-mute">ไม่มีออเดอร์</p>}
              {list.map((o) => {
                const nx = next[o.status];
                return (
                  <article key={o.id} className="flex flex-col gap-2 rounded-[14px] bg-white p-4 shadow-soft">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-lg font-bold">#{o.no}</span>
                      <span className="text-coffee-mute">{o.table ? `โต๊ะ ${o.table}` : o.channel === 'takeaway' ? 'กลับบ้าน' : 'เคาน์เตอร์'} · {timeTH(o.createdAt)}</span>
                    </div>
                    <ul className="flex flex-col gap-1.5">
                      {o.lines.map((l, i) => (
                        <li key={i} className="text-[15px]">
                          <span className="font-semibold">{l.qty}×</span> {l.name}
                          {l.options.length > 0 && <span className="block text-xs text-coffee-mute">{l.options.join(' · ')}</span>}
                          {l.note && <span className="block text-xs text-terracotta-ink">หมายเหตุ: {l.note}</span>}
                        </li>
                      ))}
                    </ul>
                    {o.note && <p className="text-xs text-terracotta-ink">📝 {o.note}</p>}
                    {nx && (
                      <Button size="lg" variant={col.key === 'new' ? 'primary' : 'secondary'} disabled={!!action.busy}
                        onClick={() => action.run(`k-${o.id}`, async () => { await repo.setOrderStatus(o.id, nx.to); })} className="mt-1">
                        {nx.label}
                      </Button>
                    )}
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}
