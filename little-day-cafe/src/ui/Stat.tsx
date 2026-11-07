import type { ReactNode } from 'react';
import { Card } from './Card';

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-sm text-coffee-mute">{label}</span>
      <span className="text-2xl font-bold tracking-tight md:text-[28px]">{value}</span>
      {hint && <span className="text-xs text-coffee-mute">{hint}</span>}
    </Card>
  );
}
