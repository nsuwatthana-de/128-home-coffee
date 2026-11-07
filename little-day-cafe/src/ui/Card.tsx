import type { HTMLAttributes } from 'react';
import { cx } from '../lib/format';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-[16px] bg-white p-4 shadow-soft', className)} {...rest} />;
}
