import { Link, useParams } from 'react-router-dom';
import { Badge, Card, EmptyState } from '../../ui';
import { baht, timeTH } from '../../lib/format';
import { orders } from '../../mock/data';
import { statusLabel, statusTone } from '../../components/OrderCard';
import type { OrderStatus } from '../../types';

const steps: OrderStatus[] = ['new', 'accepted', 'preparing', 'ready', 'completed'];

export function OrderStatusPage() {
  const { id } = useParams();
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return <EmptyState title="ไม่พบออเดอร์" description="ตรวจสอบลิงก์อีกครั้ง หรือสอบถามพนักงาน" action={<Link to="/" className="text-sm font-medium text-matcha-dark">หน้าหลัก</Link>} />;
  }

  const current = steps.indexOf(order.status);

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-coffee-mute">ออเดอร์</p>
          <h1 className="text-2xl font-bold">#{order.no}</h1>
        </div>
        <Badge tone={statusTone[order.status]}>{statusLabel[order.status]}</Badge>
      </div>

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

      <Card className="flex flex-col gap-2">
        <h2 className="font-semibold">รายการ</h2>
        {order.lines.map((l, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span>{l.name} × {l.qty}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-oat-soft pt-3 text-sm">
          <span className="text-coffee-mute">{timeTH(order.createdAt)} · {order.paid ? 'ชำระแล้ว' : 'รอชำระ'}</span>
          <span className="font-semibold">{baht(order.total)}</span>
        </div>
      </Card>
    </div>
  );
}
