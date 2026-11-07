import { Link } from 'react-router-dom';
import { Badge, Card, Stat } from '../../ui';
import { SalesChart } from '../../components/SalesChart';
import { OrderCard } from '../../components/OrderCard';
import { baht } from '../../lib/format';
import { orders, products, salesSeries } from '../../mock/data';

// ตัวเลขทั้งหมดเป็นข้อมูลตัวอย่างสำหรับการออกแบบหน้าจอ
export function Dashboard() {
  const best = [
    { name: 'Iced Latte', qty: 42 },
    { name: 'Croissant', qty: 31 },
    { name: 'Strawberry Cake', qty: 18 },
  ];
  const pending = orders.filter((o) => o.status === 'new' || o.status === 'preparing').length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">ภาพรวมวันนี้</h1>
        <p className="text-sm text-coffee-mute">ข้อมูลตัวอย่าง</p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="ยอดขายวันนี้" value={baht(4850)} hint="+12.5% จากเมื่อวาน" />
        <Stat label="ออเดอร์วันนี้" value="56" hint="รายการ" />
        <Stat label="รอดำเนินการ" value={pending} hint="ออเดอร์" />
        <Stat label="ยอดเฉลี่ยต่อบิล" value={baht(87)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h2 className="mb-4 font-semibold">ยอดขาย 7 วัน</h2>
          <SalesChart data={salesSeries} />
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">สินค้าขายดี</h2>
          <ol className="flex flex-col gap-3">
            {best.map((b, i) => (
              <li key={b.name} className="flex items-center justify-between text-sm">
                <span><span className="mr-2 text-coffee-mute">{i + 1}</span>{b.name}</span>
                <Badge tone="matcha">{b.qty} ชิ้น</Badge>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-coffee-mute">เมนูทั้งหมด {products.length} รายการ</p>
        </Card>
      </div>

      <section aria-labelledby="recent" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="recent" className="font-semibold">ออเดอร์ล่าสุด</h2>
          <Link to="/admin/orders" className="text-sm font-medium text-matcha-dark">ดูทั้งหมด</Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {orders.slice(0, 3).map((o) => <OrderCard key={o.id} order={o} />)}
        </div>
      </section>
    </div>
  );
}
