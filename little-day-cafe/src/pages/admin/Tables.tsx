import { useState } from 'react';
import { Badge, Button, Card } from '../../ui';
import { tables as seed } from '../../mock/data';
import type { Table } from '../../types';

// QR จริงจะสร้างจาก token ที่ผูกกับโต๊ะใน Phase 4 ตอนนี้แสดงเป็นกรอบตัวอย่าง
export function Tables() {
  const [items, setItems] = useState<Table[]>(seed);
  const toggle = (id: string) => setItems((xs) => xs.map((t) => (t.id === id ? { ...t, active: !t.active } : t)));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">โต๊ะและ QR Code</h1>
        <p className="text-sm text-coffee-mute">เปิด/ปิดโต๊ะ และพิมพ์ QR ให้แต่ละโต๊ะ</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {items.map((t) => (
          <Card key={t.id} className="flex flex-col items-center gap-3 text-center">
            <div aria-hidden="true" className="grid size-28 grid-cols-5 gap-1 rounded-[12px] bg-ivory-deep p-2">
              {Array.from({ length: 25 }, (_, i) => (
                <span key={i} className={i % 3 === 0 || i % 4 === 1 ? 'rounded-[2px] bg-coffee' : 'rounded-[2px] bg-white'} />
              ))}
            </div>
            <div>
              <p className="text-lg font-semibold">โต๊ะ {t.code}</p>
              {t.active ? <Badge tone="matcha">เปิดใช้งาน</Badge> : <Badge tone="muted">ปิดใช้งาน</Badge>}
            </div>
            <Button variant="secondary" size="sm" className="w-full" aria-pressed={t.active} onClick={() => toggle(t.id)}>
              {t.active ? 'ปิดโต๊ะ' : 'เปิดโต๊ะ'}
            </Button>
            <Button variant="ghost" size="sm" className="w-full" disabled title="จะเปิดใช้ในเฟส 4">ดาวน์โหลด QR</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
