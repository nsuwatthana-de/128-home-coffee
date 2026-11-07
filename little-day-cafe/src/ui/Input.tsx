import type { InputHTMLAttributes } from 'react';
import { cx } from '../lib/format';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export function Input({ label, hint, className, id, ...rest }: Props) {
  const inputId = id ?? `in-${label}`;
  return (
    <label htmlFor={inputId} className={cx('flex flex-col gap-1.5 text-sm', className)}>
      <span className="font-medium">{label}</span>
      <input
        id={inputId}
        className="rounded-[12px] border border-oat bg-white px-3 py-2.5 text-[15px] outline-none transition-colors duration-150 focus-visible:border-matcha focus-visible:ring-2 focus-visible:ring-matcha/30"
        {...rest}
      />
      {hint && <span className="text-xs text-coffee-mute">{hint}</span>}
    </label>
  );
}
