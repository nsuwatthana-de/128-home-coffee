import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SelectionInput } from '../domain/pricing';

export interface CartItem {
  key: string;
  productId: string;
  name: string;
  emoji: string;
  qty: number;
  selections: SelectionInput[];
  labels: string[];
  unitPrice: number; // เพื่อแสดงผลเท่านั้น ฝั่งเซิร์ฟเวอร์คำนวณราคาใหม่ทุกครั้ง
  note: string;
}

interface CartApi {
  items: CartItem[];
  count: number;
  total: number;
  add: (item: Omit<CartItem, 'key' | 'qty'>, qty: number) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
}

const KEY = 'ldc-cart';
const CartCtx = createContext<CartApi | null>(null);

const readCart = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch { return []; }
};

const keyOf = (productId: string, selections: SelectionInput[], note: string) =>
  JSON.stringify([productId, [...selections].sort((a, b) => a.groupId.localeCompare(b.groupId))
    .map((s) => [s.groupId, [...s.valueIds].sort()]), note]);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readCart);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ }
  }, [items]);

  const api = useMemo<CartApi>(() => ({
    items,
    count: items.reduce((s, i) => s + i.qty, 0),
    total: items.reduce((s, i) => s + i.qty * i.unitPrice, 0),
    add(item, qty) {
      const key = keyOf(item.productId, item.selections, item.note);
      setItems((prev) => {
        const found = prev.find((i) => i.key === key);
        if (found) {
          return prev.map((i) => (i.key === key ? { ...i, qty: Math.min(20, i.qty + qty) } : i));
        }
        return [...prev, { ...item, key, qty: Math.min(20, qty) }];
      });
    },
    setQty(key, qty) {
      setItems((prev) => prev.map((i) => (i.key === key ? { ...i, qty } : i)).filter((i) => i.qty > 0));
    },
    clear() { setItems([]); },
  }), [items]);

  return <CartCtx.Provider value={api}>{children}</CartCtx.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error('useCart ต้องอยู่ภายใน CartProvider');
  return ctx;
}
