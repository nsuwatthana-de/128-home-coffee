import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '../ui';

// Phase 1: เสียงแจ้งเตือนเป็นสถานะบนหน้าจอเท่านั้น การเล่นเสียงจริงจะทำใน Phase 6
export function KitchenLayout() {
  const [sound, setSound] = useState(true);
  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <header className="flex items-center justify-between border-b border-oat-soft bg-white px-4 py-3 md:px-6">
        <div>
          <p className="text-[11px] tracking-[0.2em] text-coffee-mute">LITTLE DAY</p>
          <p className="font-semibold">Kitchen Display</p>
        </div>
        <Button variant="secondary" size="sm" aria-pressed={sound} onClick={() => setSound((s) => !s)}>
          {sound ? '🔔 เสียงเปิด' : '🔕 เสียงปิด'}
        </Button>
      </header>
      <main className="flex-1 p-3 md:p-5">
        <Outlet />
      </main>
    </div>
  );
}
