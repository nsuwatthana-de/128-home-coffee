import { NavLink, Outlet, useSearchParams } from 'react-router-dom';
import { cx, baht } from '../lib/format';
import { TableProvider, useTable } from '../table/TableProvider';
import { useCart } from '../cart/CartProvider';

const navItems = [
  { to: '/', label: 'หน้าหลัก', end: true },
  { to: '/menu', label: 'เมนู' },
  { to: '/cart', label: 'ตะกร้า', cart: true },
  { to: '/order', label: 'ออเดอร์' },
];

function TableBadge() {
  const { status, code } = useTable();
  if (status === 'none') return <span className="rounded-full bg-white px-3 py-1 text-sm shadow-soft">สั่งกลับบ้าน</span>;
  if (status === 'checking') return <span className="rounded-full bg-white px-3 py-1 text-sm text-coffee-mute shadow-soft">กำลังตรวจโต๊ะ…</span>;
  if (status === 'invalid') return <span className="rounded-full bg-terracotta-soft px-3 py-1 text-sm font-medium text-terracotta-ink">QR ใช้ไม่ได้</span>;
  return <span className="rounded-full bg-white px-3 py-1 text-sm font-medium shadow-soft">โต๊ะ {code}</span>;
}

function Shell() {
  const { count, total } = useCart();
  const { status } = useTable();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col bg-ivory md:max-w-[880px]">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-ivory/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+14px)] backdrop-blur">
        <div>
          <p className="text-[11px] tracking-[0.2em] text-coffee-mute">128 HOME COFFEE</p>
          <p className="text-lg font-semibold leading-tight">CAFE</p>
        </div>
        <TableBadge />
      </header>

      {status === 'invalid' && (
        <p role="alert" className="mx-4 mb-2 rounded-[12px] bg-terracotta-soft px-3 py-2 text-sm text-terracotta-ink">
          QR นี้ใช้ไม่ได้แล้ว อาจถูกเปลี่ยนหรือโต๊ะปิดใช้งาน กรุณาแจ้งพนักงาน (สั่งกลับบ้านได้ตามปกติ)
        </p>
      )}

      <main className="flex-1 px-4 pb-28">
        <Outlet />
      </main>

      {count > 0 && (
        <NavLink to="/cart" className="fixed inset-x-0 bottom-[68px] z-10 mx-auto flex max-w-[528px] items-center justify-between rounded-[14px] bg-matcha-dark px-4 py-3 text-sm font-medium text-white shadow-soft md:max-w-[848px]">
          <span>{count} รายการ</span>
          <span>ดูตะกร้า · {baht(total)}</span>
        </NavLink>
      )}

      <nav
        aria-label="เมนูหลัก"
        className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-[560px] items-stretch justify-around border-t border-oat-soft bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+6px)] pt-2 backdrop-blur md:max-w-[880px]"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => cx(
              'flex min-w-[64px] flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors duration-150',
              isActive ? 'text-matcha-dark' : 'text-coffee-mute hover:text-coffee',
            )}
          >
            {item.label}
            {item.cart && count > 0 && (
              <span className="rounded-full bg-terracotta-ink px-1.5 text-[10px] leading-4 text-white">{count}</span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function CustomerLayout() {
  const [params] = useSearchParams();
  return (
    <TableProvider incoming={params.get('t')}>
      <Shell />
    </TableProvider>
  );
}
