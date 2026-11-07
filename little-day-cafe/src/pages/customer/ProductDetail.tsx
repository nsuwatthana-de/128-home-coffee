import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Card, EmptyState } from '../../ui';
import { baht, cx } from '../../lib/format';
import { products } from '../../mock/data';

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = products.find((p) => p.id === id);
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  if (!product) {
    return (
      <EmptyState
        title="ไม่พบเมนูนี้"
        description="เมนูอาจถูกลบหรือปิดการขายแล้ว"
        action={<Link to="/menu" className="text-sm font-medium text-matcha-dark">กลับไปหน้าเมนู</Link>}
      />
    );
  }

  const toggle = (groupId: string, valueId: string, type: 'single' | 'multi') => {
    setSelected((prev) => {
      const current = prev[groupId] ?? [];
      if (type === 'single') return { ...prev, [groupId]: [valueId] };
      return { ...prev, [groupId]: current.includes(valueId) ? current.filter((v) => v !== valueId) : [...current, valueId] };
    });
  };

  const extra = product.options.reduce((sum, g) =>
    sum + g.values.filter((v) => (selected[g.id] ?? []).includes(v.id)).reduce((s, v) => s + v.priceDelta, 0), 0);
  const unit = product.price + extra;

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

      {product.options.map((group) => (
        <fieldset key={group.id} className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">
            {group.name}{group.required && <span className="ml-1 text-terracotta-ink">*</span>}
          </legend>
          <div className="flex flex-wrap gap-2">
            {group.values.map((v) => {
              const on = (selected[group.id] ?? []).includes(v.id);
              return (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(group.id, v.id, group.type)}
                  className={cx(
                    'rounded-full border px-3.5 py-2 text-sm font-medium transition-colors duration-150',
                    on ? 'border-matcha-dark bg-matcha-dark text-white' : 'border-oat bg-white hover:bg-oat-soft',
                  )}
                >
                  {v.name}{v.priceDelta > 0 && <span className="ml-1 opacity-80">+{v.priceDelta}</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <Card className="flex items-center justify-between">
        <span className="font-medium">จำนวน</span>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" aria-label="ลดจำนวน" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</Button>
          <span className="w-6 text-center font-semibold" aria-live="polite">{qty}</span>
          <Button variant="secondary" size="sm" aria-label="เพิ่มจำนวน" onClick={() => setQty((q) => Math.min(20, q + 1))}>+</Button>
        </div>
      </Card>

      {/* Phase 1: ยังไม่มีตะกร้าจริง ปุ่มนี้พาไปหน้าตะกร้าเพื่อดูการไหลของหน้าจอ (ตะกร้าจริงอยู่ใน Phase 2) */}
      <Button size="lg" onClick={() => navigate('/cart')} disabled={!product.available}>
        {product.available ? `เพิ่มลงตะกร้า · ${baht(unit * qty)}` : 'หมดชั่วคราว'}
      </Button>
    </div>
  );
}
