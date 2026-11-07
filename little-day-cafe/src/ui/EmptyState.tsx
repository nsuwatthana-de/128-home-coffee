import type { ReactNode } from 'react';

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[16px] border border-dashed border-oat bg-white/60 px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-coffee-mute">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
