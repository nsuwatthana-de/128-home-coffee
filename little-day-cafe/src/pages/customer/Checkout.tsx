import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Segmented } from '../../ui';
import { baht, cx } from '../../lib/format';
import { repo } from '../../data';
import { useCart } from '../../cart/CartProvider';
import { useTable } from '../../table/TableProvider';
import { ValidationError } from '../../domain/pricing';
import type { Channel, PaymentMethod, ShopSettings } from '../../types';

export const LAST_ORDER_KEY = 'ldc-last-order';

export function Checkout() {
  const navigate = useNavigate();
  const cart = useCart();
  const table = useTable();
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [channel, setChannel] = useState<Channel>(table.status === 'ok' ? 'dine_in' : 'takeaway');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { repo.getSettings().then(setSettings).catch(() => setSettings(null)); }, []);
  useEffect(() => { if (table.status !== 'ok' && channel === 'dine_in') setChannel('takeaway'); }, [table.status, channel]);

  const promptpayReady = Boolean(settings?.promptpayId);
  const channelOptions: { value: Channel; label: string }[] = [
    ...(table.status === 'ok' ? [{ value: 'dine_in' as const, label: `ทานที่ร้าน (โต๊ะ ${table.code})` }] : []),
    { value: 'takeaway', label: 'กลับบ้าน' },
  ];
  const payOptions: { value: PaymentMethod; label: string }[] = [
    { value: 'cash', label: 'เงินสด (จ่ายที่เคาน์เตอร์)' },
    { value: 'promptpay', label: 'PromptPay' },
  ];

  if (cart.items.length === 0) {
    return <p className="pt-6 text-coffee-mute">ตะกร้าว่างอยู่ เลือกเมนูก่อนนะคะ</p>;
  }

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const order = await repo.createOrder({
        channel,
        tableToken: channel === 'dine_in' ? table.token ?? undefined : undefined,
        customer: name.trim() || undefined,
        note: note.trim() || undefined,
        method,
        items: cart.items.map((i) => ({ productId: i.productId, qty: i.qty, selections: i.selections, note: i.note || undefined })),
      });
      try { localStorage.setItem(LAST_ORDER_KEY, order.id); } catch { /* ignore */ }
      cart.clear();
      navigate(`/order/${order.id}`, { replace: true });
    } catch (e) {
      setError(e instanceof ValidationError || e instanceof Error ? e.message : 'ส่งออเดอร์ไม่สำเร็จ');
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 pt-2">
      <h1 className="text-xl font-bold">ชำระเงิน</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">รูปแบบการรับ</h2>
        <Segmented options={channelOptions} value={channel} onChange={setChannel} label="รูปแบบการรับ" />
      </section>

      <Card className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">ชื่อ <span className="text-coffee-mute">(ไม่บังคับ)</span></span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40}
            className="rounded-[12px] border border-oat bg-ivory px-3 py-2.5 outline-none focus-visible:border-matcha focus-visible:ring-2 focus-visible:ring-matcha/30" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">หมายเหตุออเดอร์ <span className="text-coffee-mute">(ไม่บังคับ)</span></span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={200}
            className="rounded-[12px] border border-oat bg-ivory px-3 py-2.5 outline-none focus-visible:border-matcha focus-visible:ring-2 focus-visible:ring-matcha/30" />
        </label>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">วิธีชำระเงิน</h2>
        <div role="radiogroup" aria-label="วิธีชำระเงิน" className="grid gap-2">
          {payOptions.map((o) => {
            const disabled = o.value === 'promptpay' && !promptpayReady;
            return (
              <button key={o.value} role="radio" aria-checked={method === o.value} disabled={disabled}
                onClick={() => setMethod(o.value)}
                className={cx('flex items-center justify-between rounded-[14px] border px-4 py-3 text-left transition-colors duration-150 disabled:opacity-50',
                  method === o.value ? 'border-matcha-dark bg-matcha-soft' : 'border-oat bg-white hover:bg-oat-soft')}>
                <span className="font-medium">{o.label}{disabled && <span className="ml-2 text-xs text-coffee-mute">(ร้านยังไม่ตั้งค่า)</span>}</span>
                <span aria-hidden="true" className={cx('size-4 rounded-full border-2', method === o.value ? 'border-matcha-dark bg-matcha-dark' : 'border-oat')} />
              </button>
            );
          })}
        </div>
        {method === 'promptpay' && <p className="text-sm text-coffee-mute">ระบบจะแสดง QR ตามยอด และพนักงานจะยืนยันหลังตรวจยอดเข้าบัญชีจริง</p>}
      </section>

      <Card className="flex items-center justify-between">
        <span className="text-coffee-mute">ยอดชำระโดยประมาณ</span>
        <span className="text-xl font-bold">{baht(cart.total)}</span>
      </Card>
      <p className="text-xs text-coffee-mute">ยอดสุดท้ายคำนวณจากราคาในระบบอีกครั้งเมื่อส่งออเดอร์</p>

      {error && <p role="alert" className="text-sm text-terracotta-ink">{error}</p>}
      <Button size="lg" disabled={busy} onClick={submit}>{busy ? 'กำลังส่งออเดอร์…' : 'ยืนยันออเดอร์'}</Button>
    </div>
  );
}
