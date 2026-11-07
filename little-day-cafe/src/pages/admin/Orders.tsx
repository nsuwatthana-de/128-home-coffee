import { useMemo, useState, useEffect } from 'react';
import { Button, Dialog, EmptyState, Segmented, Skeleton } from '../../ui';
import { OrderCard, statusLabel } from '../../components/OrderCard';
import { QrImage } from '../../components/QrImage';
import { repo } from '../../data';
import { useLive } from '../../hooks/useLive';
import { useAction } from '../../hooks/useAction';
import { lastDaysRange, todayRange } from '../../lib/range';
import { buildPromptPayPayload } from '../../domain/promptpay';
import { canTransition, isOpen, nextStatus } from '../../domain/status';
import { baht } from '../../lib/format';
import type { Order, OrderStatus, ShopSettings } from '../../types';

type Scope = 'today' | 'week';
type Filter = 'all' | OrderStatus;
const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'new', label: statusLabel.new },
  { value: 'accepted', label: statusLabel.accepted },
  { value: 'preparing', label: statusLabel.preparing },
  { value: 'ready', label: statusLabel.ready },
  { value: 'completed', label: statusLabel.completed },
  { value: 'cancelled', label: statusLabel.cancelled },
];

export function Orders() {
  const [scope, setScope] = useState<Scope>('today');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const { data, loading, error } = useLive(() => repo.listOrders(scope === 'today' ? todayRange() : lastDaysRange(7)), [scope]);
  const action = useAction();
  const [paying, setPaying] = useState<Order | null>(null);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [ref, setRef] = useState('');

  useEffect(() => { repo.getSettings().then(setSettings).catch(() => setSettings(null)); }, []);

  const visible = useMemo(() => (data ?? []).filter((o) =>
    (filter === 'all' || o.status === filter) &&
    (query === '' || o.no.includes(query) || (o.table ?? '').includes(query) || (o.customer ?? '').includes(query)),
  ), [data, filter, query]);

  const payload = paying && settings?.promptpayId
    ? (() => { try { return buildPromptPayPayload({ target: settings.promptpayId, amount: paying.total, reference: paying.no }); } catch { return null; } })()
    : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">ออเดอร์</h1>
          <p className="text-sm text-coffee-mute">อัปเดตอัตโนมัติเมื่อมีการเปลี่ยนแปลง</p>
        </div>
        <Segmented options={[{ value: 'today' as const, label: 'วันนี้' }, { value: 'week' as const, label: '7 วัน' }]}
          value={scope} onChange={setScope} label="ช่วงเวลา" />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented options={filters} value={filter} onChange={setFilter} label="กรองตามสถานะ" />
        <input type="search" placeholder="ค้นหาเลขออเดอร์ โต๊ะ หรือชื่อ" value={query} onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-[12px] border border-oat bg-white px-3 py-2.5 text-sm outline-none focus-visible:border-matcha focus-visible:ring-2 focus-visible:ring-matcha/30 md:w-72" />
      </div>

      {action.error && <p role="alert" className="rounded-[12px] bg-terracotta-soft px-3 py-2 text-sm text-terracotta-ink">{action.error}</p>}
      {loading && <Skeleton className="h-60 w-full" />}
      {error && <EmptyState title="โหลดออเดอร์ไม่สำเร็จ" description={error} />}

      {data && (visible.length === 0 ? (
        <EmptyState title="ไม่พบออเดอร์" description="ลองเปลี่ยนตัวกรองหรือช่วงเวลา" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((o) => {
            const nx = nextStatus(o.status);
            const canCancel = canTransition(o.status, 'cancelled') && o.paymentStatus !== 'paid';
            const needsPay = o.paymentStatus !== 'paid' && o.status !== 'cancelled';
            return (
              <OrderCard key={o.id} order={o} actions={
                <>
                  {nx && <Button size="sm" disabled={!!action.busy} onClick={() => action.run(`s-${o.id}`, async () => { await repo.setOrderStatus(o.id, nx); })}>→ {statusLabel[nx]}</Button>}
                  {needsPay && o.method === 'cash' && (
                    <Button size="sm" variant="secondary" disabled={!!action.busy} onClick={() => action.run(`p-${o.id}`, async () => { await repo.confirmPayment(o.id, 'cash'); return `รับเงินสด ${o.no} แล้ว`; })}>รับเงินสด</Button>
                  )}
                  {needsPay && o.method === 'promptpay' && (
                    <Button size="sm" variant="secondary" onClick={() => { setRef(''); setPaying(o); }}>ยืนยัน PromptPay</Button>
                  )}
                  {canCancel && isOpen(o.status) && (
                    <Button size="sm" variant="danger" disabled={!!action.busy} onClick={() => { if (confirm(`ยกเลิกออเดอร์ ${o.no} ใช่ไหม? วัตถุดิบจะถูกคืน`)) action.run(`c-${o.id}`, async () => { await repo.setOrderStatus(o.id, 'cancelled'); }); }}>ยกเลิก</Button>
                  )}
                </>
              } />
            );
          })}
        </div>
      ))}

      <Dialog open={!!paying} onClose={() => setPaying(null)} title={paying ? `ยืนยัน PromptPay · ${paying.no}` : ''} sheet>
        {paying && (
          <div className="flex flex-col items-center gap-4 text-center">
            {payload ? <QrImage text={payload} size={220} /> : (
              <p className="text-sm text-terracotta-ink">ยังไม่ได้ตั้งค่า PromptPay ในหน้าตั้งค่า</p>
            )}
            <p className="text-2xl font-bold">{baht(paying.total)}</p>
            <p className="text-sm text-coffee-mute">ตรวจยอดเข้าบัญชีในแอปธนาคารแล้วจึงยืนยัน ระบบไม่ยืนยันจากภาพสลิปที่ลูกค้าส่งมา</p>
            <label className="flex w-full flex-col gap-1.5 text-left text-sm">
              <span className="font-medium">เลขอ้างอิงจากธนาคาร <span className="text-coffee-mute">(ไม่บังคับ)</span></span>
              <input value={ref} onChange={(e) => setRef(e.target.value)} maxLength={40}
                className="rounded-[12px] border border-oat bg-white px-3 py-2.5 outline-none focus-visible:border-matcha focus-visible:ring-2 focus-visible:ring-matcha/30" />
            </label>
            <Button size="lg" className="w-full" disabled={!!action.busy} onClick={() => action.run(`p-${paying.id}`, async () => {
              await repo.confirmPayment(paying.id, 'promptpay', ref);
              setPaying(null);
              return `ยืนยันการชำระ ${paying.no} แล้ว`;
            })}>ยืนยันว่าได้รับเงินแล้ว</Button>
          </div>
        )}
      </Dialog>
      {action.notice && <p role="status" className="text-sm text-matcha-dark">{action.notice}</p>}
    </div>
  );
}
