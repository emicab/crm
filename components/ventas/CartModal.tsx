"use client";

import React, { useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingCart, Trash2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatCurrency } from "@/lib/formatCurrency";
import type { SaleItemInCart } from "@/types";

interface CartModalProps {
  isOpen: boolean;
  items: SaleItemInCart[];
  subtotal: number;
  comboDiscount: number;
  appliedPromotion: { name: string; discountLabel: string } | null;
  validDiscountCode: { code: string; percent: number } | null;
  discountCodeDiscount: number;
  paymentMethodDiscount: number;
  finalTotal: number;
  isLoading: boolean;
  onItemFieldChange: (tempId: number, field: 'quantity' | 'priceAtSale', value: string) => void;
  onRemoveItem: (tempId: number) => void;
  onContinue: () => void;
  onSubmit: () => void;
}

const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  items,
  subtotal,
  comboDiscount,
  appliedPromotion,
  validDiscountCode,
  discountCodeDiscount,
  paymentMethodDiscount,
  finalTotal,
  isLoading,
  onItemFieldChange,
  onRemoveItem,
  onContinue,
  onSubmit,
}) => {
  const submitRef = useRef<HTMLButtonElement>(null);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onContinue}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-muted text-foreground rounded-2xl shadow-2xl w-full max-w-4xl m-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ShoppingCart size={20} /> Carrito ({items.length} {items.length === 1 ? 'producto' : 'productos'})
              </h2>
              <Button type="button" variant="ghost" size="icon" onClick={onContinue} className="h-8 w-8">
                <X size={18} />
              </Button>
            </div>

            <div className="overflow-y-auto flex-1 p-5">
              <table className="w-full text-left border-collapse">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="p-3 text-sm font-semibold text-foreground">Producto</th>
                    <th className="p-3 text-sm font-semibold text-foreground text-center w-24">Cantidad</th>
                    <th className="p-3 text-sm font-semibold text-foreground text-right w-32">
                      {items.some(i => i.unitType === 'WEIGHT') ? 'Precio/kg' : items.some(i => i.unitType === 'VOLUME') ? 'Precio/L' : 'Precio Unit.'}
                    </th>
                    <th className="p-3 text-sm font-semibold text-foreground text-right w-32">Subtotal</th>
                    <th className="p-3 text-sm font-semibold text-foreground text-center w-16">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr key={item.tempId} className="hover:bg-muted/50 transition-colors">
                      <td className="p-3 text-sm text-foreground font-medium align-middle">
                        {item.productName}
                        <p className="text-xs text-foreground-muted">
                          Stock: {item.availableStock}{item.unitType === 'WEIGHT' ? ' kg' : item.unitType === 'VOLUME' ? ' L' : ''}
                        </p>
                      </td>
                      <td className="p-3 align-middle text-center">
                        <Input
                          type="number"
                          value={String(item.quantity)}
                          onChange={(e) => onItemFieldChange(item.tempId, 'quantity', e.target.value)}
                          min="0"
                          max={String(item.availableStock)}
                          step="any"
                          className="w-20 text-center h-9 py-1 inline-block"
                          aria-label={`Cantidad para ${item.productName}`}
                        />
                      </td>
                      <td className="p-3 align-middle text-right">
                        <Input
                          type="number"
                          value={String(item.priceAtSale)}
                          onChange={(e) => onItemFieldChange(item.tempId, 'priceAtSale', e.target.value)}
                          step="0.01"
                          min="0"
                          className="w-28 text-right h-9 py-1 inline-block"
                          aria-label={`Precio para ${item.productName}`}
                        />
                      </td>
                      <td className="p-3 text-sm text-foreground text-right align-middle font-semibold">
                        {formatCurrency(item.subtotal)}
                      </td>
                      <td className="p-3 text-center align-middle">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveItem(item.tempId)}
                          title="Eliminar item"
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 size={16} className="text-destructive hover:text-destructive/80" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-6 space-y-1 text-sm border-t border-border pt-4">
                <div className="flex justify-between text-foreground-muted">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {comboDiscount > 0 && (
                  <div className="flex justify-between text-amber-600 font-medium">
                    <span>Desc. combo</span>
                    <span>-{formatCurrency(comboDiscount)}</span>
                  </div>
                )}
                {appliedPromotion && (
                  <div className="flex justify-between text-success font-medium">
                    <span>{appliedPromotion.name}</span>
                    <span>-{appliedPromotion.discountLabel}</span>
                  </div>
                )}
                {discountCodeDiscount > 0 && validDiscountCode && (
                  <div className="flex justify-between text-purple-600 font-medium">
                    <span>Desc. cupón ({validDiscountCode.code})</span>
                    <span>-{formatCurrency(discountCodeDiscount)}</span>
                  </div>
                )}
                {paymentMethodDiscount > 0 && (
                  <div className="flex justify-between text-blue-600 font-medium">
                    <span>Desc. pago</span>
                    <span>-{formatCurrency(paymentMethodDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-foreground border-t border-border pt-2 mt-2">
                  <span>TOTAL</span>
                  <span>{formatCurrency(finalTotal)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-border shrink-0">
              <Button type="button" variant="outline" onClick={onContinue} disabled={isLoading}>
                Seguir agregando
              </Button>
              <button
                ref={submitRef}
                type="submit"
                onClick={onSubmit}
                disabled={isLoading}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 py-3 shadow-md hover:shadow-lg"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Registrando...
                  </span>
                ) : (
                  'Finalizar Venta'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CartModal;
