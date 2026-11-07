import { useMemo, useState } from 'react';
import { Button, EmptyState, Segmented } from '../../ui';
import { OrderCard, statusLabel } from '../../components/OrderCard';
import { orders as seed } from '../../mock/data';
import type { Order, OrderStatus } from '../../types';

type Filter = 'all' | OrderStatus;
const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'new', label: statusLabel.new },
  { value: 'preparing', label: statusLabel.preparing },
  { value: 'ready', label: statusLabel.ready },
  { value: 'completed', label: statusLabel.completed },
  { value: 'cancelled', label: statusLabel.cancelled },
];

const next: Partial<Record<OrderStatus, OrderStatus>> = { new: 'preparing', preparing: 'ready', ready: 'completed' };

export function Orders() {
  // สถานะเปลี่ยนได้เฉพาะในหน้าจอ (Phase 5 จะบันทึกลงฐานข้อมูล)
  const [data, setData] = useState<Order[]>(seed);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => data.filter((o) =>
    (filter === 'all' || o.status === filter) &&
    (query === '' || o.no.includes(query) || (o.table ?? '').includes(query) || (o.customer ?? '').includes(query)),
  ), [data, filter, query]);

  const advance = (id: string) => setData((d) => d.map((o) => {
    const nx = next[o.status];
    return o.id === id && nx ? { ...o, status: nx } : o;
  }));
  const cancel = (id: string) => setData((d) => d.map((o) => (o.id === id ? { ...o, status: 'cancelled' } : o)));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">ออเดอร์</h1>
        <p className="text-sm text-coffee-mute">จัดการคำสั่งซื้อทั้งหมด</p>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented options={filters} value={filter} onChange={setFilter} label="กรองตามสถานะ" />
        <input
          type="search"
          placeholder="ค้นหาเลขออเดอร์ โต๊ะ หรือชื่อ"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-[12px] border border-oat bg-white px-3 py-2.5 text-sm outline-none focus-visible:border-matcha focus-visible:ring-2 focus-visible:ring-matcha/30 md:w-72"
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState title="ไม่พบออเดอร์" description="ลองเปลี่ยนตัวกรองหรือคำค้นหา" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((o) => {
            const nx = next[o.status];
            const canCancel = o.status !== 'completed' && o.status !== 'cancelled';
            return (
              <OrderCard
                key={o.id}
                order={o}
                actions={
                  <>
                    {nx && <Button size="sm" onClick={() => advance(o.id)}>→ {statusLabel[nx]}</Button>}
                    {canCancel && <Button size="sm" variant="danger" onClick={() => cancel(o.id)}>ยกเลิก</Button>}
                  </>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
