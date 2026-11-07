import { Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '../ui';
import { useAuth } from '../auth/AuthProvider';

const SOUND_KEY = 'ldc-kitchen-sound';

export function KitchenLayout() {
  const [sound, setSound] = useState(() => {
    try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; }
  });
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const toggle = () => {
    setSound((s) => {
      try { localStorage.setItem(SOUND_KEY, s ? 'off' : 'on'); } catch { /* ignore */ }
      return !s;
    });
  };
  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <header className="flex items-center justify-between border-b border-oat-soft bg-white px-4 py-3 md:px-6">
        <div>
          <p className="text-[11px] tracking-[0.2em] text-coffee-mute">128 HOME COFFEE</p>
          <p className="font-semibold">จอครัว</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" aria-pressed={sound} onClick={toggle}>
            {sound ? '🔔 เสียงเปิด' : '🔕 เสียงปิด'}
          </Button>
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate('/login'); }}>ออก</Button>
        </div>
      </header>
      <main className="flex-1 p-3 md:p-5">
        <Outlet context={{ sound }} />
      </main>
    </div>
  );
}
