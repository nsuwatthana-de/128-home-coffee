import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState, Segmented, Skeleton } from '../../ui';
import { ProductCard } from '../../components/ProductCard';
import { repo } from '../../data';
import { useLive } from '../../hooks/useLive';

export function Menu() {
  const [params] = useSearchParams();
  const { data, loading, error } = useLive(async () => {
    const [categories, products] = await Promise.all([repo.listCategories(), repo.listProducts()]);
    return { categories, products };
  });
  const [cat, setCat] = useState<string | null>(null);
  const active = cat ?? params.get('cat') ?? data?.categories[0]?.id ?? null;

  const items = useMemo(() => (data?.products ?? []).filter((p) => p.categoryId === active), [data, active]);
  const options = (data?.categories ?? []).map((c) => ({ value: c.id, label: `${c.emoji} ${c.name}` }));

  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="text-xl font-bold">เมนู</h1>
      {loading && <Skeleton className="h-10 w-full" />}
      {error && <EmptyState title="โหลดเมนูไม่สำเร็จ" description={error} />}
      {data && active && <Segmented options={options} value={active} onChange={setCat} label="หมวดเมนู" />}
      {data && (items.length === 0 ? (
        <EmptyState title="ยังไม่มีเมนูในหมวดนี้" description="ลองเลือกหมวดอื่นดูนะคะ" />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      ))}
    </div>
  );
}
