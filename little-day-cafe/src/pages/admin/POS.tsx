import { useMemo, useState } from 'react';
import { Button, Card, Dialog, EmptyState, Segmented, Skeleton } from '../../ui';
import { baht, cx } from '../../lib/format';
import { repo } from '../../data';
import { useLive } from '../../hooks/useLive';
import { useAction } from '../../hooks/useAction';
import { ProductConfigurator } from '../../components/ProductConfigurator';
import { missingRequired, selectionLabels, unitPriceWith } from '../../domain/options';
import type { SelectionInput } from '../../domain/pricing';
import type { PaymentMethod, Product } from '../../types';

interface Line {
  key: string;
  product: Product;
  qty: number;
  selections: SelectionInput[];
  note: string;
}

// ขายหน้าร้าน: พนักงานเปิดออเดอร์ให้ลูกค้าที่เคาน์เตอร์ (ไม่ผูกกับโต๊ะ)
export function POS() {
  const { data, loading, error } = useLive(async () => {
    const [categories, products] = await Promise.all([repo.listCategories(), repo.listProducts()]);
    return { categories, products };
  });
  const action = useAction();
  const [cat, setCat] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [markPaid, setMarkPaid] = useState(false);
  const [picking, setPicking] = useState<Product | null>(null);
  const [pickSel, setPickSel] = useState<SelectionInput[]>([]);
  const [pickQty, setPickQty] = useState(1);
  const [pickNote, setPickNote] = useState('');
  const [pickErr, setPickErr] = useState('');
  const [done, setDone] = useState<string | null>(null);

  const activeCat = cat ?? data?.categories[0]?.id ?? null;
  const items = useMemo(() => (data?.products ?? []).filter((p) => p.categoryId === activeCat), [data, activeCat]);
  const total = lines.reduce((s, l) => s + unitPriceWith(l.product, l.selections) * l.qty, 0);

  const openPick = (p: Product) => {
    setPicking(p); setPickSel([]); setPickQty(1); setPickNote(''); setPickErr('');
  };
  const confirmPick = () => {
    if (!picking) return;
    const missing = missingRequired(picking, pickSel);
    if (missing.length) { setPickErr(`กรุณาเลือก${missing.join(' และ')}`); return; }
    const key = JSON.stringify([picking.id, pickSel, pickNote]);
    setLines((prev) => {
      const found = prev.find((l) => l.key === key);
      return found
        ? prev.map((l) => (l.key === key ? { ...l, qty: Math.min(20, l.qty + pickQty) } : l))
        : [...prev, { key, product: picking, qty: pickQty, selections: pickSel, note: pickNote.trim() }];
    });
    setPicking(null);
  };

  const submit = () => action.run('pos', async () => {
    const order = await repo.createOrder({
      channel: 'counter',
      method,
      items: lines.map((l) => ({ productId: l.product.id, qty: l.qty, selections: l.selections, note: l.note || undefined })),
    });
    if (markPaid) await repo.confirmPayment(order.id, method);
    setLines([]);
    setDone(`สร้างออเดอร์ ${order.no} แล้ว${markPaid ? ' (รับเงินแล้ว)' : ''}`);
  });

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error) return <EmptyState title="โหลดเมนูไม่สำเร็จ" description={error} />;
  if (!data) return null;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <section className="flex min-w-0 flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">ขายหน้าร้าน</h1>
          <p className="text-sm text-coffee-mute">เปิดออเดอร์ให้ลูกค้าที่เคาน์เตอร์</p>
        </div>
        <Segmented options={data.categories.map((c) => ({ value: c.id, label: `${c.emoji} ${c.name}` }))}
          value={activeCat ?? ''} onChange={setCat} label="หมวดสินค้า" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {items.map((p) => (
            <button key={p.id} disabled={!p.available} onClick={() => openPick(p)}
              className={cx('flex flex-col gap-1 rounded-[16px] bg-white p-3 text-left shadow-soft transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-50')}>
              <span className="text-3xl" aria-hidden="true">{p.emoji}</span>
              <span className="font-semibold leading-snug">{p.name}</span>
              <span className="text-sm text-coffee-mute">{baht(p.price)}{!p.available && ' · หมด'}</span>
            </button>
          ))}
        </div>
      </section>

      <aside className="flex flex-col gap-3">
        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">ออเดอร์ใหม่</h2>
          {lines.length === 0 ? <p className="text-sm text-coffee-mute">แตะเมนูเพื่อเพิ่มรายการ</p> : (
            <ul className="flex flex-col gap-2">
              {lines.map((l) => (
                <li key={l.key} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{l.product.name}</p>
                    <p className="text-xs text-coffee-mute">{selectionLabels(l.product, l.selections).join(' · ')}{l.note && ` · ${l.note}`}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" aria-label="ลด" onClick={() => setLines((p) => p.map((x) => x.key === l.key ? { ...x, qty: x.qty - 1 } : x).filter((x) => x.qty > 0))}>−</Button>
                    <span className="w-4 text-center">{l.qty}</span>
                    <Button size="sm" variant="secondary" aria-label="เพิ่ม" onClick={() => setLines((p) => p.map((x) => x.key === l.key ? { ...x, qty: Math.min(20, x.qty + 1) } : x))}>+</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between border-t border-oat-soft pt-3">
            <span className="text-coffee-mute">รวม</span>
            <span className="text-xl font-bold">{baht(total)}</span>
          </div>
          <Segmented options={[{ value: 'cash' as const, label: 'เงินสด' }, { value: 'promptpay' as const, label: 'PromptPay' }]}
            value={method} onChange={setMethod} label="วิธีชำระ" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} className="size-4 accent-matcha-dark" />
            รับเงินแล้วตอนนี้ (ยืนยันการชำระ)
          </label>
          {action.error && <p role="alert" className="text-sm text-terracotta-ink">{action.error}</p>}
          {done && <p role="status" className="text-sm text-matcha-dark">{done}</p>}
          <Button size="lg" disabled={lines.length === 0 || !!action.busy} onClick={submit}>
            {action.busy ? 'กำลังสร้างออเดอร์…' : 'สร้างออเดอร์'}
          </Button>
          {lines.length > 0 && <Button variant="ghost" onClick={() => setLines([])}>ล้างรายการ</Button>}
        </Card>
      </aside>

      <Dialog open={!!picking} onClose={() => setPicking(null)} title={picking?.name ?? ''} sheet>
        {picking && (
          <div className="flex flex-col gap-5">
            <ProductConfigurator product={picking} selections={pickSel} onChange={setPickSel} />
            <input value={pickNote} onChange={(e) => setPickNote(e.target.value)} placeholder="หมายเหตุ (ไม่บังคับ)" maxLength={200}
              className="rounded-[12px] border border-oat bg-white px-3 py-2.5 text-sm outline-none focus-visible:border-matcha focus-visible:ring-2 focus-visible:ring-matcha/30" />
            <div className="flex items-center justify-between">
              <span className="font-medium">จำนวน</span>
              <div className="flex items-center gap-3">
                <Button variant="secondary" size="sm" aria-label="ลด" onClick={() => setPickQty((q) => Math.max(1, q - 1))}>−</Button>
                <span className="w-6 text-center font-semibold">{pickQty}</span>
                <Button variant="secondary" size="sm" aria-label="เพิ่ม" onClick={() => setPickQty((q) => Math.min(20, q + 1))}>+</Button>
              </div>
            </div>
            {pickErr && <p role="alert" className="text-sm text-terracotta-ink">{pickErr}</p>}
            <Button size="lg" onClick={confirmPick}>เพิ่มลงออเดอร์ · {baht(unitPriceWith(picking, pickSel) * pickQty)}</Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
