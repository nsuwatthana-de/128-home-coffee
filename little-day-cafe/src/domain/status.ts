import type { OrderStatus } from '../types';

// ลำดับสถานะหลัก: new → accepted → preparing → ready → completed
const forward: Partial<Record<OrderStatus, OrderStatus>> = {
  new: 'accepted',
  accepted: 'preparing',
  preparing: 'ready',
  ready: 'completed',
};

export const nextStatus = (s: OrderStatus): OrderStatus | undefined => forward[s];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (to === 'cancelled') return from !== 'completed' && from !== 'cancelled';
  return forward[from] === to;
}

export const isOpen = (s: OrderStatus) => s !== 'completed' && s !== 'cancelled';
