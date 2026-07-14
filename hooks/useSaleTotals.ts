import { useMemo } from 'react';

interface CartItem {
  quantity: number;
  priceAtSale: number;
  subtotal: number;
}

interface TotalsInput {
  items: CartItem[];
  comboDiscounts: Record<number, number>;
  appliedPromotion: { discountAmount: number } | null;
  validDiscountCode: { percent: number } | null;
  paymentType: string;
  config: Record<string, string>;
  discountCode: string;
}

export interface SaleTotals {
  subtotal: number;
  comboDiscount: number;
  totalAfterCombo: number;
  promoDiscountAmount: number;
  totalAfterPromo: number;
  discountCodePercent: number;
  discountCodeDiscount: number;
  totalAfterCoupon: number;
  paymentMethodDiscountPct: number;
  paymentMethodDiscount: number;
  finalTotal: number;
}

export function useSaleTotals(input: TotalsInput): SaleTotals {
  return useMemo(() => {
    const subtotal = input.items.reduce((sum, item) => sum + item.subtotal, 0);
    const comboDiscount = Object.values(input.comboDiscounts).reduce((sum, d) => sum + d, 0);
    const totalAfterCombo = Math.max(0, subtotal - comboDiscount);
    const promoDiscountAmount = input.appliedPromotion ? input.appliedPromotion.discountAmount : 0;
    const totalAfterPromo = Math.max(0, totalAfterCombo - promoDiscountAmount);
    const discountCodePercent = input.validDiscountCode ? input.validDiscountCode.percent : 0;
    const discountCodeDiscount = totalAfterPromo * (discountCodePercent / 100);
    const totalAfterCoupon = Math.max(0, totalAfterPromo - discountCodeDiscount);
    const paymentMethodDiscountPct = input.paymentType
      ? parseFloat(input.config[`discount_${input.paymentType}`] || '0')
      : 0;
    const paymentMethodDiscount = totalAfterCoupon * (paymentMethodDiscountPct / 100);
    const finalTotal = Math.max(0, totalAfterCoupon - paymentMethodDiscount);

    return {
      subtotal,
      comboDiscount,
      totalAfterCombo,
      promoDiscountAmount,
      totalAfterPromo,
      discountCodePercent,
      discountCodeDiscount,
      totalAfterCoupon,
      paymentMethodDiscountPct,
      paymentMethodDiscount,
      finalTotal,
    };
  }, [
    input.items,
    input.comboDiscounts,
    input.appliedPromotion,
    input.validDiscountCode,
    input.paymentType,
    input.config,
    input.discountCode,
  ]);
}
