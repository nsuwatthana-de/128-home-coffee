import { NavLink, Outlet, useSearchParams } from 'react-router-dom';
import { cx } from '../lib/format';
import { tables } from '../mock/data';

const navItems = [
  { to: '/', label: 'หน้าหลัก', end: true },
  { to: '/menu', label: 'เมนู' },
  { to: '/cart', label: 'ตะกร้า' },
  { to: '/order/o2', label: 'ออเดอร์' },
];

export function CustomerLayout() {
  // Phase 1: แสดงโต๊ะจากพารามิเตอร์เพื่อดูหน้าจอ
  // Phase 4 จะเปลี่ยนเป็นการยืนยันด้วย token ที่ฝั่ง server ไม่ใช้เลขโต๊ะจาก URL
  const [params] = useSearchParams();
  const tableCode = params.get('table') ?? tables[0]?.code;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col bg-ivory md:max-w-[880px]">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-ivory/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+14px)] backdrop-blur">
        <div>
          <p className="text-[11px] tracking-[0.2em] text-coffee-mute">LITTLE DAY</p>
          <p className="text-lg font-semibold leading-tight">CAFE</p>
        </div>
        {tableCode && (
          <span className="rounded-full bg-white px-3 py-1 text-sm font-medium shadow-soft">โต๊ะ {tableCode}</span>
        )}
      </header>

      <main className="flex-1 px-4 pb-28">
        <Outlet />
      </main>

      <nav
        aria-label="เมนูหลัก"
        className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-[560px] items-stretch justify-around border-t border-oat-soft bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+6px)] pt-2 backdrop-blur md:max-w-[880px]"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cx(
                'flex min-w-[64px] flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors duration-150',
                isActive ? 'text-matcha-dark' : 'text-coffee-mute hover:text-coffee',
              )
            }
          >
            {item.label}
            {item.to === '/cart' && (
              <span className="rounded-full bg-terracotta-ink px-1.5 text-[10px] leading-4 text-white">2</span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
