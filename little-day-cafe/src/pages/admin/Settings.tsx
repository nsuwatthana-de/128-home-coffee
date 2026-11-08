import { useEffect, useState } from 'react';
import { Button, Card, EmptyState, Skeleton } from '../../ui';
import { repo } from '../../data';
import { useAuth } from '../../auth/AuthProvider';
import { useAction } from '../../hooks/useAction';
import { normalizeTarget } from '../../domain/promptpay';
import type { ShopSettings } from '../../types';

export function Settings() {
  const { session } = useAuth();
  const readOnly = session?.role !== 'owner' && session?.role !== 'manager';
  const [s, setS] = useState<ShopSettings | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [localErr, setLocalErr] = useState('');
  const action = useAction();

  useEffect(() => { repo.getSettings().then(setS).catch((e: Error) => setLoadErr(e.message)); }, []);

  if (loadErr) return <EmptyState title="โหลดการตั้งค่าไม่สำเร็จ" description={loadErr} />;
  if (!s) return <Skeleton className="h-96 w-full" />;

  const field = (label: string, key: keyof ShopSettings, hint?: string) => (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <input value={s[key]} disabled={readOnly} onChange={(e) => setS({ ...s, [key]: e.target.value })}
        className="rounded-[12px] border border-oat bg-white px-3 py-2.5 disabled:bg-ivory-deep disabled:text-coffee-mute" />
      {hint && <span className="text-xs text-coffee-mute">{hint}</span>}
    </label>
  );

  const save = () => {
    if (s.promptpayId.trim()) {
      try { normalizeTarget(s.promptpayId); } catch (e) { setLocalErr(e instanceof Error ? e.message : 'PromptPay ไม่ถูกต้อง'); return; }
    }
    setLocalErr('');
    action.run('settings', async () => { await repo.saveSettings(s); return 'บันทึกการตั้งค่าแล้ว'; });
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">ตั้งค่าร้าน</h1>
        <p className="text-sm text-coffee-mute">{readOnly ? 'เฉพาะเจ้าของและผู้จัดการที่แก้ไขได้' : 'ค่าเหล่านี้ใช้ในหน้าลูกค้าและ QR ชำระเงิน'}</p>
      </div>
      <Card className="grid gap-4 md:grid-cols-2">
        {field('ชื่อร้าน', 'shopName')}
        {field('เบอร์โทร', 'phone')}
        <div className="md:col-span-2">{field('ที่อยู่', 'address')}</div>
        {field('PromptPay (เบอร์มือถือ หรือเลขผู้เสียภาษี 13 หลัก)', 'promptpayId', 'ใช้สร้าง QR ตามยอดในแต่ละออเดอร์')}
        {field('เวลาเปิด-ปิด', 'openingHours')}
        {localErr && <p role="alert" className="text-sm text-terracotta-ink md:col-span-2">{localErr}</p>}
        {action.error && <p role="alert" className="text-sm text-terracotta-ink md:col-span-2">{action.error}</p>}
        {action.notice && <p role="status" className="text-sm text-matcha-dark md:col-span-2">{action.notice}</p>}
        {!readOnly && (
          <div className="flex justify-end md:col-span-2">
            <Button disabled={!!action.busy} onClick={save}>{action.busy ? 'กำลังบันทึก…' : 'บันทึก'}</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
