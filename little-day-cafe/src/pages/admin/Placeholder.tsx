import type { ReactNode } from 'react';
import { Card, EmptyState } from '../../ui';

// หน้าที่ยังอยู่ในแผน (วัตถุดิบ โปรโมชัน รายงาน) แสดงโครงหน้าจอไว้ก่อน
export function Placeholder({ title, phase, children }: { title: string; phase: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-coffee-mute">จะเปิดใช้งานจริงใน {phase}</p>
      </div>
      {children ?? (
        <Card><EmptyState title="ยังไม่มีข้อมูล" description={`ฟีเจอร์นี้จะเชื่อมฐานข้อมูลใน ${phase}`} /></Card>
      )}
    </div>
  );
}
