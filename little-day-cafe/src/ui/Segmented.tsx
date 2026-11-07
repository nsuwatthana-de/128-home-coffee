import { cx } from '../lib/format';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

// แถบแท็บแบบ segmented ใช้เลือกหมวด/ช่วงเวลา เลื่อนแนวนอนได้บนมือถือ
export function Segmented<T extends string>({ options, value, onChange, label, className }: Props<T>) {
  return (
    <div role="tablist" aria-label={label} className={cx('flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-matcha',
              active ? 'border-matcha-dark bg-matcha-dark text-white' : 'border-oat bg-white text-coffee hover:bg-oat-soft',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
