import { useCallback } from 'react';

const SALE_CART_KEY = 'sale_cart';

export interface SaleCartSnapshot {
  items: any[];
  clientId: string;
  sellerId: string;
  paymentType: string;
  notes: string;
  discountCode: string;
  comboDiscounts: Record<number, number>;
  appliedPromotion: any;
}

export function saveCart(snapshot: SaleCartSnapshot): void {
  try { localStorage.setItem(SALE_CART_KEY, JSON.stringify(snapshot)); } catch {}
}

export function loadCart(): SaleCartSnapshot | null {
  try {
    const raw = localStorage.getItem(SALE_CART_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearCart(): void {
  try { localStorage.removeItem(SALE_CART_KEY); } catch {}
}

export function useClearCart(): () => void {
  return useCallback(() => {
    try { localStorage.removeItem(SALE_CART_KEY); } catch {}
  }, []);
}
