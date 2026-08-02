"use client";

import React, { useState } from "react";
import { Loader2, TrendingUp, CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";

interface BatchPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  isAllPagesSelected?: boolean;
  totalCount?: number;
  selectedIds: Set<number>;
  filters: any;
  onSuccess: () => void;
}

export function BatchPriceModal({
  isOpen,
  onClose,
  selectedCount,
  isAllPagesSelected,
  totalCount,
  selectedIds,
  filters,
  onSuccess,
}: BatchPriceModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [targetField, setTargetField] = useState<"sale" | "purchase" | "both">(
    "sale",
  );
  const [adjustType, setAdjustType] = useState<
    | "PERCENT_INCREASE"
    | "PERCENT_DECREASE"
    | "FIXED_INCREASE"
    | "FIXED_DECREASE"
    | "SET_FIXED"
  >("PERCENT_INCREASE");
  const [value, setValue] = useState<string>("10");
  const [roundOption, setRoundOption] = useState<
    "none" | "integer" | "tens" | "hundreds"
  >("integer");

  if (!isOpen) return null;

  const displayCount =
    isAllPagesSelected && totalCount ? totalCount : selectedCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numVal = parseFloat(value);
    if (isNaN(numVal) || numVal <= 0) {
      toast.error("Ingresá un valor numérico válido mayor a 0.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        allPages: isAllPagesSelected,
        ids: Array.from(selectedIds),
        filters,
        targetField,
        adjustType,
        value: numVal,
        roundOption,
      };

      const res = await fetch("/api/products/adjust-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.message || "Error al aplicar el ajuste de precios.",
        );
      }

      const data = await res.json();
      toast.success(
        data.message || `¡Precios actualizados en ${displayCount} productos!`,
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error al ajustar precios.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-border space-y-5 relative">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <TrendingUp size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                Ajustador Masivo de Precios
              </h3>
              <p className="text-xs text-foreground-muted">
                Aplica aumento, descuento o valor fijo a los productos
                seleccionados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-foreground-muted hover:text-foreground p-1 rounded-xl cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-3 bg-blue-300/80 border border-blue-500/30 rounded-2xl text-blue-900 dark:text-slate-800 text-xs font-semibold flex items-center justify-between">
          <span>Se aplicará el ajuste sobre:</span>
          <span className="font-extrabold px-2.5 py-0.5 bg-blue-600 text-white rounded-full">
            {displayCount.toLocaleString("es-AR")}{" "}
            {displayCount === 1 ? "Producto" : "Productos"}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ¿Qué precio modificar? */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              1. ¿Qué precio querés modificar?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTargetField("sale")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  targetField === "sale"
                    ? "border-primary bg-primary/10 text-primary shadow-xs"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                Precio Venta
              </button>
              <button
                type="button"
                onClick={() => setTargetField("purchase")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  targetField === "purchase"
                    ? "border-primary bg-primary/10 text-primary shadow-xs"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                Costo (Compra)
              </button>
              <button
                type="button"
                onClick={() => setTargetField("both")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  targetField === "both"
                    ? "border-primary bg-primary/10 text-primary shadow-xs"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                Ambos Precios
              </button>
            </div>
          </div>

          {/* Tipo de Ajuste */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              2. Tipo de Operación
            </label>
            <select
              value={adjustType}
              onChange={(e: any) => setAdjustType(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-semibold"
            >
              <option value="PERCENT_INCREASE">
                Aumentar por Porcentaje (%) (ej. +15%)
              </option>
              <option value="PERCENT_DECREASE">
                Disminuir por Porcentaje (%) (ej. -10%)
              </option>
              <option value="FIXED_INCREASE">
                Aumentar Valor Fijo ($) (ej. +$500)
              </option>
              <option value="FIXED_DECREASE">
                Disminuir Valor Fijo ($) (ej. -$200)
              </option>
              <option value="SET_FIXED">
                Establecer Precio Fijo Único ($) (ej. $1500)
              </option>
            </select>
          </div>

          {/* Valor a ingresar */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label={
                  adjustType.includes("PERCENT")
                    ? "Porcentaje de Modificación (%) *"
                    : "Monto de Modificación ($) *"
                }
                type="number"
                step="0.01"
                min="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={adjustType.includes("PERCENT") ? "15" : "500"}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Redondeo Final
              </label>
              <select
                value={roundOption}
                onChange={(e: any) => setRoundOption(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-semibold"
              >
                <option value="none">Sin redondeo (Decimales exactos)</option>
                <option value="integer">Al peso más cercano ($1)</option>
                <option value="tens">A la decena más cercana ($10)</option>
                <option value="hundreds">Al centenar más cercano ($100)</option>
              </select>
            </div>
          </div>

          {/* Resumen */}
          <div className="p-3 bg-muted rounded-xl border border-border text-xs text-foreground-muted italic">
            💡 Ejemplo: Si un producto cuesta $1.000 y aplicás un aumento del
            15% con redondeo a la decena, pasará a valer **$1.150**.
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <CheckCircle2 size={16} className="mr-2" />
              )}
              {submitting ? "Aplicando Ajuste..." : "Aplicar Ajuste de Precios"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
