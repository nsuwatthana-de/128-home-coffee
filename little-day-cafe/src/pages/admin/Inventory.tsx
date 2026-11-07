import { useState } from 'react';
import { Badge, Button, Card, Dialog, EmptyState, Skeleton } from '../../ui';
import { repo } from '../../data';
import { useLive } from '../../hooks/useLive';
import { useAction } from '../../hooks/useAction';
import type { Ingredient, RecipeItem, StockReason } from '../../types';

interface IngForm { id?: string; name: string; unit: string; qty: number; minQty: number; unitCost: number; supplier: string }
const blankIng: IngForm = { name: '', unit: 'g', qty: 0, minQty: 0, unitCost: 0, supplier: '' };
const reasons: { value: StockReason; label: string; sign: 1 | -1 }[] = [
  { value: 'purchase', label: 'รับเข้า', sign: 1 },
  { value: 'adjust', label: 'ปรับยอด (+)', sign: 1 },
  { value: 'waste', label: 'เสีย / ทิ้ง', sign: -1 },
];

export function Inventory() {
  const { data, loading, error } = useLive(async () => {
    const [ingredients, recipes, products] = await Promise.all([repo.listIngredients(), repo.listRecipes(), repo.listProducts()]);
    return { ingredients, recipes, products };
  });
  const action = useAction();
  const [ingForm, setIngForm] = useState<IngForm | null>(null);
  const [adjusting, setAdjusting] = useState<Ingredient | null>(null);
  const [adjQty, setAdjQty] = useState(0);
  const [adjReason, setAdjReason] = useState<StockReason>('purchase');
  const [recipeFor, setRecipeFor] = useState<string | null>(null);
  const [recipeRows, setRecipeRows] = useState<RecipeItem[]>([]);
  const [formErr, setFormErr] = useState('');

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error) return <EmptyState title="โหลดวัตถุดิบไม่สำเร็จ" description={error} />;
  if (!data) return null;
  const ing = (id: string) => data.ingredients.find((i) => i.id === id);

  const saveIng = () => {
    if (!ingForm) return;
    if (!ingForm.name.trim()) { setFormErr('กรอกชื่อวัตถุดิบ'); return; }
    action.run('ing', async () => {
      await repo.saveIngredient({ ...ingForm, supplier: ingForm.supplier || undefined });
      setIngForm(null);
      return 'บันทึกวัตถุดิบแล้ว';
    });
  };

  const adjust = () => {
    if (!adjusting) return;
    const r = reasons.find((x) => x.value === adjReason)!;
    const delta = r.sign * Math.abs(adjQty);
    if (!delta) { setFormErr('กรอกจำนวน'); return; }
    action.run(`adj-${adjusting.id}`, async () => {
      await repo.adjustStock(adjusting.id, delta, adjReason);
      setAdjusting(null);
      return `ปรับสต็อก ${adjusting.name} แล้ว`;
    });
  };

  const openRecipe = (productId: string) => {
    setRecipeFor(productId);
    setRecipeRows(data.recipes[productId] ?? []);
  };
  const saveRecipe = () => {
    if (!recipeFor) return;
    action.run('recipe', async () => {
      await repo.saveRecipe(recipeFor, recipeRows.filter((r) => r.ingredientId && r.qty > 0));
      setRecipeFor(null);
      return 'บันทึกสูตรแล้ว';
    });
  };

  const recipeCostOf = (productId: string) => (data.recipes[productId] ?? [])
    .reduce((s, it) => s + (ing(it.ingredientId)?.unitCost ?? 0) * it.qty, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">วัตถุดิบและสูตร</h1>
          <p className="text-sm text-coffee-mute">ออเดอร์ที่สั่งจะตัดสต็อกตามสูตรอัตโนมัติ และคืนเมื่อยกเลิก</p>
        </div>
        <Button onClick={() => { setFormErr(''); setIngForm({ ...blankIng }); }}>+ เพิ่มวัตถุดิบ</Button>
      </div>
      {action.error && <p role="alert" className="text-sm text-terracotta-ink">{action.error}</p>}
      {action.notice && <p role="status" className="text-sm text-matcha-dark">{action.notice}</p>}

      {data.ingredients.length === 0 ? <EmptyState title="ยังไม่มีวัตถุดิบ" /> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-oat-soft text-coffee-mute">
              <tr>
                <th className="px-4 py-3 font-medium">วัตถุดิบ</th>
                <th className="px-4 py-3 font-medium">คงเหลือ</th>
                <th className="px-4 py-3 font-medium">ขั้นต่ำ</th>
                <th className="px-4 py-3 font-medium">ต้นทุน/หน่วย</th>
                <th className="px-4 py-3 font-medium"><span className="sr-only">การทำงาน</span></th>
              </tr>
            </thead>
            <tbody>
              {data.ingredients.map((i) => {
                const low = i.qty <= i.minQty;
                return (
                  <tr key={i.id} className="border-b border-oat-soft last:border-0">
                    <td className="px-4 py-3 font-medium">{i.name}{low && <span className="ml-2"><Badge tone="terracotta">ใกล้หมด</Badge></span>}</td>
                    <td className="px-4 py-3">{i.qty.toLocaleString('th-TH')} {i.unit}</td>
                    <td className="px-4 py-3">{i.minQty.toLocaleString('th-TH')} {i.unit}</td>
                    <td className="px-4 py-3">฿{i.unitCost.toLocaleString('th-TH')}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => { setFormErr(''); setAdjusting(i); setAdjQty(0); setAdjReason('purchase'); }}>ปรับสต็อก</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setFormErr(''); setIngForm({ id: i.id, name: i.name, unit: i.unit, qty: i.qty, minQty: i.minQty, unitCost: i.unitCost, supplier: i.supplier ?? '' }); }}>แก้ไข</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <section aria-labelledby="recipes" className="flex flex-col gap-3">
        <h2 id="recipes" className="font-semibold">สูตรสินค้า (ต้นทุนและการตัดสต็อก)</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.products.map((p) => (
            <Card key={p.id} className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{p.emoji} {p.name}</p>
                <p className="text-xs text-coffee-mute">
                  {(data.recipes[p.id] ?? []).length === 0 ? 'ยังไม่มีสูตร' : `ต้นทุน ≈ ฿${recipeCostOf(p.id).toFixed(2)} · ราคา ฿${p.price}`}
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => openRecipe(p.id)}>ตั้งค่าสูตร</Button>
            </Card>
          ))}
        </div>
      </section>

      <Dialog open={!!ingForm} onClose={() => setIngForm(null)} title={ingForm?.id ? 'แก้ไขวัตถุดิบ' : 'เพิ่มวัตถุดิบ'}>
        {ingForm && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium">ชื่อ</span>
              <input value={ingForm.name} onChange={(e) => setIngForm({ ...ingForm, name: e.target.value })} className="rounded-[12px] border border-oat bg-white px-3 py-2.5" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium">หน่วย</span>
                <input value={ingForm.unit} onChange={(e) => setIngForm({ ...ingForm, unit: e.target.value })} className="rounded-[12px] border border-oat bg-white px-3 py-2.5" /></label>
              {!ingForm.id && (
                <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium">จำนวนเริ่มต้น</span>
                  <input type="number" min={0} value={ingForm.qty} onChange={(e) => setIngForm({ ...ingForm, qty: Number(e.target.value) })} className="rounded-[12px] border border-oat bg-white px-3 py-2.5" /></label>
              )}
              <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium">ขั้นต่ำ (แจ้งเตือน)</span>
                <input type="number" min={0} value={ingForm.minQty} onChange={(e) => setIngForm({ ...ingForm, minQty: Number(e.target.value) })} className="rounded-[12px] border border-oat bg-white px-3 py-2.5" /></label>
              <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium">ต้นทุนต่อหน่วย (฿)</span>
                <input type="number" min={0} step={0.01} value={ingForm.unitCost} onChange={(e) => setIngForm({ ...ingForm, unitCost: Number(e.target.value) })} className="rounded-[12px] border border-oat bg-white px-3 py-2.5" /></label>
            </div>
            {formErr && <p role="alert" className="text-sm text-terracotta-ink">{formErr}</p>}
            <Button size="lg" disabled={!!action.busy} onClick={saveIng}>บันทึก</Button>
          </div>
        )}
      </Dialog>

      <Dialog open={!!adjusting} onClose={() => setAdjusting(null)} title={adjusting ? `ปรับสต็อก · ${adjusting.name}` : ''}>
        {adjusting && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-coffee-mute">คงเหลือ {adjusting.qty} {adjusting.unit}</p>
            <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium">เหตุผล</span>
              <select value={adjReason} onChange={(e) => setAdjReason(e.target.value as StockReason)} className="rounded-[12px] border border-oat bg-white px-3 py-2.5">
                {reasons.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select></label>
            <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium">จำนวน ({adjusting.unit})</span>
              <input type="number" min={0} value={adjQty} onChange={(e) => setAdjQty(Number(e.target.value))} className="rounded-[12px] border border-oat bg-white px-3 py-2.5" /></label>
            {formErr && <p role="alert" className="text-sm text-terracotta-ink">{formErr}</p>}
            <Button size="lg" disabled={!!action.busy} onClick={adjust}>บันทึกการปรับสต็อก</Button>
          </div>
        )}
      </Dialog>

      <Dialog open={!!recipeFor} onClose={() => setRecipeFor(null)} title={`สูตร · ${data.products.find((p) => p.id === recipeFor)?.name ?? ''}`} sheet>
        <div className="flex flex-col gap-3">
          {recipeRows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select value={row.ingredientId} onChange={(e) => setRecipeRows((rs) => rs.map((r, i) => i === idx ? { ...r, ingredientId: e.target.value } : r))}
                className="min-w-0 flex-1 rounded-[12px] border border-oat bg-white px-2 py-2 text-sm">
                <option value="">เลือกวัตถุดิบ</option>
                {data.ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
              </select>
              <input type="number" min={0} step={0.1} value={row.qty} onChange={(e) => setRecipeRows((rs) => rs.map((r, i) => i === idx ? { ...r, qty: Number(e.target.value) } : r))}
                className="w-24 rounded-[12px] border border-oat bg-white px-2 py-2 text-sm" aria-label="ปริมาณ" />
              <Button size="sm" variant="ghost" aria-label="ลบแถว" onClick={() => setRecipeRows((rs) => rs.filter((_, i) => i !== idx))}>✕</Button>
            </div>
          ))}
          <Button variant="secondary" onClick={() => setRecipeRows((rs) => [...rs, { ingredientId: data.ingredients[0]?.id ?? '', qty: 1 }])}>+ เพิ่มวัตถุดิบ</Button>
          <Button size="lg" disabled={!!action.busy} onClick={saveRecipe}>บันทึกสูตร</Button>
        </div>
      </Dialog>
    </div>
  );
}
