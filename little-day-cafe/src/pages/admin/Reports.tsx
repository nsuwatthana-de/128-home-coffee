import { useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, Segmented, Skeleton, Stat } from '../../ui';
import { baht, timeTH } from '../../lib/format';
import { repo } from '../../data';
import { useLive } from '../../hooks/useLive';
import { useAction } from '../../hooks/useAction';
import { periodRange, type Period } from '../../lib/range';
import { summarize, toCSV } from '../../domain/reports';
import { statusLabel } from '../../components/OrderCard';

const EXP_CATS = ['วัตถุดิบ', 'ค่าเช่า', 'ค่าน้ำ/ไฟ', 'ค่าแก๊ส/อินเทอร์เน็ต', 'ค่าขนส่ง', 'อุปกรณ์', 'อื่นๆ'];

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Reports() {
  const [period, setPeriod] = useState<Period>('month');
  const range = useMemo(() => periodRange(period), [period]);
  const { data, loading, error } = useLive(async () => {
    const [orders, expenses, categories] = await Promise.all([
      repo.listOrders({ from: range.from, to: range.to }),
      repo.listExpenses({ from: range.fromDate, to: range.toDate }),
      repo.listCategories(),
    ]);
    return { orders, expenses, categories };
  }, [period]);
  const action = useAction();
  const [expForm, setExpForm] = useState({ spentOn: range.toDate, category: EXP_CATS[0], amount: '', note: '' });
  const [expErr, setExpErr] = useState('');

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error) return <EmptyState title="โหลดรายงานไม่สำเร็จ" description={error} />;
  if (!data) return null;

  const s = summarize(data.orders, data.expenses);
  const catName = (id: string) => data.categories.find((c) => c.id === id)?.name ?? id;

  const exportOrders = () => {
    const rows: (string | number)[][] = [['เลขออเดอร์', 'เวลา', 'ช่องทาง', 'โต๊ะ', 'สถานะ', 'การชำระ', 'ยอดรวม', 'ต้นทุน', 'รายการ']];
    for (const o of data.orders) {
      rows.push([o.no, new Date(o.createdAt).toLocaleString('th-TH'), o.channel, o.table ?? '', statusLabel[o.status],
        o.paymentStatus, o.total, o.costTotal,
        o.lines.map((l) => `${l.name}×${l.qty}${l.options.length ? `(${l.options.join('/')})` : ''}`).join('; ')]);
    }
    download(`orders-${range.fromDate}-${range.toDate}.csv`, toCSV(rows));
  };

  const addExpense = () => {
    const amount = Number(expForm.amount);
    if (!(amount > 0)) { setExpErr('กรอกจำนวนเงินที่มากกว่า 0'); return; }
    setExpErr('');
    action.run('exp', async () => {
      await repo.addExpense({ spentOn: expForm.spentOn, category: expForm.category, amount, note: expForm.note.trim() || undefined });
      setExpForm({ ...expForm, amount: '', note: '' });
      return 'บันทึกรายจ่ายแล้ว';
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">รายงาน</h1>
          <p className="text-sm text-coffee-mute">รายรับนับเมื่อชำระแล้ว ต้นทุนมาจากสูตรตอนสั่ง</p>
        </div>
        <div className="flex gap-2">
          <Segmented options={[{ value: 'today' as const, label: 'วันนี้' }, { value: 'week' as const, label: '7 วัน' }, { value: 'month' as const, label: 'เดือนนี้' }]}
            value={period} onChange={setPeriod} label="ช่วงเวลา" />
          <Button variant="secondary" size="sm" onClick={exportOrders}>ส่งออก CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="รายรับ" value={baht(s.revenue)} />
        <Stat label="ต้นทุนสินค้า" value={baht(s.cost)} />
        <Stat label="กำไรขั้นต้น" value={baht(s.grossProfit)} />
        <Stat label="กำไรสุทธิโดยประมาณ" value={baht(s.netProfit)} hint={`รายจ่ายอื่น ${baht(s.expenses)}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">สินค้าขายดี</h2>
          {s.topProducts.length === 0 ? <p className="text-sm text-coffee-mute">ยังไม่มีข้อมูลในช่วงนี้</p> : (
            <table className="w-full text-sm">
              <thead className="text-left text-coffee-mute"><tr><th className="py-2 font-medium">สินค้า</th><th className="py-2 text-right font-medium">ชิ้น</th><th className="py-2 text-right font-medium">ยอดขาย</th></tr></thead>
              <tbody>{s.topProducts.map((p) => (
                <tr key={p.name} className="border-t border-oat-soft"><td className="py-2">{p.name}</td><td className="py-2 text-right">{p.qty}</td><td className="py-2 text-right">{baht(p.sales)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">ยอดขายตามหมวด</h2>
          {s.byCategory.length === 0 ? <p className="text-sm text-coffee-mute">ยังไม่มีข้อมูลในช่วงนี้</p> : (
            <ul className="flex flex-col gap-2 text-sm">
              {s.byCategory.map((c) => (
                <li key={c.categoryId} className="flex justify-between border-t border-oat-soft pt-2 first:border-0 first:pt-0"><span>{catName(c.categoryId)}</span><span>{baht(c.sales)}</span></li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-coffee-mute">ออเดอร์ทั้งหมด {s.orders} รายการ · เฉลี่ย {baht(s.average)} ต่อบิลที่ชำระ</p>
        </Card>
      </div>

      <section aria-labelledby="exp" className="flex flex-col gap-3">
        <h2 id="exp" className="font-semibold">รายจ่าย</h2>
        <Card className="grid gap-3 md:grid-cols-[160px_1fr_140px_1fr_auto] md:items-end">
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">วันที่</span>
            <input type="date" value={expForm.spentOn} onChange={(e) => setExpForm({ ...expForm, spentOn: e.target.value })} className="rounded-[12px] border border-oat bg-white px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">หมวด</span>
            <select value={expForm.category} onChange={(e) => setExpForm({ ...expForm, category: e.target.value })} className="rounded-[12px] border border-oat bg-white px-3 py-2">
              {EXP_CATS.map((c) => <option key={c}>{c}</option>)}
            </select></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">จำนวน (฿)</span>
            <input type="number" min={0} step={1} value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} className="rounded-[12px] border border-oat bg-white px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">บันทึก</span>
            <input value={expForm.note} maxLength={60} onChange={(e) => setExpForm({ ...expForm, note: e.target.value })} className="rounded-[12px] border border-oat bg-white px-3 py-2" /></label>
          <Button disabled={!!action.busy} onClick={addExpense}>+ บันทึก</Button>
        </Card>
        {expErr && <p role="alert" className="text-sm text-terracotta-ink">{expErr}</p>}
        {action.error && <p role="alert" className="text-sm text-terracotta-ink">{action.error}</p>}
        {action.notice && <p role="status" className="text-sm text-matcha-dark">{action.notice}</p>}
        {data.expenses.length === 0 ? <p className="text-sm text-coffee-mute">ยังไม่มีรายจ่ายในช่วงนี้</p> : (
          <ul className="flex flex-col gap-2">
            {data.expenses.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 rounded-[14px] bg-white px-4 py-3 text-sm shadow-soft">
                <div><span className="font-semibold">{baht(e.amount)}</span> <Badge tone="oat">{e.category}</Badge>
                  <p className="text-xs text-coffee-mute">{e.spentOn}{e.note ? ` · ${e.note}` : ''}</p></div>
                <Button size="sm" variant="ghost" disabled={!!action.busy} onClick={() => { if (confirm('ลบรายการนี้?')) action.run(`del-${e.id}`, async () => { await repo.deleteExpense(e.id); }); }}>ลบ</Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-xs text-coffee-mute">เวลาอ้างอิง {timeTH(new Date().toISOString())} · ข้อมูลอัปเดตอัตโนมัติ</p>
    </div>
  );
}
