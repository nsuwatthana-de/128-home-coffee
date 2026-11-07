import type { ReactNode } from 'react';
import { cx } from '../lib/format';

export type Tone = 'neutral' | 'terracotta' | 'matcha' | 'oat' | 'coffee' | 'muted';

const tones: Record<Tone, string> = {
  neutral: 'bg-ivory-deep text-coffee',
  terracotta: 'bg-terracotta-soft text-terracotta-ink',
  matcha: 'bg-matcha-soft text-matcha-dark',
  oat: 'bg-oat-soft text-coffee',
  coffee: 'bg-coffee text-ivory',
  muted: 'bg-ivory-deep text-coffee-mute',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone], className)}>
      {children}
    </span>
  );
}
