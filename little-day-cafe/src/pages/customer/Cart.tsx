import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, EmptyState } from '../../ui';
import { baht } from '../../lib/format';
import { useCart } from '../../cart/CartProvider';

export function Cart() {
  const { items, setQty, total, clear } = useCart();
  const navigate = useNavigate();
  const [confirmClear, setConfirmClear] = useState(false);

  if (items.length === 0) {
    return <EmptyState title="ตะกร้าว่างอยู่" description="เลือกเมนูที่ชอบแล้วกลับมาที่นี่ได้เลยค่ะ" action={<Link to="/menu" className="text-sm font-medium text-matcha-dark">ไปดูเมนู</Link>} />;
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="text-xl font-bold">ตะกร้า</h1>
      <ul className="flex flex-col gap-3">
        {items.map((l) => (
          <li key={l.key}>
            <Card className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{l.emoji} {l.name}</p>
                {l.labels.length > 0 && <p className="text-xs text-coffee-mute">{l.labels.join(' · ')}</p>}
                {l.note && <p className="text-xs text-terracotta-ink">หมายเหตุ: {l.note}</p>}
                <p className="mt-1 text-sm font-semibold">{baht(l.unitPrice * l.qty)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="secondary" size="sm" aria-label={`ลด ${l.name}`} onClick={() => setQty(l.key, l.qty - 1)}>−</Button>
                <span className="w-5 text-center font-medium" aria-live="polite">{l.qty}</span>
                <Button variant="secondary" size="sm" aria-label={`เพิ่ม ${l.name}`} disabled={l.qty >= 20} onClick={() => setQty(l.key, l.qty + 1)}>+</Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      <Card className="flex items-center justify-between">
        <span className="text-coffee-mute">รวมโดยประมาณ</span>
        <span className="text-xl font-bold">{baht(total)}</span>
      </Card>
      <Button size="lg" onClick={() => navigate('/checkout')}>ไปชำระเงิน</Button>
      {confirmClear ? (
        <div className="flex gap-2">
          <Button variant="danger" className="flex-1" onClick={() => { clear(); setConfirmClear(false); }}>ยืนยันล้างตะกร้า</Button>
          <Button variant="ghost" className="flex-1" onClick={() => setConfirmClear(false)}>ยกเลิก</Button>
        </div>
      ) : (
        <Button variant="ghost" onClick={() => setConfirmClear(true)}>ล้างตะกร้า</Button>
      )}
    </div>
  );
}
