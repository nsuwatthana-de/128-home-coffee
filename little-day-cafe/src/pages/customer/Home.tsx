import { Link } from 'react-router-dom';
import { Button, Card, Skeleton, EmptyState } from '../../ui';
import { ProductCard } from '../../components/ProductCard';
import { repo } from '../../data';
import { useLive } from '../../hooks/useLive';
import { useTable } from '../../table/TableProvider';

export function Home() {
  const { status, code } = useTable();
  const { data, loading, error } = useLive(async () => {
    const [categories, products] = await Promise.all([repo.listCategories(), repo.listProducts()]);
    return { categories, products };
  });
  const menuLink = status === 'ok' ? '/menu' : '/menu';

  return (
    <div className="flex flex-col gap-6 pt-2">
      <section className="rounded-[20px] bg-matcha-soft p-5">
        <p className="text-sm text-matcha-dark">Good morning!</p>
        <h1 className="mt-1 text-2xl font-bold leading-snug">เติมความสุขให้วันนี้ ♡</h1>
        <p className="mt-1 text-sm text-coffee-mute">
          {status === 'ok' ? `สั่งที่โต๊ะ ${code} ได้เลยค่ะ` : 'เครื่องดื่มดี ๆ กับขนมแสนอร่อย'}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link to={menuLink} className="contents"><Button>ดูเมนู</Button></Link>
          <Link to="/menu?takeaway=1" className="contents"><Button variant="secondary">สั่งกลับบ้าน</Button></Link>
        </div>
      </section>

      {loading && <div className="grid grid-cols-2 gap-3"><Skeleton className="h-52" /><Skeleton className="h-52" /></div>}
      {error && <EmptyState title="โหลดเมนูไม่สำเร็จ" description={error} />}

      {data && (
        <>
          <section aria-labelledby="cats" className="flex flex-col gap-3">
            <h2 id="cats" className="font-semibold">หมวดหมู่</h2>
            <div className="grid grid-cols-4 gap-2">
              {data.categories.map((c) => (
                <Link key={c.id} to={`/menu?cat=${c.id}`} className="contents">
                  <Card className="flex flex-col items-center gap-1 p-3 text-center text-xs font-medium">
                    <span className="text-2xl" aria-hidden="true">{c.emoji}</span>
                    {c.name}
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="featured" className="flex flex-col gap-3">
            <div className="flex items-end justify-between">
              <h2 id="featured" className="font-semibold">เมนูแนะนำ</h2>
              <Link to="/menu" className="text-sm font-medium text-matcha-dark">ดูทั้งหมด</Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {data.products.filter((p) => p.featured).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
