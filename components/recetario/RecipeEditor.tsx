"use client";

import React, { useState } from "react";
import { Plus, X, Loader2, Search, ChefHat } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  displayUnitLabel,
  toCanonicalQty,
  toDisplayQty,
  unitLabel,
} from "@/lib/recipeUnits";

export interface RecipeIngredientForm {
  ingredientId: number;
  name: string;
  unitType: string; // UNIT | WEIGHT | VOLUME (canonical del ingrediente)
  quantity: number; // en unidad canónica (kg/L/u)
}

interface RecipeEditorProps {
  items: RecipeIngredientForm[];
  onChange: (items: RecipeIngredientForm[]) => void;
  excludeProductId?: number;
}

const RecipeEditor: React.FC<RecipeEditorProps> = ({
  items,
  onChange,
  excludeProductId,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const searchProducts = async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/products?kind=all&search=${encodeURIComponent(term)}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.data || [];
        setResults(
          list.filter(
            (p: any) => p.id !== excludeProductId && !items.some((i) => i.ingredientId === p.id),
          ),
        );
      }
    } catch {
      toast.error("Error al buscar ingredientes.");
    } finally {
      setSearching(false);
    }
  };

  const addIngredient = (product: any) => {
    if (items.some((i) => i.ingredientId === product.id)) {
      toast.error("Ese ingrediente ya está en la receta.");
      return;
    }
    const unitType = product.unitType || "UNIT";
    onChange([
      ...items,
      {
        ingredientId: product.id,
        name: product.name,
        unitType,
        quantity: unitType === "UNIT" ? 1 : 0.1,
      },
    ]);
    setSearchTerm("");
    setResults([]);
  };

  const updateQuantity = (ingredientId: number, displayQty: string) => {
    const parsed = parseFloat(displayQty.replace(",", "."));
    onChange(
      items.map((i) => {
        if (i.ingredientId !== ingredientId) return i;
        const unitType = i.unitType || "UNIT";
        const canonical = isNaN(parsed) ? 0 : toCanonicalQty(parsed, unitType);
        return { ...i, quantity: Math.max(0, canonical) };
      }),
    );
  };

  const removeIngredient = (ingredientId: number) => {
    onChange(items.filter((i) => i.ingredientId !== ingredientId));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-foreground">
          Ingredientes de la receta
        </label>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
        >
          <Plus size={14} /> Agregar ingrediente
        </button>
      </div>

      {isOpen && (
        <div className="space-y-2 p-3 bg-background rounded-lg border border-border">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                searchProducts(e.target.value);
              }}
              placeholder="Buscar producto ingrediente (ej. Bife de lomo, Queso)..."
              className="w-full pl-9 pr-8 py-2 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {searching && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-foreground-muted" />}
          </div>

          {results.length > 0 && (
            <div className="border border-border rounded-md max-h-48 overflow-y-auto bg-background">
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addIngredient(p)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex justify-between items-center"
                >
                  <span>{p.name}</span>
                  <span className="text-[11px] text-foreground-muted uppercase">
                    {p.unitType === "WEIGHT" ? "kg" : p.unitType === "VOLUME" ? "L" : "unidad"}
                  </span>
                </button>
              ))}
            </div>
          )}
          {searchTerm && !searching && results.length === 0 && (
            <p className="text-xs text-foreground-muted">Sin resultados. Probá con otro nombre.</p>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-foreground-muted bg-background border border-dashed border-border rounded-lg p-4 text-center">
          <ChefHat size={18} className="inline mr-1.5 text-foreground-muted" />
          Sin ingredientes todavía. El stock de este producto se calculará automáticamente cuando
          agregues ingredientes.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const displayQty = toDisplayQty(item.quantity, item.unitType);
            return (
              <div
                key={item.ingredientId}
                className="flex items-center gap-2 bg-background p-2 rounded-md border border-border"
              >
                <span className="flex-1 text-sm font-medium text-foreground truncate">
                  {item.name}
                </span>
                <span className="text-[10px] uppercase text-foreground-muted font-semibold">
                  {item.unitType === "WEIGHT"
                    ? "g (stock en kg)"
                    : item.unitType === "VOLUME"
                      ? "ml (stock en L)"
                      : "unidades"}
                </span>
                <input
                  type="number"
                  min="0"
                  step={item.unitType === "UNIT" ? "1" : "0.001"}
                  value={displayQty}
                  onChange={(e) => updateQuantity(item.ingredientId, e.target.value)}
                  className="w-24 text-center text-sm rounded border border-border bg-background p-1"
                  title={`Cantidad en ${displayUnitLabel(item.unitType)}`}
                />
                <span className="text-xs text-foreground-muted w-6">
                  {displayUnitLabel(item.unitType)}
                </span>
                <button
                  type="button"
                  onClick={() => removeIngredient(item.ingredientId)}
                  className="text-destructive hover:text-destructive/80"
                  title="Quitar ingrediente"
                >
                  <X size={17} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {items.length > 0 && (
        <p className="text-[11px] text-foreground-muted">
          Cantidades en la unidad del ingrediente: {items.map((i) => `${i.name} (${unitLabel(i.unitType)})`).join(", ")}.
        </p>
      )}
    </div>
  );
};

export default RecipeEditor;
