import { cx } from '../lib/format';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx('animate-pulse rounded-[12px] bg-oat-soft', className)} />;
}
