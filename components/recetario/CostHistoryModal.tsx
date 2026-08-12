"use client";

import React from "react";
import { History, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import type { RecipeView } from "./RecipeCardGrid";

export interface CostEntry {
  id: number;
  cost: string;
  hasFullCost: boolean;
  source: string;
  createdAt: string;
}

const SOURCE_LABEL: Record<string, string> = {
  purchase: "Compra recibida",
  recipe_save: "Receta guardada",
  manual: "Manual",
};

interface CostHistoryModalProps {
  recipe: RecipeView | null;
  costHistory: CostEntry[];
  isLoading: boolean;
  onClose: () => void;
}

export function CostHistoryModal({
  recipe,
  costHistory,
  isLoading,
  onClose,
}: CostHistoryModalProps) {
  if (!recipe) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <History size={18} className="text-amber-600" />
            Historial de costo — {recipe.name}
          </h3>
          <button
            onClick={onClose}
            className="text-foreground-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>
        <div className="p-4 max-h-80 overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={22} className="animate-spin text-primary" />
            </div>
          ) : costHistory.length === 0 ? (
            <p className="text-sm text-foreground-muted text-center py-6">
              Todavía no hay registros. El costo se registra cuando cambia (al
              recibir una compra de ingredientes o al guardar la receta).
            </p>
          ) : (
            costHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between bg-muted border border-border rounded-lg px-3 py-2"
              >
                <div>
                  <p className="font-bold text-foreground">
                    {formatCurrency(parseFloat(entry.cost))}
                  </p>
                  <p className="text-[11px] text-foreground-muted">
                    {SOURCE_LABEL[entry.source] || entry.source}
                    {!entry.hasFullCost && " · costo incompleto"}
                  </p>
                </div>
                <span className="text-xs text-foreground-muted">
                  {new Date(entry.createdAt).toLocaleString("es-AR")}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
