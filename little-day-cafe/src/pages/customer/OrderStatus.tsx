import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Badge, Card, EmptyState, Skeleton } from '../../ui';
import { baht, timeTH } from '../../lib/format';
import { repo } from '../../data';
import { buildPromptPayPayload } from '../../domain/promptpay';
import { statusLabel, statusTone } from '../../components/OrderCard';
import { QrImage } from '../../components/QrImage';
import { LAST_ORDER_KEY } from './Checkout';
import type { Order, OrderStatus, ShopSettings } from '../../types';

const steps: OrderStatus[] = ['new', 'accepted', 'preparing', 'ready', 'completed'];

// /order ไม่มีเลขออเดอร์ ให้กลับไปออเดอร์ล่าสุดของเครื่องนี้
export function OrderIndex() {
  let last: string | null = null;
  try { last = localStorage.getItem(LAST_ORDER_KEY); } catch { /* ignore */ }
  if (last) return <Navigate to={`/order/${last}`} replace />;
  return <EmptyState title="ยังไม่มีออเดอร์" description="เมื่อสั่งอาหารแล้ว สถานะจะแสดงที่นี่" action={<Link to="/menu" className="text-sm font-medium text-matcha-dark">ไปดูเมนู</Link>} />;
}

export function OrderStatusPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [settings, setSettings] = useState<ShopSettings | null>(null);

  // ลูกค้าไม่ล็อกอิน จึงติดตามสถานะด้วยการถามซ้ำเป็นช่วง (uuid ของออเดอร์เดาไม่ได้)
  useEffect(() => {
    if (!id) return;
    let alive = true;
    const tick = () => repo.getOrder(id).then((o) => { if (alive) setOrder(o); }).catch(() => { if (alive) setOrder(null); });
    void tick();
    const timer = window.setInterval(tick, 4000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [id]);

  useEffect(() => { repo.getSettings().then(setSettings).catch(() => setSettings(null)); }, []);

  if (order === undefined) return <Skeleton className="h-96 w-full" />;
  if (order === null) {
    return <EmptyState title="ไม่พบออเดอร์" description="ตรวจสอบลิงก์อีกครั้ง หรือสอบถามพนักงาน" action={<Link to="/" className="text-sm font-medium text-matcha-dark">หน้าหลัก</Link>} />;
  }

  const current = steps.indexOf(order.status);
  const cancelled = order.status === 'cancelled';
  const awaitingPayment = order.method === 'promptpay' && order.paymentStatus !== 'paid' && !cancelled;
  let payload: string | null = null;
  if (awaitingPayment && settings?.promptpayId) {
    try {
      payload = buildPromptPayPayload({ target: settings.promptpayId, amount: order.total, reference: order.no });
    } catch { payload = null; }
  }

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-coffee-mute">ออเดอร์</p>
          <h1 className="text-2xl font-bold">#{order.no}</h1>
        </div>
        <Badge tone={statusTone[order.status]}>{statusLabel[order.status]}</Badge>
      </div>

      {cancelled ? (
        <Card><p>ออเดอร์นี้ถูกยกเลิก หากมีข้อสงสัยกรุณาสอบถามพนักงาน</p></Card>
      ) : (
        <Card>
          <ol aria-label="สถานะออเดอร์" className="flex flex-col gap-4">
            {steps.map((s, i) => {
              const done = i <= current;
              return (
                <li key={s} className="flex items-center gap-3">
                  <span aria-hidden="true" className={`size-3 shrink-0 rounded-full ${done ? 'bg-matcha-dark' : 'bg-oat'}`} />
                  <span className={done ? 'font-medium' : 'text-coffee-mute'}>{statusLabel[s]}</span>
                  {i === current && <span className="ml-auto text-xs text-matcha-dark">ตอนนี้</span>}
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      {awaitingPayment && (
        <Card className="flex flex-col items-center gap-3 text-center">
          <h2 className="font-semibold">ชำระด้วย PromptPay</h2>
          {payload ? <QrImage text={payload} size={220} /> : (
            <p className="text-sm text-terracotta-ink">ร้านยังไม่ได้ตั้งค่า PromptPay กรุณาชำระที่เคาน์เตอร์</p>
          )}
          <p className="text-lg font-bold">{baht(order.total)}</p>
          <p className="text-xs text-coffee-mute">อ้างอิง {order.no} · พนักงานจะยืนยันหลังตรวจยอดเข้าบัญชีแล้ว</p>
        </Card>
      )}

      <Card className="flex flex-col gap-2">
        <h2 className="font-semibold">รายการ</h2>
        {order.lines.map((l, i) => (
          <div key={i} className="flex justify-between gap-3 text-sm">
            <span>{l.name} × {l.qty}{l.options.length > 0 && <span className="block text-xs text-coffee-mute">{l.options.join(' · ')}</span>}</span>
            <span>{baht(l.lineTotal)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-oat-soft pt-3 text-sm">
          <span className="text-coffee-mute">{timeTH(order.createdAt)} · {order.paymentStatus === 'paid' ? 'ชำระแล้ว' : 'ยังไม่ชำระ'}</span>
          <span className="font-semibold">{baht(order.total)}</span>
        </div>
      </Card>
    </div>
  );
}
