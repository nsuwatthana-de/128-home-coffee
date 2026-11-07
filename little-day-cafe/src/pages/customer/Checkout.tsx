import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Segmented } from '../../ui';
import { baht, cx } from '../../lib/format';
import type { Channel, PaymentMethod } from '../../types';

const channelOptions = [
  { value: 'dine_in' as const, label: 'ทานที่ร้าน' },
  { value: 'takeaway' as const, label: 'กลับบ้าน' },
];
const payOptions = [
  { value: 'cash' as const, label: 'เงินสด (จ่ายที่เคาน์เตอร์)' },
  { value: 'promptpay' as const, label: 'PromptPay' },
];

export function Checkout() {
  const navigate = useNavigate();
  const [channel, setChannel] = useState<Channel>('dine_in');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const total = 265; // ตัวอย่างจาก mock ใน Phase 1

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
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            className="rounded-[12px] border border-oat bg-ivory px-3 py-2.5 outline-none focus-visible:border-matcha focus-visible:ring-2 focus-visible:ring-matcha/30"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">หมายเหตุ <span className="text-coffee-mute">(ไม่บังคับ)</span></span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={200}
            className="rounded-[12px] border border-oat bg-ivory px-3 py-2.5 outline-none focus-visible:border-matcha focus-visible:ring-2 focus-visible:ring-matcha/30"
          />
        </label>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">วิธีชำระเงิน</h2>
        <div role="radiogroup" aria-label="วิธีชำระเงิน" className="grid gap-2">
          {payOptions.map((o) => (
            <button
              key={o.value}
              role="radio"
              aria-checked={method === o.value}
              onClick={() => setMethod(o.value)}
              className={cx(
                'flex items-center justify-between rounded-[14px] border px-4 py-3 text-left transition-colors duration-150',
                method === o.value ? 'border-matcha-dark bg-matcha-soft' : 'border-oat bg-white hover:bg-oat-soft',
              )}
            >
              <span className="font-medium">{o.label}</span>
              <span aria-hidden="true" className={cx('size-4 rounded-full border-2', method === o.value ? 'border-matcha-dark bg-matcha-dark' : 'border-oat')} />
            </button>
          ))}
        </div>
        {method === 'promptpay' && (
          <Card className="flex flex-col items-center gap-2 text-center">
            <div aria-hidden="true" className="flex size-40 items-center justify-center rounded-[12px] bg-ivory-deep text-xs text-coffee-mute">
              QR จะสร้างตามยอด
            </div>
            <p className="text-sm text-coffee-mute">
              ออเดอร์จะรอการยืนยันจากพนักงานหลังตรวจยอดจริง (เฟส 5)
            </p>
          </Card>
        )}
      </section>

      <Card className="flex items-center justify-between">
        <span className="text-coffee-mute">ยอดชำระ</span>
        <span className="text-xl font-bold">{baht(total)}</span>
      </Card>

      <Button size="lg" onClick={() => navigate('/order/o1')}>ยืนยันออเดอร์</Button>
    </div>
  );
}
