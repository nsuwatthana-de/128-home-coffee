import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Button, Card } from '../ui';
import { isRemote } from '../data';
import { useAuth } from './AuthProvider';
import type { Role } from '../types';

const demoRoles: { role: Role; label: string; hint: string }[] = [
  { role: 'owner', label: 'เจ้าของร้าน', hint: 'ทุกหน้า' },
  { role: 'staff', label: 'พนักงาน', hint: 'ออเดอร์ POS สินค้า โต๊ะ' },
  { role: 'kitchen', label: 'ครัว', hint: 'จอครัวเท่านั้น' },
];

export function LoginPage() {
  const { session, signInDemo, signInPassword } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/admin';
  if (session) return <Navigate to={session.role === 'kitchen' ? '/kitchen' : from} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try { await signInPassword(email.trim(), password); } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 p-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] text-coffee-mute">128 HOME COFFEE</p>
        <h1 className="text-2xl font-bold">เข้าสู่ระบบพนักงาน</h1>
      </div>

      {isRemote ? (
        <Card>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium">อีเมล</span>
              <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)}
                className="rounded-[12px] border border-oat bg-ivory px-3 py-2.5 outline-none focus-visible:border-matcha focus-visible:ring-2 focus-visible:ring-matcha/30" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium">รหัสผ่าน</span>
              <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="rounded-[12px] border border-oat bg-ivory px-3 py-2.5 outline-none focus-visible:border-matcha focus-visible:ring-2 focus-visible:ring-matcha/30" />
            </label>
            {error && <p role="alert" className="text-sm text-terracotta-ink">{error}</p>}
            <Button size="lg" type="submit" disabled={busy}>{busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</Button>
          </form>
        </Card>
      ) : (
        <Card className="flex flex-col gap-3">
          <p className="rounded-[12px] bg-terracotta-soft px-3 py-2 text-sm text-terracotta-ink">
            โหมดทดลอง: ไม่มีการตรวจรหัสผ่าน และข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น ใช้งานจริงต้องตั้งค่า Supabase
          </p>
          {demoRoles.map((d) => (
            <Button key={d.role} variant="secondary" size="lg" onClick={() => signInDemo(d.role)} className="justify-between">
              <span>{d.label}</span><span className="text-xs text-coffee-mute">{d.hint}</span>
            </Button>
          ))}
        </Card>
      )}
    </div>
  );
}
