import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Card, EmptyState, Skeleton } from '../../ui';
import { baht } from '../../lib/format';
import { repo } from '../../data';
import { useLive } from '../../hooks/useLive';
import { useCart } from '../../cart/CartProvider';
import { ProductConfigurator } from '../../components/ProductConfigurator';
import { missingRequired, selectionLabels, unitPriceWith } from '../../domain/options';
import type { SelectionInput } from '../../domain/pricing';

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const { data, loading, error } = useLive(() => repo.listProducts());
  const product = data?.find((p) => p.id === id);
  const [qty, setQty] = useState(1);
  const [selections, setSelections] = useState<SelectionInput[]>([]);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');

  const unit = useMemo(() => (product ? unitPriceWith(product, selections) : 0), [product, selections]);

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error) return <EmptyState title="โหลดเมนูไม่สำเร็จ" description={error} />;
  if (!product) {
    return <EmptyState title="ไม่พบเมนูนี้" description="เมนูอาจถูกปิดการขายแล้ว" action={<Link to="/menu" className="text-sm font-medium text-matcha-dark">กลับไปหน้าเมนู</Link>} />;
  }

  const add = () => {
    const missing = missingRequired(product, selections);
    if (missing.length) { setMsg(`กรุณาเลือก${missing.join(' และ')}`); return; }
    cart.add({
      productId: product.id,
      name: product.name,
      emoji: product.emoji,
      selections,
      labels: selectionLabels(product, selections),
      unitPrice: unit,
      note: note.trim(),
    }, qty);
    navigate('/cart');
  };

  return (
    <div className="flex flex-col gap-5 pt-2 pb-6">
      <Link to="/menu" className="text-sm text-coffee-mute">← กลับ</Link>
      <div aria-hidden="true" className="flex aspect-[4/3] items-center justify-center rounded-[20px] bg-oat-soft text-8xl">
        {product.emoji}
      </div>
      <div>
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <p className="mt-1 text-coffee-mute">{product.description}</p>
        <p className="mt-2 font-semibold">{baht(product.price)}</p>
      </div>

      {product.available ? (
        <>
          <ProductConfigurator product={product} selections={selections} onChange={setSelections} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">หมายเหตุ <span className="text-coffee-mute">(ไม่บังคับ)</span></span>
            <input
              value={note}
              maxLength={200}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ไม่ใส่วิปครีม"
              className="rounded-[12px] border border-oat bg-white px-3 py-2.5 outline-none focus-visible:border-matcha focus-visible:ring-2 focus-visible:ring-matcha/30"
            />
          </label>
          <Card className="flex items-center justify-between">
            <span className="font-medium">จำนวน</span>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" aria-label="ลดจำนวน" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</Button>
              <span className="w-6 text-center font-semibold" aria-live="polite">{qty}</span>
              <Button variant="secondary" size="sm" aria-label="เพิ่มจำนวน" onClick={() => setQty((q) => Math.min(20, q + 1))}>+</Button>
            </div>
          </Card>
          {msg && <p role="alert" className="text-sm text-terracotta-ink">{msg}</p>}
          <Button size="lg" onClick={add}>เพิ่มลงตะกร้า · {baht(unit * qty)}</Button>
        </>
      ) : (
        <EmptyState title="หมดชั่วคราว" description="เมนูนี้ปิดการขายชั่วคราว" />
      )}
    </div>
  );
}
