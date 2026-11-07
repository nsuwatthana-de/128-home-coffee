import { Link } from 'react-router-dom';
import { Badge, Card, EmptyState, Skeleton, Stat } from '../../ui';
import { SalesChart } from '../../components/SalesChart';
import { OrderCard } from '../../components/OrderCard';
import { baht } from '../../lib/format';
import { repo } from '../../data';
import { useLive } from '../../hooks/useLive';
import { lastDaysRange, todayRange, ymd } from '../../lib/range';
import { summarize } from '../../domain/reports';
import { isOpen } from '../../domain/status';

export function Dashboard() {
  const { data, loading, error } = useLive(async () => {
    const [today, week, categories, products] = await Promise.all([
      repo.listOrders(todayRange()), repo.listOrders(lastDaysRange(7)), repo.listCategories(), repo.listProducts(),
    ]);
    return { today, week, categories, products };
  });

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error) return <EmptyState title="โหลดข้อมูลไม่สำเร็จ" description={error} />;
  if (!data) return null;

  const todaySum = summarize(data.today, []);
  const pending = data.today.filter((o) => isOpen(o.status)).length;

  // ยอดขาย 7 วัน (เฉพาะที่ชำระแล้ว)
  const days: { day: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = ymd(d);
    const value = data.week
      .filter((o) => o.status !== 'cancelled' && o.paymentStatus === 'paid' && ymd(new Date(o.createdAt)) === key)
      .reduce((s, o) => s + o.total, 0);
    days.push({ day: d.toLocaleDateString('th-TH', { weekday: 'short' }), value });
  }
  const weekSum = summarize(data.week, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">ภาพรวมวันนี้</h1>
        <p className="text-sm text-coffee-mute">ยอดขายนับเฉพาะออเดอร์ที่ชำระแล้วและไม่ถูกยกเลิก</p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="ยอดขายวันนี้" value={baht(todaySum.revenue)} />
        <Stat label="ออเดอร์วันนี้" value={todaySum.orders} hint="ไม่รวมที่ยกเลิก" />
        <Stat label="กำลังดำเนินการ" value={pending} hint="ออเดอร์" />
        <Stat label="ยอดเฉลี่ยต่อบิล" value={baht(todaySum.average)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h2 className="mb-4 font-semibold">ยอดขาย 7 วัน</h2>
          <SalesChart data={days} />
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">สินค้าขายดี (7 วัน)</h2>
          {weekSum.topProducts.length === 0 ? <p className="text-sm text-coffee-mute">ยังไม่มีข้อมูล</p> : (
            <ol className="flex flex-col gap-3">
              {weekSum.topProducts.slice(0, 5).map((b, i) => (
                <li key={b.name} className="flex items-center justify-between text-sm">
                  <span><span className="mr-2 text-coffee-mute">{i + 1}</span>{b.name}</span>
                  <Badge tone="matcha">{b.qty} ชิ้น</Badge>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 text-xs text-coffee-mute">หมวด: {data.categories.map((c) => c.name).join(' · ')}</p>
        </Card>
      </div>

      <section aria-labelledby="recent" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="recent" className="font-semibold">ออเดอร์ล่าสุด</h2>
          <Link to="/admin/orders" className="text-sm font-medium text-matcha-dark">ดูทั้งหมด</Link>
        </div>
        {data.today.length === 0 ? (
          <EmptyState title="ยังไม่มีออเดอร์วันนี้" description="ออเดอร์จากลูกค้าและหน้าเคาน์เตอร์จะแสดงที่นี่" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.today.slice(0, 3).map((o) => <OrderCard key={o.id} order={o} />)}
          </div>
        )}
      </section>
    </div>
  );
}
