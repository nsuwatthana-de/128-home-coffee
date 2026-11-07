import { cx } from '../lib/format';

// โลโก้ร้าน 128 Home Coffee (ไฟล์อยู่ใน public/logo.webp)
export function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo.webp`}
      alt="128 Home Coffee"
      className={cx('h-12 w-auto select-none', className)}
      draggable={false}
    />
  );
}
