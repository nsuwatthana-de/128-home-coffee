import { Link } from 'react-router-dom';
import { Badge } from '../ui';
import { baht, cx } from '../lib/format';
import type { Product } from '../types';

export function ProductCard({ product }: { product: Product }) {
  const body = (
    <>
      <div
        aria-hidden="true"
        className={cx('flex aspect-[4/3] items-center justify-center rounded-[12px] bg-oat-soft text-5xl',
          !product.available && 'opacity-50')}
      >
        {product.emoji}
      </div>
      <div className="mt-3 flex flex-1 flex-col gap-1">
        <h3 className="font-semibold leading-snug">{product.name}</h3>
        <p className="line-clamp-2 text-sm text-coffee-mute">{product.description}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-semibold">{baht(product.price)}</span>
          {product.available ? (
            <Badge tone="matcha">พร้อมขาย</Badge>
          ) : (
            <Badge tone="muted">หมดชั่วคราว</Badge>
          )}
        </div>
      </div>
    </>
  );

  if (!product.available) {
    return <div aria-disabled="true" className="flex flex-col rounded-[16px] bg-white p-3 shadow-soft">{body}</div>;
  }
  return (
    <Link
      to={`/product/${product.id}`}
      className="flex flex-col rounded-[16px] bg-white p-3 shadow-soft transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-matcha"
    >
      {body}
    </Link>
  );
}
