import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Segmented } from '../../ui';
import { EmptyState } from '../../ui';
import { ProductCard } from '../../components/ProductCard';
import { categories, products } from '../../mock/data';

export function Menu() {
  const [params] = useSearchParams();
  const initial = params.get('cat') ?? categories[0].id;
  const [cat, setCat] = useState(initial);

  const items = useMemo(() => products.filter((p) => p.categoryId === cat), [cat]);
  const options = categories.map((c) => ({ value: c.id, label: `${c.emoji} ${c.name}` }));

  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="text-xl font-bold">เมนู</h1>
      <Segmented options={options} value={cat} onChange={setCat} label="หมวดเมนู" />
      {items.length === 0 ? (
        <EmptyState title="ยังไม่มีเมนูในหมวดนี้" description="ทางร้านกำลังเตรียมเมนูใหม่ ลองหมวดอื่นดูนะคะ" />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
