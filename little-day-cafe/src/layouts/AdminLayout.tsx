import { NavLink, Outlet } from 'react-router-dom';
import { cx } from '../lib/format';

const items = [
  { to: '/admin', label: 'ภาพรวม', end: true },
  { to: '/admin/orders', label: 'ออเดอร์' },
  { to: '/admin/products', label: 'สินค้า' },
  { to: '/admin/tables', label: 'โต๊ะและ QR' },
  { to: '/admin/inventory', label: 'วัตถุดิบ' },
  { to: '/admin/promotions', label: 'โปรโมชัน' },
  { to: '/admin/reports', label: 'รายงาน' },
  { to: '/admin/settings', label: 'ตั้งค่า' },
];

export function AdminLayout() {
  return (
    <div className="flex min-h-dvh bg-ivory">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-oat-soft bg-white p-4 lg:flex">
        <div className="mb-6 px-2">
          <p className="text-[11px] tracking-[0.2em] text-coffee-mute">LITTLE DAY</p>
          <p className="font-semibold">Admin</p>
        </div>
        {items.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.end}
            className={({ isActive }) =>
              cx('rounded-[12px] px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                isActive ? 'bg-matcha-soft text-matcha-dark' : 'text-coffee hover:bg-ivory-deep')
            }
          >
            {i.label}
          </NavLink>
        ))}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-oat-soft bg-white/80 px-4 py-3 md:px-6">
          <nav aria-label="เมนูผู้ดูแล" className="flex gap-1 overflow-x-auto [scrollbar-width:none] lg:hidden">
            {items.map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                end={i.end}
                className={({ isActive }) =>
                  cx('shrink-0 rounded-full px-3 py-1.5 text-sm font-medium',
                    isActive ? 'bg-matcha-dark text-white' : 'text-coffee hover:bg-oat-soft')
                }
              >
                {i.label}
              </NavLink>
            ))}
          </nav>
          <p className="hidden text-sm text-coffee-mute lg:block">วันนี้ · Asia/Bangkok</p>
          <span className="shrink-0 rounded-full bg-matcha-soft px-3 py-1 text-xs font-medium text-matcha-dark">ออนไลน์</span>
        </header>
        <main className="mx-auto w-full max-w-[1120px] flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
