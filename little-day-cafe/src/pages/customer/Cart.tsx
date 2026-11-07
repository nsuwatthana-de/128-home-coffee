import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, EmptyState } from '../../ui';
import { baht } from '../../lib/format';

interface CartLine { id: string; name: string; options: string; price: number; qty: number }

const initial: CartLine[] = [
  { id: 'c1', name: 'Iced Latte', options: 'M · หวาน 50% · น้ำแข็งปกติ', price: 85, qty: 2 },
  { id: 'c2', name: 'Strawberry Cake', options: '', price: 95, qty: 1 },
];

export function Cart() {
  // Phase 1: ข้อมูลตะกร้าเป็นตัวอย่าง ตะกร้าจริงจะเก็บสถานะใน Phase 2
  const [lines, setLines] = useState<CartLine[]>(initial);
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);

  const change = (id: string, delta: number) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, qty: l.qty + delta } : l)).filter((l) => l.qty > 0));

  if (lines.length === 0) {
    return <EmptyState title="ตะกร้าว่างอยู่" description="เลือกเมนูที่ชอบแล้วกลับมาที่นี่ได้เลยค่ะ" action={<Link to="/menu" className="text-sm font-medium text-matcha-dark">ไปดูเมนู</Link>} />;
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="text-xl font-bold">ตะกร้า</h1>
      <ul className="flex flex-col gap-3">
        {lines.map((l) => (
          <li key={l.id}>
          <Card className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium">{l.name}</p>
              {l.options && <p className="text-xs text-coffee-mute">{l.options}</p>}
              <p className="mt-1 text-sm font-semibold">{baht(l.price * l.qty)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="secondary" size="sm" aria-label={`ลด ${l.name}`} onClick={() => change(l.id, -1)}>−</Button>
              <span className="w-5 text-center font-medium" aria-live="polite">{l.qty}</span>
              <Button variant="secondary" size="sm" aria-label={`เพิ่ม ${l.name}`} onClick={() => change(l.id, 1)}>+</Button>
            </div>
          </Card>
          </li>
        ))}
      </ul>
      <Card className="flex items-center justify-between">
        <span className="text-coffee-mute">รวมทั้งหมด</span>
        <span className="text-xl font-bold">{baht(total)}</span>
      </Card>
      <Link to="/checkout" className="contents">
        <Button size="lg">ไปชำระเงิน</Button>
      </Link>
    </div>
  );
}
