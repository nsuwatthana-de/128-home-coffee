import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { cx } from '../lib/format';
import { BrandLogo } from '../components/BrandLogo';
import { DeveloperCredit } from '../components/DeveloperCredit';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../ui';
import type { Role } from '../types';

interface Item { to: string; label: string; end?: boolean; roles: Role[] }

const items: Item[] = [
  { to: '/admin', label: 'ภาพรวม', end: true, roles: ['owner', 'staff'] },
  { to: '/admin/pos', label: 'ขายหน้าร้าน', roles: ['owner', 'staff'] },
  { to: '/admin/orders', label: 'ออเดอร์', roles: ['owner', 'staff'] },
  { to: '/admin/products', label: 'สินค้า', roles: ['owner', 'staff'] },
  { to: '/admin/tables', label: 'โต๊ะและ QR', roles: ['owner', 'staff'] },
  { to: '/admin/inventory', label: 'วัตถุดิบ', roles: ['owner'] },
  { to: '/admin/promotions', label: 'โปรโมชัน', roles: ['owner'] },
  { to: '/admin/reports', label: 'รายงาน', roles: ['owner'] },
  { to: '/admin/settings', label: 'ตั้งค่า', roles: ['owner'] },
];

export function AdminLayout() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const visible = items.filter((i) => session && i.roles.includes(session.role));
  const roleLabel = session?.role === 'owner' ? 'เจ้าของ' : 'พนักงาน';

  return (
    <div className="flex min-h-dvh bg-ivory">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-oat-soft bg-white p-4 lg:flex">
        <div className="mb-6 px-2">
          <BrandLogo className="h-14" />
          <p className="mt-2 text-sm font-semibold text-coffee-mute">หลังร้าน</p>
        </div>
        {visible.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end}
            className={({ isActive }) => cx('rounded-[12px] px-3 py-2.5 text-sm font-medium transition-colors duration-150',
              isActive ? 'bg-matcha-soft text-matcha-dark' : 'text-coffee hover:bg-ivory-deep')}>
            {i.label}
          </NavLink>
        ))}
        <div className="mt-auto flex flex-col gap-2 px-2 text-xs text-coffee-mute">
          <span>{roleLabel}{session?.email ? ` · ${session.email}` : ''}</span>
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate('/login'); }}>ออกจากระบบ</Button>
          <DeveloperCredit className="mt-2 text-left" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-oat-soft bg-white/80 px-4 py-3 md:px-6">
          <nav aria-label="เมนูหลังร้าน" className="flex gap-1 overflow-x-auto [scrollbar-width:none] lg:hidden">
            {visible.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.end}
                className={({ isActive }) => cx('shrink-0 rounded-full px-3 py-1.5 text-sm font-medium',
                  isActive ? 'bg-matcha-dark text-white' : 'text-coffee hover:bg-oat-soft')}>
                {i.label}
              </NavLink>
            ))}
          </nav>
          <p className="hidden text-sm text-coffee-mute lg:block">{roleLabel}</p>
          <Button variant="ghost" size="sm" className="shrink-0 lg:hidden" onClick={async () => { await signOut(); navigate('/login'); }}>ออก</Button>
        </header>
        <main className="mx-auto w-full max-w-[1120px] flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
