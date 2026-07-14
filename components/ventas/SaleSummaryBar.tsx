"use client";

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import type { SaleItemInCart } from "@/types";

interface SaleSummaryBarProps {
  items: SaleItemInCart[];
  comboDiscount: number;
  appliedPromotion: { name: string; discountLabel: string } | null;
  validDiscountCode: { code: string; percent: number } | null;
  discountCodeDiscount: number;
  paymentMethodDiscount: number;
  finalTotal: number;
  onOpenCart: () => void;
}

const SaleSummaryBar: React.FC<SaleSummaryBarProps> = ({
  items,
  comboDiscount,
  appliedPromotion,
  validDiscountCode,
  discountCodeDiscount,
  paymentMethodDiscount,
  finalTotal,
  onOpenCart,
}) => {
  return (
    <AnimatePresence>
      {items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-[20px] left-4 md:left-[272px] right-4 z-50 bg-background/95 backdrop-blur-sm border border-border shadow-2xl rounded-2xl transition-all duration-300 cursor-pointer"
          onClick={onOpenCart}
        >
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 text-sm text-foreground-muted">
              <ShoppingCart size={18} className="text-primary" />
              <span className="font-semibold">{items.length} {items.length === 1 ? 'producto' : 'productos'}</span>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
              <div className="text-center md:text-right">
                {comboDiscount > 0 && (
                  <p className="text-xs text-amber-600 font-medium">Desc. combo: -{formatCurrency(comboDiscount)}</p>
                )}
                {appliedPromotion && (
                  <p className="text-xs text-success font-medium">{appliedPromotion.name}: -{appliedPromotion.discountLabel}</p>
                )}
                {discountCodeDiscount > 0 && validDiscountCode && (
                  <p className="text-xs text-purple-600 font-medium">Desc. cupón ({validDiscountCode.code}): -{formatCurrency(discountCodeDiscount)}</p>
                )}
                {paymentMethodDiscount > 0 && (
                  <p className="text-xs text-blue-600 font-medium">Desc. pago: -{formatCurrency(paymentMethodDiscount)}</p>
                )}
                <p className="text-2xl font-bold text-foreground mt-1">
                  TOTAL: {formatCurrency(finalTotal)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SaleSummaryBar;
