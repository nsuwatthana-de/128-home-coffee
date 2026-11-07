import { useMemo, useState } from 'react';
import { Badge, Button, Segmented } from '../../ui';
import { timeTH, cx } from '../../lib/format';
import { orders as seed } from '../../mock/data';
import type { Order, OrderStatus, Station } from '../../types';

// คอลัมน์บนจอครัว: NEW / PREPARING / READY / COMPLETED
const columns: { key: string; title: string; statuses: OrderStatus[]; tone: string }[] = [
  { key: 'new', title: 'NEW', statuses: ['new'], tone: 'border-terracotta' },
  { key: 'preparing', title: 'PREPARING', statuses: ['accepted', 'preparing'], tone: 'border-coffee' },
  { key: 'ready', title: 'READY', statuses: ['ready'], tone: 'border-matcha' },
  { key: 'completed', title: 'COMPLETED', statuses: ['completed'], tone: 'border-oat' },
];

const nextStatus: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  new: { to: 'preparing', label: 'รับออเดอร์' },
  accepted: { to: 'preparing', label: 'เริ่มทำ' },
  preparing: { to: 'ready', label: 'พร้อมเสิร์ฟ' },
  ready: { to: 'completed', label: 'เสร็จสิ้น' },
};

const stationOptions: { value: 'all' | Station; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'beverage', label: 'เครื่องดื่ม' },
  { value: 'bakery', label: 'เบเกอรี่' },
];

export function Board() {
  const [data, setData] = useState<Order[]>(seed.filter((o) => o.status !== 'cancelled'));
  const [station, setStation] = useState<'all' | Station>('all');

  const visible = useMemo(() => data
    .map((o) => ({ ...o, lines: station === 'all' ? o.lines : o.lines.filter((l) => l.station === station) }))
    .filter((o) => o.lines.length > 0), [data, station]);

  const advance = (id: string) => setData((d) => d.map((o) => {
    const nx = nextStatus[o.status];
    return o.id === id && nx ? { ...o, status: nx.to } : o;
  }));

  return (
    <div className="flex flex-col gap-4">
      <Segmented options={stationOptions} value={station} onChange={setStation} label="กรองตามสถานี" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => {
          const list = visible.filter((o) => col.statuses.includes(o.status));
          return (
            <section key={col.key} aria-label={col.title} className={cx('flex min-h-[60vh] flex-col gap-3 rounded-[16px] border-t-4 bg-white/60 p-3', col.tone)}>
              <header className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold tracking-wide">{col.title}</h2>
                <Badge tone="neutral">{list.length}</Badge>
              </header>
              {list.length === 0 && <p className="px-1 text-sm text-coffee-mute">ไม่มีออเดอร์</p>}
              {list.map((o) => {
                const nx = nextStatus[o.status];
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
                    {nx && (
                      <Button size="lg" variant={col.key === 'new' ? 'primary' : 'secondary'} onClick={() => advance(o.id)} className="mt-1">
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
