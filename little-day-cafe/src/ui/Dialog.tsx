import { useEffect, type ReactNode } from 'react';
import { cx } from '../lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  // ทำให้เป็น bottom sheet บนมือถือ และกล่องกลางบนจอใหญ่
  sheet?: boolean;
}

export function Dialog({ open, onClose, title, children, sheet = false }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <button aria-label="ปิด" onClick={onClose} className="absolute inset-0 bg-coffee/40" />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'relative w-full bg-ivory shadow-soft',
          sheet ? 'max-h-[88vh] overflow-y-auto rounded-t-[20px] p-5 md:max-w-lg md:rounded-[20px]' : 'max-w-lg rounded-[20px] p-6',
        )}
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-full px-2 py-1 text-coffee-mute hover:bg-oat-soft" aria-label="ปิด">✕</button>
        </header>
        {children}
      </section>
    </div>
  );
}
