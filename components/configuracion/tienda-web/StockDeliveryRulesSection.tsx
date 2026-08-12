"use client";

import React from "react";
import Input from "@/components/ui/Input";
import { Smartphone } from "lucide-react";

interface StockDeliveryRulesSectionProps {
  formData: {
    minStockBuffer: number;
    deliveryFee: number;
    minDeliveryAmount: number;
    allowPickup: boolean;
    allowDelivery: boolean;
    requireMpForDelivery: boolean;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function StockDeliveryRulesSection({
  formData,
  onChange,
}: StockDeliveryRulesSectionProps) {
  return (
    <div className="bg-muted p-6 rounded-xl border border-border space-y-4">
      <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Smartphone size={18} className="text-emerald-600" /> Stock de Seguridad y Envíos
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Input
            label="Buffer de Stock de Seguridad"
            type="number"
            name="minStockBuffer"
            value={String(formData.minStockBuffer)}
            onChange={onChange}
            placeholder="1"
          />
          <p className="text-[11px] text-foreground-muted mt-1">
            Unidades reservadas para el local (por defecto 1). La tienda nunca vende la última unidad física.
          </p>
        </div>
        <Input
          label="Costo de Envío ($)"
          type="number"
          name="deliveryFee"
          value={String(formData.deliveryFee)}
          onChange={onChange}
          placeholder="0"
        />
        <Input
          label="Pedido Mínimo Envío ($)"
          type="number"
          name="minDeliveryAmount"
          value={String(formData.minDeliveryAmount)}
          onChange={onChange}
          placeholder="0"
        />
        <div className="flex flex-col justify-end space-y-2">
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              name="allowPickup"
              checked={formData.allowPickup}
              onChange={onChange}
              className="rounded border-border"
            />
            Permitir Retiro en Local
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              name="allowDelivery"
              checked={formData.allowDelivery}
              onChange={onChange}
              className="rounded border-border"
            />
            Permitir Envío a Domicilio
          </label>
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <label className="flex items-start gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            name="requireMpForDelivery"
            checked={formData.requireMpForDelivery}
            onChange={onChange}
            className="mt-0.5 rounded border-border"
          />
          <span>
            <span className="font-semibold">
              Exigir pago confirmado antes de preparar
            </span>
            <span className="block text-xs text-foreground-muted mt-0.5">
              Los pedidos pagados con Mercado Pago solo se preparan cuando el
              pago está confirmado (PAID). Desactivado: se preparan igual aunque
              el pago esté pendiente.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}
