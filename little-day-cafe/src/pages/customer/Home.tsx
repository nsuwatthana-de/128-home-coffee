import { Link } from 'react-router-dom';
import { Button, Card } from '../../ui';
import { ProductCard } from '../../components/ProductCard';
import { categories, products } from '../../mock/data';

export function Home() {
  const featured = products.filter((p) => p.featured);
  return (
    <div className="flex flex-col gap-6 pt-2">
      <section className="rounded-[20px] bg-matcha-soft p-5">
        <p className="text-sm text-matcha-dark">Good morning!</p>
        <h1 className="mt-1 text-2xl font-bold leading-snug">เติมความสุขให้วันนี้ ♡</h1>
        <p className="mt-1 text-sm text-coffee-mute">เครื่องดื่มดี ๆ กับขนมแสนอร่อย</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link to="/menu" className="contents">
            <Button size="md">ทานที่ร้าน</Button>
          </Link>
          <Link to="/menu?takeaway=1" className="contents">
            <Button variant="secondary" size="md">กลับบ้าน</Button>
          </Link>
        </div>
      </section>

      <section aria-labelledby="cats" className="flex flex-col gap-3">
        <h2 id="cats" className="font-semibold">หมวดหมู่</h2>
        <div className="grid grid-cols-4 gap-2">
          {categories.map((c) => (
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
          <h2 id="featured" className="font-semibold">เมนูแนะนำวันนี้</h2>
          <Link to="/menu" className="text-sm font-medium text-matcha-dark">ดูทั้งหมด</Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </div>
  );
}
