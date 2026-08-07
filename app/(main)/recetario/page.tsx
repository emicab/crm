"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  PlusCircle,
  Copy,
  Pencil,
  Loader2,
  ChefHat,
  AlertTriangle,
  PackageSearch,
  Trash2,
  History,
  Globe,
  EyeOff,
  Lock,
  Sliders,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/formatCurrency";
import { formatQuantity } from "@/lib/recipeUnits";
import { useModules } from "@/hooks/useModules";
import IngredientForm from "@/components/recetario/IngredientForm";
import ProductModifiersModal from "@/components/productos/ProductModifiersModal";
import { toast } from "react-hot-toast";

interface RecipeItemView {
  id: number;
  ingredientId: number;
  name: string;
  unitType: string;
  quantity: number;
  isRecipe: boolean;
}

interface RecipeView {
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

interface IngredientView {
  id: number;
  name: string;
  sku: string | null;
  unitType: string | null;
  quantityStock: number;
  stockMinAlert: number | null;
  supplier: { name: string } | null;
}

interface CostEntry {
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

export default function RecetarioPage() {
  const { isModuleEnabled, plan } = useModules();
  const [tab, setTab] = useState<"ingredientes" | "elaborados">("ingredientes");

  // Elaborados
  const [recipes, setRecipes] = useState<RecipeView[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);

  // Ingredientes
  const [ingredients, setIngredients] = useState<IngredientView[]>([]);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ingredient form
  const [showIngredientForm, setShowIngredientForm] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<any | null>(null);

  // Cost history modal
  const [historyRecipe, setHistoryRecipe] = useState<RecipeView | null>(null);
  const [costHistory, setCostHistory] = useState<CostEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Modifiers modal
  const [selectedRecipeForModifiers, setSelectedRecipeForModifiers] = useState<RecipeView | null>(null);
  const [isModifiersModalOpen, setIsModifiersModalOpen] = useState(false);
  const [businessSector, setBusinessSector] = useState("GASTRONOMIA");

  useEffect(() => {
    fetch("/api/store-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (cfg?.businessSector) setBusinessSector(cfg.businessSector);
      })
      .catch(() => {});
  }, []);

  const isPro = plan === "pro";

  const loadRecipes = useCallback(async () => {
    setIsLoadingRecipes(true);
    try {
      const res = await fetch("/api/recipes");
      if (!res.ok) throw new Error("Error al cargar los elaborados.");
      setRecipes(await res.json());
      setError(null);
    } catch (err: any) {
      setError(err.message || "Error al cargar los elaborados.");
    } finally {
      setIsLoadingRecipes(false);
    }
  }, []);

  const loadIngredients = useCallback(async () => {
    setIsLoadingIngredients(true);
    try {
      const res = await fetch("/api/products?kind=ingredients&limit=1000");
      if (!res.ok) throw new Error("Error al cargar los ingredientes.");
      const data = await res.json();
      setIngredients(Array.isArray(data) ? data : data.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Error al cargar los ingredientes.");
    } finally {
      setIsLoadingIngredients(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadRecipes(), loadIngredients()]).finally(() =>
      setIsLoading(false),
    );
  }, [loadRecipes, loadIngredients]);

  if (!isModuleEnabled("recetario")) {
    return (
      <div className="max-w-2xl mx-auto mt-16 text-center space-y-3">
        <PackageSearch size={48} className="mx-auto text-foreground-muted" />
        <h1 className="text-xl font-bold text-foreground">
          Módulo Recetario desactivado
        </h1>
        <p className="text-sm text-foreground-muted">
          Activá el Recetario desde Configuración → Datos del Comercio → Módulos
          activables.
        </p>
        <Link href="/configuracion">
          <Button variant="primary" className="mt-2">
            Ir a Configuración
          </Button>
        </Link>
      </div>
    );
  }

  const openHistory = async (recipe: RecipeView) => {
    setHistoryRecipe(recipe);
    setIsLoadingHistory(true);
    setCostHistory([]);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}/cost-history`);
      if (res.ok) setCostHistory(await res.json());
    } catch {
      // silencioso
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleToggleWeb = async (recipe: RecipeView, value: boolean) => {
    try {
      const res = await fetch(`/api/products/${recipe.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublicWeb: value }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar la visibilidad.");
      setRecipes((prev) =>
        prev.map((r) =>
          r.id === recipe.id ? { ...r, isPublicWeb: value } : r,
        ),
      );
      toast.success(
        value ? "Visible en la tienda web." : "Oculto de la tienda web.",
      );
    } catch (err: any) {
      toast.error(err.message || "Error al cambiar visibilidad.");
    }
  };

  const handleDeleteIngredient = async (ing: IngredientView) => {
    if (!confirm(`¿Eliminar el ingrediente "${ing.name}"?`)) return;
    try {
      const res = await fetch(`/api/products/${ing.id}`, { method: "DELETE" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "No se pudo eliminar.");
      }
      toast.success("Ingrediente eliminado.");
      loadIngredients();
    } catch (err: any) {
      toast.error(err.message || "No se pudo eliminar el ingrediente.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground flex items-center gap-2">
          Recetario
        </h1>
        <p className="mt-1 text-foreground-muted">
          Cargá tus ingredientes (materia prima) y definí los productos
          elaborados que los consumen.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex gap-2">
        <button
          onClick={() => setTab("ingredientes")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "ingredientes"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-foreground-muted hover:text-foreground"
          }`}
        >
          Ingredientes
          {ingredients.length > 0 && (
            <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
              {ingredients.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("elaborados")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "elaborados"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-foreground-muted hover:text-foreground"
          }`}
        >
          Productos Elaborados
          {recipes.length > 0 && (
            <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
              {recipes.length}
            </span>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      {/* ── INGREDIENTES ─────────────────────────────────────────────── */}
      {tab === "ingredientes" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={() => {
                setEditingIngredient(null);
                setShowIngredientForm(true);
              }}
            >
              <PlusCircle size={18} className="mr-2" /> Nuevo Ingrediente
            </Button>
          </div>

          {isLoadingIngredients ? (
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
                      ing.stockMinAlert != null &&
                      ing.quantityStock < ing.stockMinAlert;
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
                        </td>
                        <td className="p-3 text-right text-foreground-muted">
                          {ing.stockMinAlert ?? "—"}
                          {isLow && (
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
                            onClick={() => {
                              setEditingIngredient(ing);
                              setShowIngredientForm(true);
                            }}
                            className="p-1.5 rounded-md hover:bg-border text-foreground-muted hover:text-primary transition-colors"
                            title="Editar"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteIngredient(ing)}
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
      )}

      {/* ── ELABORADOS ───────────────────────────────────────────────── */}
      {tab === "elaborados" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Link href="/productos/nuevo">
              <Button variant="primary">
                <PlusCircle size={18} className="mr-2" /> Nuevo Producto
                Elaborado
              </Button>
            </Link>
          </div>

          {isLoadingRecipes ? (
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
                Creá un producto, marcá "Producto elaborado (Recetario)" y
                definí sus ingredientes con cantidades (ej. Lomo XL = 3 bifes, 2
                huevos, 300g queso).
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
                          onClick={() => {
                            setSelectedRecipeForModifiers(recipe);
                            setIsModifiersModalOpen(true);
                          }}
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
                          onClick={() => openHistory(recipe)}
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
                          {recipe.limiting.map((l) => `"${l.name}"`).join(", ")}
                          .
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
                        <div
                          key={item.id}
                          className="flex justify-between gap-2"
                        >
                          <span className="text-foreground truncate">
                            {item.isRecipe ? `🧾 ${item.name}` : item.name}
                          </span>
                          <span className="text-foreground-muted shrink-0">
                            {formatQuantity(item.quantity, item.unitType)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Toggle tienda web (solo Plan Pro) */}
                    {isPro ? (
                      <button
                        onClick={() =>
                          handleToggleWeb(recipe, !recipe.isPublicWeb)
                        }
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
      )}

      {/* Modal Ingrediente */}
      {showIngredientForm && (
        <IngredientForm
          initial={editingIngredient}
          onClose={() => setShowIngredientForm(false)}
          onSaved={loadIngredients}
        />
      )}

      {/* Modal Historial de Costo */}
      {historyRecipe && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <History size={18} className="text-amber-600" />
                Historial de costo — {historyRecipe.name}
              </h3>
              <button
                onClick={() => setHistoryRecipe(null)}
                className="text-foreground-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto space-y-2">
              {isLoadingHistory ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={22} className="animate-spin text-primary" />
                </div>
              ) : costHistory.length === 0 ? (
                <p className="text-sm text-foreground-muted text-center py-6">
                  Todavía no hay registros. El costo se registra cuando cambia
                  (al recibir una compra de ingredientes o al guardar la
                  receta).
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
      )}

      {/* Modal Modificadores & Variantes */}
      <ProductModifiersModal
        isOpen={isModifiersModalOpen}
        onClose={() => setIsModifiersModalOpen(false)}
        productId={selectedRecipeForModifiers?.id || 0}
        productName={selectedRecipeForModifiers?.name || ""}
        businessSector={businessSector}
        onSuccess={loadRecipes}
      />
    </div>
  );
}
