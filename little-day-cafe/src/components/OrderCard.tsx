import type { ReactNode } from 'react';
import { Badge, Card, type Tone } from '../ui';
import { baht, timeTH } from '../lib/format';
import type { Order, OrderStatus } from '../types';

export const statusLabel: Record<OrderStatus, string> = {
  new: 'ใหม่',
  accepted: 'รับแล้ว',
  preparing: 'กำลังทำ',
  ready: 'พร้อมเสิร์ฟ',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
};

export const statusTone: Record<OrderStatus, Tone> = {
  new: 'terracotta',
  accepted: 'oat',
  preparing: 'coffee',
  ready: 'matcha',
  completed: 'muted',
  cancelled: 'muted',
};

export function OrderCard({ order, actions }: { order: Order; actions?: ReactNode }) {
  const where = order.channel === 'takeaway' ? 'กลับบ้าน' : order.table ? `โต๊ะ ${order.table}` : 'เคาน์เตอร์';
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">#{order.no} · {where}</p>
          <p className="text-xs text-coffee-mute">
            {timeTH(order.createdAt)}{order.customer ? ` · ${order.customer}` : ''}
          </p>
        </div>
        <Badge tone={statusTone[order.status]}>{statusLabel[order.status]}</Badge>
      </div>

      <ul className="flex flex-col gap-2 text-sm">
        {order.lines.map((l, i) => (
          <li key={i} className="flex flex-col">
            <span>
              <span className="font-medium">{l.name}</span> × {l.qty}
              <span className="ml-1 text-xs text-coffee-mute">{l.station === 'beverage' ? 'เครื่องดื่ม' : 'เบเกอรี่'}</span>
            </span>
            {l.options.length > 0 && <span className="text-xs text-coffee-mute">{l.options.join(' · ')}</span>}
            {l.note && <span className="text-xs text-terracotta-ink">หมายเหตุ: {l.note}</span>}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t border-oat-soft pt-3 text-sm">
        <span className={order.paid ? 'text-matcha-dark' : 'text-terracotta-ink'}>
          {order.paid ? 'ชำระแล้ว' : 'ยังไม่ชำระ'} · {order.method === 'cash' ? 'เงินสด' : 'PromptPay'}
        </span>
        <span className="font-semibold">{baht(order.total)}</span>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </Card>
  );
}
