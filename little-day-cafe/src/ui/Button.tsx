import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../lib/format';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-matcha-dark text-white hover:bg-matcha shadow-sm',
  secondary: 'bg-white text-coffee border border-oat hover:bg-ivory-deep',
  ghost: 'bg-transparent text-coffee hover:bg-oat-soft',
  danger: 'bg-white text-terracotta-ink border border-terracotta hover:bg-terracotta-soft',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-[15px]',
  lg: 'px-5 py-3.5 text-base w-full',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = 'primary', size = 'md', className, ...rest }: Props) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-[12px] font-medium',
        'transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-matcha',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    />
  );
}
