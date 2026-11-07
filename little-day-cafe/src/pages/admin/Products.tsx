import { useState } from 'react';
import { Badge, Button, Card, Dialog, EmptyState, Skeleton } from '../../ui';
import { baht } from '../../lib/format';
import { repo } from '../../data';
import type { ProductInput } from '../../data/repo';
import { useLive } from '../../hooks/useLive';
import { useAction } from '../../hooks/useAction';
import type { Product } from '../../types';

const blank = (categoryId: string): ProductInput => ({ name: '', categoryId, description: '', price: 0, emoji: '🍽️', available: true, featured: false });

export function Products() {
  const { data, loading, error } = useLive(async () => {
    const [categories, products] = await Promise.all([repo.listCategories(), repo.listProducts()]);
    return { categories, products };
  });
  const action = useAction();
  const [editing, setEditing] = useState<ProductInput | null>(null);
  const [formErr, setFormErr] = useState('');

  const save = () => {
    if (!editing) return;
    if (!editing.name.trim()) { setFormErr('กรอกชื่อสินค้า'); return; }
    if (!(editing.price >= 0)) { setFormErr('ราคาต้องไม่ติดลบ'); return; }
    action.run('save', async () => {
      await repo.saveProduct({ ...editing, price: Number(editing.price) });
      setEditing(null);
      return 'บันทึกสินค้าแล้ว';
    });
  };

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error) return <EmptyState title="โหลดสินค้าไม่สำเร็จ" description={error} />;
  if (!data) return null;
  const catName = (id: string) => data.categories.find((c) => c.id === id)?.name ?? '';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">สินค้า</h1>
          <p className="text-sm text-coffee-mute">{data.products.length} รายการ · ตัวเลือก (ขนาด หวาน ฯลฯ) ตั้งค่าได้ในฐานข้อมูลในเฟสนี้</p>
        </div>
        <Button onClick={() => setEditing(blank(data.categories[0]?.id ?? ''))}>+ เพิ่มสินค้า</Button>
      </div>
      {action.notice && <p role="status" className="text-sm text-matcha-dark">{action.notice}</p>}
      {action.error && <p role="alert" className="text-sm text-terracotta-ink">{action.error}</p>}

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
            {data.products.map((p: Product) => (
              <tr key={p.id} className="border-b border-oat-soft last:border-0">
                <td className="px-4 py-3"><span className="mr-2" aria-hidden="true">{p.emoji}</span><span className="font-medium">{p.name}</span>{p.featured && <span className="ml-2"><Badge tone="oat">แนะนำ</Badge></span>}</td>
                <td className="px-4 py-3">{catName(p.categoryId)}</td>
                <td className="px-4 py-3">{baht(p.price)}</td>
                <td className="px-4 py-3">{p.available ? <Badge tone="matcha">เปิดขาย</Badge> : <Badge tone="muted">หมดชั่วคราว</Badge>}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" disabled={!!action.busy} onClick={() => action.run(`a-${p.id}`, async () => { await repo.setProductAvailable(p.id, !p.available); })}>
                      {p.available ? 'ปิดการขาย' : 'เปิดการขาย'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setFormErr(''); setEditing({ id: p.id, name: p.name, categoryId: p.categoryId, description: p.description, price: p.price, emoji: p.emoji, available: p.available, featured: p.featured }); }}>แก้ไข</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า'}>
        {editing && (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium">ชื่อสินค้า</span>
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="rounded-[12px] border border-oat bg-white px-3 py-2.5" /></label>
            <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium">หมวด</span>
              <select value={editing.categoryId} onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })} className="rounded-[12px] border border-oat bg-white px-3 py-2.5">
                {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium">ราคา (บาท)</span>
                <input type="number" min={0} step={1} value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} className="rounded-[12px] border border-oat bg-white px-3 py-2.5" /></label>
              <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium">อีโมจิ</span>
                <input value={editing.emoji} maxLength={4} onChange={(e) => setEditing({ ...editing, emoji: e.target.value })} className="rounded-[12px] border border-oat bg-white px-3 py-2.5" /></label>
            </div>
            <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium">คำอธิบาย</span>
              <input value={editing.description} maxLength={200} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="rounded-[12px] border border-oat bg-white px-3 py-2.5" /></label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={editing.available} onChange={(e) => setEditing({ ...editing, available: e.target.checked })} className="accent-matcha-dark" />เปิดขาย</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={editing.featured} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} className="accent-matcha-dark" />เมนูแนะนำ</label>
            </div>
            {formErr && <p role="alert" className="text-sm text-terracotta-ink">{formErr}</p>}
            <Button size="lg" disabled={!!action.busy} onClick={save}>บันทึกสินค้า</Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
