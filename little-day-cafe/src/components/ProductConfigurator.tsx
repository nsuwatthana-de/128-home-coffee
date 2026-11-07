import type { Product } from '../types';
import type { SelectionInput } from '../domain/pricing';
import { cx } from '../lib/format';

interface Props {
  product: Product;
  selections: SelectionInput[];
  onChange: (next: SelectionInput[]) => void;
}

// เลือกตัวเลือกของสินค้า: single = เลือกได้หนึ่งอย่าง, multi = เลือกได้หลายอย่าง
export function ProductConfigurator({ product, selections, onChange }: Props) {
  const toggle = (groupId: string, valueId: string, type: 'single' | 'multi') => {
    const current = selections.find((s) => s.groupId === groupId)?.valueIds ?? [];
    const nextIds = type === 'single'
      ? (current.includes(valueId) ? [] : [valueId])
      : (current.includes(valueId) ? current.filter((v) => v !== valueId) : [...current, valueId]);
    const others = selections.filter((s) => s.groupId !== groupId);
    onChange([...others, { groupId, valueIds: nextIds }]);
  };

  return (
    <div className="flex flex-col gap-5">
      {product.options.map((group) => {
        const picked = selections.find((s) => s.groupId === group.id)?.valueIds ?? [];
        return (
          <fieldset key={group.id} className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold">
              {group.name}
              {group.required ? <span className="ml-1 text-terracotta-ink">*</span> : <span className="ml-1 font-normal text-coffee-mute">(ไม่บังคับ)</span>}
            </legend>
            <div className="flex flex-wrap gap-2">
              {group.values.map((v) => {
                const on = picked.includes(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(group.id, v.id, group.type)}
                    className={cx(
                      'rounded-full border px-3.5 py-2 text-sm font-medium transition-colors duration-150',
                      on ? 'border-matcha-dark bg-matcha-dark text-white' : 'border-oat bg-white hover:bg-oat-soft',
                    )}
                  >
                    {v.name}
                    {v.priceDelta > 0 && <span className="ml-1 opacity-80">+฿{v.priceDelta}</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
