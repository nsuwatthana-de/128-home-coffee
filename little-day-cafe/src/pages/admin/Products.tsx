import { useState } from 'react';
import { Badge, Button, Card, Dialog, Input } from '../../ui';
import { baht } from '../../lib/format';
import { categories, products as seed } from '../../mock/data';
import type { Product } from '../../types';

export function Products() {
  // Phase 1: การเพิ่ม/เปิด-ปิดขายเก็บเฉพาะในหน้าจอ บันทึกจริงใน Phase 3 และ 5
  const [items, setItems] = useState<Product[]>(seed);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ name: '', price: '', categoryId: categories[0].id, description: '' });
  const [error, setError] = useState('');

  const toggle = (id: string) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, available: !x.available } : x)));

  const save = () => {
    const price = Number(draft.price);
    if (!draft.name.trim()) return setError('กรอกชื่อสินค้า');
    if (!Number.isFinite(price) || price < 0) return setError('ราคาต้องเป็นตัวเลขที่ไม่ติดลบ');
    setItems((xs) => [...xs, {
      id: `new-${Date.now()}`, name: draft.name.trim(), price, categoryId: draft.categoryId,
      description: draft.description.trim(), emoji: '🍽️', available: true, featured: false, options: [],
    }]);
    setDraft({ name: '', price: '', categoryId: categories[0].id, description: '' });
    setError('');
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">สินค้า</h1>
          <p className="text-sm text-coffee-mute">{items.length} รายการ</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ เพิ่มสินค้า</Button>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-oat-soft text-coffee-mute">
            <tr>
              <th className="px-4 py-3 font-medium">สินค้า</th>
              <th className="px-4 py-3 font-medium">หมวด</th>
              <th className="px-4 py-3 font-medium">ราคา</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 font-medium"><span className="sr-only">การทำงาน</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-b border-oat-soft last:border-0">
                <td className="px-4 py-3">
                  <span className="mr-2" aria-hidden="true">{p.emoji}</span>
                  <span className="font-medium">{p.name}</span>
                </td>
                <td className="px-4 py-3">{categories.find((c) => c.id === p.categoryId)?.name}</td>
                <td className="px-4 py-3">{baht(p.price)}</td>
                <td className="px-4 py-3">
                  {p.available ? <Badge tone="matcha">เปิดขาย</Badge> : <Badge tone="muted">หมดชั่วคราว</Badge>}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="secondary" size="sm" aria-pressed={p.available} onClick={() => toggle(p.id)}>
                    {p.available ? 'ปิดการขาย' : 'เปิดการขาย'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title="เพิ่มสินค้า">
        <div className="flex flex-col gap-4">
          <Input label="ชื่อสินค้า" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">หมวด</span>
            <select
              value={draft.categoryId}
              onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}
              className="rounded-[12px] border border-oat bg-white px-3 py-2.5"
            >
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <Input label="ราคา (บาท)" inputMode="numeric" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
          <Input label="คำอธิบาย" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          {error && <p role="alert" className="text-sm text-terracotta-ink">{error}</p>}
          <Button onClick={save}>บันทึกสินค้า</Button>
        </div>
      </Dialog>
    </div>
  );
}
