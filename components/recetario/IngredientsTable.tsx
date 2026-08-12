"use client";

import React from "react";
import { PlusCircle, ChefHat, Loader2, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";

export interface IngredientView {
  id: number;
  name: string;
  sku: string | null;
  unitType: string | null;
  quantityStock: number;
  stockMinAlert: number | null;
  supplier: { name: string } | null;
}

interface IngredientsTableProps {
  ingredients: IngredientView[];
  isLoading: boolean;
  onNewIngredient: () => void;
  onEditIngredient: (ing: IngredientView) => void;
  onDeleteIngredient: (ing: IngredientView) => void;
}

export function IngredientsTable({
  ingredients,
  isLoading,
  onNewIngredient,
  onEditIngredient,
  onDeleteIngredient,
}: IngredientsTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" onClick={onNewIngredient}>
          <PlusCircle size={18} className="mr-2" /> Nuevo Ingrediente
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : ingredients.length === 0 ? (
        <div className="text-center py-16 bg-muted rounded-xl border border-border space-y-3">
          <ChefHat size={48} className="mx-auto text-foreground-muted" />
          <p className="text-foreground font-medium">
            Todavía no cargaste ingredientes.
          </p>
          <p className="text-sm text-foreground-muted max-w-md mx-auto">
            Cargá tu materia prima (tomate, huevo, queso, bifes...). Estos
            productos no se venden ni aparecen en la tienda web.
          </p>
        </div>
      ) : (
        <div className="bg-muted rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-foreground-muted border-b border-border">
                <th className="p-3">Nombre</th>
                <th className="p-3">Unidad</th>
                <th className="p-3 text-right">Stock</th>
                <th className="p-3 text-right">Mínimo</th>
                <th className="p-3">Proveedor</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ing) => {
                const isLow =
                  ing.quantityStock <= 0 ||
                  (ing.stockMinAlert != null &&
                    ing.quantityStock < ing.stockMinAlert);
                return (
                  <tr
                    key={ing.id}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="p-3 font-medium text-foreground">
                      {ing.name}
                    </td>
                    <td className="p-3 text-foreground-muted">
                      {ing.unitType === "WEIGHT"
                        ? "kg"
                        : ing.unitType === "VOLUME"
                        ? "L"
                        : "unidad"}
                    </td>
                    <td className="p-3 text-right">
                      <span
                        className={
                          isLow
                            ? "text-destructive font-bold"
                            : "text-foreground"
                        }
                      >
                        {ing.quantityStock}
                      </span>
                      {ing.quantityStock <= 0 && (
                        <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40">
                          <AlertTriangle size={10} /> Faltante
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right text-foreground-muted">
                      {ing.stockMinAlert ?? "—"}
                      {isLow && ing.stockMinAlert != null && (
                        <AlertTriangle
                          size={13}
                          className="inline ml-1 text-amber-500"
                        />
                      )}
                    </td>
                    <td className="p-3 text-foreground-muted">
                      {ing.supplier?.name || "—"}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => onEditIngredient(ing)}
                        className="p-1.5 rounded-md hover:bg-border text-foreground-muted hover:text-primary transition-colors"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => onDeleteIngredient(ing)}
                        className="p-1.5 rounded-md hover:bg-border text-foreground-muted hover:text-destructive transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
