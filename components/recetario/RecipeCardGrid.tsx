"use client";

import React from "react";
import Link from "next/link";
import {
  PlusCircle,
  Copy,
  Pencil,
  Loader2,
  ChefHat,
  AlertTriangle,
  History,
  Globe,
  EyeOff,
  Lock,
  Sliders,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/formatCurrency";
import { formatQuantity } from "@/lib/recipeUnits";

export interface RecipeItemView {
  id: number;
  ingredientId: number;
  name: string;
  unitType: string;
  quantity: number;
  isRecipe: boolean;
}

export interface RecipeView {
  id: number;
  name: string;
  sku: string | null;
  priceSale: string;
  stockMinAlert: number | null;
  derivedStock: number;
  limiting: { ingredientId: number; name: string }[];
  cost: string;
  hasFullCost: boolean;
  margin: number | null;
  isPublicWeb: boolean;
  items: RecipeItemView[];
}

interface RecipeCardGridProps {
  recipes: RecipeView[];
  isLoading: boolean;
  isPro: boolean;
  onOpenModifiers: (recipe: RecipeView) => void;
  onOpenHistory: (recipe: RecipeView) => void;
  onToggleWeb: (recipe: RecipeView, value: boolean) => void;
}

export function RecipeCardGrid({
  recipes,
  isLoading,
  isPro,
  onOpenModifiers,
  onOpenHistory,
  onToggleWeb,
}: RecipeCardGridProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/productos/nuevo">
          <Button variant="primary">
            <PlusCircle size={18} className="mr-2" /> Nuevo Producto Elaborado
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-16 bg-muted rounded-xl border border-border space-y-3">
          <ChefHat size={48} className="mx-auto text-foreground-muted" />
          <p className="text-foreground font-medium">
            Todavía no hay productos elaborados.
          </p>
          <p className="text-sm text-foreground-muted max-w-md mx-auto">
            Creá un producto, marcá "Producto elaborado (Recetario)" y definí sus
            ingredientes con cantidades (ej. Lomo XL = 3 bifes, 2 huevos, 300g
            queso).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {recipes.map((recipe) => {
            const costNum = parseFloat(recipe.cost) || 0;
            const isOut = recipe.derivedStock <= 0;
            const isLow =
              !isOut &&
              recipe.stockMinAlert !== null &&
              recipe.derivedStock < recipe.stockMinAlert;
            return (
              <div
                key={recipe.id}
                className="bg-muted rounded-xl border border-border p-4 space-y-3 flex flex-col"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-foreground truncate">
                      {recipe.name}
                    </h3>
                    {recipe.sku && (
                      <p className="text-[11px] text-foreground-muted">
                        SKU: {recipe.sku}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onOpenModifiers(recipe)}
                      title="Personalizar Variantes & Modificadores (Talles, Colores, Agregados)"
                      className="p-1.5 rounded-md hover:bg-border text-foreground-muted hover:text-indigo-600 transition-colors"
                    >
                      <Sliders size={16} />
                    </button>
                    <Link
                      href={`/productos/${recipe.id}/editar`}
                      title="Editar receta"
                    >
                      <span className="p-1.5 rounded-md hover:bg-border text-foreground-muted hover:text-primary transition-colors inline-flex">
                        <Pencil size={16} />
                      </span>
                    </Link>
                    <Link
                      href={`/productos/nuevo?clonarReceta=${recipe.id}&nombre=${encodeURIComponent(recipe.name + " (copia)")}&precio=${encodeURIComponent(recipe.priceSale)}`}
                      title="Clonar receta (otras variedades o tamaños)"
                    >
                      <span className="p-1.5 rounded-md hover:bg-border text-foreground-muted hover:text-primary transition-colors inline-flex">
                        <Copy size={16} />
                      </span>
                    </Link>
                    <button
                      onClick={() => onOpenHistory(recipe)}
                      title="Historial de costo"
                      className="p-1.5 rounded-md hover:bg-border text-foreground-muted hover:text-primary transition-colors"
                    >
                      <History size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2">
                  <span className="text-xs text-foreground-muted">
                    Podés preparar
                  </span>
                  <span
                    className={`text-lg font-black ${
                      isOut
                        ? "text-destructive"
                        : isLow
                        ? "text-amber-600"
                        : "text-success"
                    }`}
                  >
                    {recipe.derivedStock}
                  </span>
                </div>

                {isOut && (
                  <div className="flex items-start gap-2 bg-destructive/10 text-destructive text-xs rounded-lg p-2.5">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>
                      Sin stock. Falta{" "}
                      {recipe.limiting
                        .map((l) => `"${l.name}"`)
                        .join(", ") || "cargar ingredientes"}
                      .
                    </span>
                  </div>
                )}
                {isLow && (
                  <div className="flex items-start gap-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs rounded-lg p-2.5">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>
                      Bajo mínimo ({recipe.stockMinAlert}). Limitado por{" "}
                      {recipe.limiting.map((l) => `"${l.name}"`).join(", ")}.
                    </span>
                  </div>
                )}

                {/* Costo y margen */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-background border border-border rounded-lg px-3 py-2">
                    <p className="text-[10px] uppercase text-foreground-muted">
                      Costo unitario
                    </p>
                    <p className="font-bold text-foreground">
                      {recipe.hasFullCost && costNum > 0 ? (
                        formatCurrency(costNum)
                      ) : (
                        <span className="text-foreground-muted font-normal text-xs">
                          sin costo
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="bg-background border border-border rounded-lg px-3 py-2">
                    <p className="text-[10px] uppercase text-foreground-muted">
                      Margen
                    </p>
                    <p
                      className={`font-bold ${
                        recipe.margin === null
                          ? "text-foreground-muted"
                          : recipe.margin < 0
                          ? "text-destructive"
                          : "text-success"
                      }`}
                    >
                      {recipe.margin === null
                        ? "—"
                        : `${recipe.margin > 0 ? "+" : ""}${recipe.margin}%`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">
                    {formatCurrency(parseFloat(recipe.priceSale))}
                  </span>
                  <span className="text-[11px] text-foreground-muted">
                    {recipe.items.length} ingrediente
                    {recipe.items.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-1 bg-background border border-border rounded-lg p-2.5 text-xs">
                  {recipe.items.map((item) => (
                    <div key={item.id} className="flex justify-between gap-2">
                      <span className="text-foreground truncate">
                        {item.isRecipe ? `🧾 ${item.name}` : item.name}
                      </span>
                      <span className="text-foreground-muted shrink-0">
                        {formatQuantity(item.quantity, item.unitType)}
                      </span>
                    </div>
                  ))}
                </div>

                {isPro ? (
                  <button
                    onClick={() => onToggleWeb(recipe, !recipe.isPublicWeb)}
                    className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      recipe.isPublicWeb
                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-300 hover:bg-emerald-500/20"
                        : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
                    }`}
                    title="Mostrar/ocultar en la tienda web"
                  >
                    {recipe.isPublicWeb ? (
                      <>
                        <Globe size={13} /> Publicado en tienda web
                      </>
                    ) : (
                      <>
                        <EyeOff size={13} /> Oculto de la tienda web
                      </>
                    )}
                  </button>
                ) : (
                  <div className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-300">
                    <Lock size={13} /> Tienda web en Plan Pro
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
