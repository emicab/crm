import React from "react";
import { Ticket, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";

interface SaleTotalsPanelProps {
  items: any[];
  totals: {
    subtotal: number;
    discountCodeDiscount: number;
    paymentMethodDiscount: number;
    finalTotal: number;
  };
  comboDiscount: number;
  appliedPromotion: any;
  validDiscountCode: { code: string; percent: number } | null;
  isLoading: boolean;
}

export const SaleTotalsPanel: React.FC<SaleTotalsPanelProps> = ({
  items,
  totals,
  comboDiscount,
  appliedPromotion,
  validDiscountCode,
  isLoading,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 text-slate-100 p-5 rounded-2xl shadow-xl space-y-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 h-16 w-16 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

      <h2 className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase pb-2 border-b border-slate-800 flex items-center justify-between">
        <span>Pantalla de Cobro</span>
        {items.length > 0 && (
          <span className="text-primary animate-pulse font-mono font-bold">
            ● VENTA ACTIVA
          </span>
        )}
      </h2>

      <div className="space-y-2 text-xs font-medium text-slate-300">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-mono">
            {formatCurrency(totals.subtotal)}
          </span>
        </div>

        {comboDiscount > 0 && (
          <div className="flex justify-between text-amber-400">
            <span>Descuento de Combo</span>
            <span className="font-mono">
              -{formatCurrency(comboDiscount)}
            </span>
          </div>
        )}

        {appliedPromotion && (
          <div
            className="flex justify-between text-primary font-semibold"
            title={appliedPromotion.name}
          >
            <span className="truncate max-w-[150px]">
              Promoción: {appliedPromotion.name}
            </span>
            <span className="font-mono">
              -{formatCurrency(appliedPromotion.discountAmount)}
            </span>
          </div>
        )}

        {validDiscountCode && (
          <div className="flex justify-between text-indigo-400 font-semibold">
            <span>
              Código de Descuento ({validDiscountCode.percent}%)
            </span>
            <span className="font-mono">
              -{formatCurrency(totals.discountCodeDiscount)}
            </span>
          </div>
        )}

        {totals.paymentMethodDiscount > 0 && (
          <div className="flex justify-between text-primary font-semibold">
            <span>Descuento por Forma de Pago</span>
            <span className="font-mono">
              -{formatCurrency(totals.paymentMethodDiscount)}
            </span>
          </div>
        )}
      </div>

      {/* Gran Total a Cobrar */}
      <div className="pt-3 border-t border-slate-800 flex flex-col gap-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase">
          Total a Cobrar
        </span>
        <span className="text-4xl font-extrabold font-mono text-primary tracking-tight text-right drop-shadow-[0_0_10px_rgba(96,165,250,0.3)]">
          {formatCurrency(totals.finalTotal)}
        </span>
      </div>

      {/* Gran Botón de Ejecutar Cobro (F2) */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading || items.length === 0}
          className="w-full py-3.5 px-4 bg-primary hover:bg-primary-dark disabled:bg-slate-800 disabled:text-slate-500 text-primary-foreground font-extrabold rounded-xl transition-all shadow-lg active:scale-[0.98] shadow-primary/10 cursor-pointer flex items-center justify-center gap-2 text-sm uppercase tracking-wide border-0"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Registrando...
            </>
          ) : (
            <>
              <Ticket size={16} /> F2 - Registrar Venta
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SaleTotalsPanel;
