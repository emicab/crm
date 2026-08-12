"use client";

import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

export interface IngredientOption {
  id: number;
  name: string;
  unitType?: string | null;
  quantityStock?: number;
}

export interface ModifierOptionState {
  uid: string;
  id?: number;
  name: string;
  priceExtra: string;
  colorHex?: string;
  ingredientId?: string;
  ingredientQty?: string;
}

export interface ModifierGroupState {
  uid: string;
  id?: number;
  name: string;
  type: "SINGLE_SELECT" | "MULTI_SELECT" | "SIZE_COLOR";
  isRequired: boolean;
  minSelect: string;
  maxSelect: string;
  options: ModifierOptionState[];
}

export interface TemplateOption {
  name: string;
  priceExtra?: string;
  colorHex?: string;
}

export interface TemplateGroup {
  name: string;
  type: "SINGLE_SELECT" | "MULTI_SELECT" | "SIZE_COLOR";
  isRequired: boolean;
  minSelect: string;
  maxSelect: string;
  options: TemplateOption[];
}

const newUid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const GASTRONOMIA_TEMPLATES: TemplateGroup[] = [
  {
    name: "Punto de Cocción",
    type: "SINGLE_SELECT",
    isRequired: true,
    minSelect: "1",
    maxSelect: "1",
    options: [
      { name: "Jugoso" },
      { name: "A punto" },
      { name: "Bien Cocido" },
    ],
  },
  {
    name: "Agregados / Extras",
    type: "MULTI_SELECT",
    isRequired: false,
    minSelect: "0",
    maxSelect: "",
    options: [
      { name: "Extra Queso Cheddar", priceExtra: "500" },
      { name: "Extra Bacon", priceExtra: "600" },
    ],
  },
];

export const INDUMENTARIA_TEMPLATES: TemplateGroup[] = [
  {
    name: "Color",
    type: "SIZE_COLOR",
    isRequired: true,
    minSelect: "1",
    maxSelect: "1",
    options: [
      { name: "Negro", colorHex: "#000000" },
      { name: "Blanco", colorHex: "#FFFFFF" },
      { name: "Azul", colorHex: "#2563EB" },
    ],
  },
  {
    name: "Talle",
    type: "SINGLE_SELECT",
    isRequired: true,
    minSelect: "1",
    maxSelect: "1",
    options: [
      { name: "S" },
      { name: "M" },
      { name: "L" },
      { name: "XL" },
    ],
  },
];

export function useProductModifiersController(
  isOpen: boolean,
  productId: number,
  onSuccess?: () => void,
  onClose?: () => void,
) {
  const [groups, setGroups] = useState<ModifierGroupState[]>([]);
  const [ingredients, setIngredients] = useState<IngredientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [pickerOpen, setPickerOpen] = useState<{
    gUid: string;
    oUid: string;
  } | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const uidCounter = useRef(1);

  const nextUid = () => newUid() + uidCounter.current++;

  useEffect(() => {
    if (!isOpen || !productId) return;

    setLoading(true);
    setPickerOpen(null);
    setPickerSearch("");
    setTemplatesOpen(false);
    setCollapsed({});

    Promise.all([
      fetch(`/api/products/${productId}/modifiers`).then((r) =>
        r.ok ? r.json() : [],
      ),
      fetch("/api/products?kind=ingredients&limit=5000").then((r) =>
        r.ok ? r.json() : [],
      ),
    ])
      .then(([modsData, ingData]) => {
        if (Array.isArray(ingData)) setIngredients(ingData);
        if (Array.isArray(modsData) && modsData.length > 0) {
          setGroups(
            modsData.map((g: any) => ({
              uid: nextUid(),
              id: g.id,
              name: g.name,
              type: g.type || "MULTI_SELECT",
              isRequired: Boolean(g.isRequired),
              minSelect: String(g.minSelect ?? 0),
              maxSelect:
                g.maxSelect !== null && g.maxSelect !== undefined
                  ? String(g.maxSelect)
                  : "",
              options: (g.options || []).map((o: any) => ({
                uid: nextUid(),
                id: o.id,
                name: o.name,
                priceExtra: o.priceExtra ? String(o.priceExtra) : "0",
                colorHex: o.colorHex || "#000000",
                ingredientId: o.ingredientId ? String(o.ingredientId) : "",
                ingredientQty:
                  o.ingredientQty !== null && o.ingredientQty !== undefined
                    ? String(o.ingredientQty)
                    : "1",
              })),
            })),
          );
        } else {
          setGroups([]);
        }
      })
      .catch((err) => console.error("Error al cargar modificadores:", err))
      .finally(() => setLoading(false));
  }, [isOpen, productId]);

  const updateGroup = (gUid: string, patch: Partial<ModifierGroupState>) => {
    setGroups((prev) =>
      prev.map((g) => (g.uid === gUid ? { ...g, ...patch } : g)),
    );
  };

  const updateOption = (
    gUid: string,
    oUid: string,
    patch: Partial<ModifierOptionState>,
  ) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.uid === gUid
          ? {
              ...g,
              options: g.options.map((o) =>
                o.uid === oUid ? { ...o, ...patch } : o,
              ),
            }
          : g,
      ),
    );
  };

  const handleAddGroup = () => {
    setGroups((prev) => [
      ...prev,
      {
        uid: nextUid(),
        name: "Nuevo Grupo",
        type: "MULTI_SELECT",
        isRequired: false,
        minSelect: "0",
        maxSelect: "",
        options: [],
      },
    ]);
  };

  const handleRemoveGroup = (gUid: string) => {
    setGroups((prev) => prev.filter((g) => g.uid !== gUid));
  };

  const handleAddOption = (gUid: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.uid === gUid
          ? {
              ...g,
              options: [
                ...g.options,
                {
                  uid: nextUid(),
                  name: "Nueva Opción",
                  priceExtra: "0",
                  colorHex: "#000000",
                },
              ],
            }
          : g,
      ),
    );
  };

  const handleRemoveOption = (gUid: string, oUid: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.uid === gUid
          ? { ...g, options: g.options.filter((o) => o.uid !== oUid) }
          : g,
      ),
    );
  };

  const toggleCollapse = (gUid: string) => {
    setCollapsed((prev) => ({ ...prev, [gUid]: !prev[gUid] }));
  };

  const applyTemplate = (template: TemplateGroup[]) => {
    const newGroups: ModifierGroupState[] = template.map((t) => ({
      uid: nextUid(),
      name: t.name,
      type: t.type,
      isRequired: t.isRequired,
      minSelect: t.minSelect,
      maxSelect: t.maxSelect,
      options: t.options.map((o) => ({
        uid: nextUid(),
        name: o.name,
        priceExtra: o.priceExtra || "0",
        colorHex: o.colorHex || "#000000",
      })),
    }));
    setGroups((prev) => [...prev, ...newGroups]);
    setTemplatesOpen(false);
    toast.success("Plantilla aplicada.");
  };

  const handleSave = async () => {
    for (const g of groups) {
      if (!g.name.trim()) {
        toast.error("Hay un grupo sin nombre.");
        return;
      }
      if (g.options.length === 0) {
        toast.error(`El grupo "${g.name}" debe tener al menos una opción.`);
        return;
      }
      for (const o of g.options) {
        if (!o.name.trim()) {
          toast.error(`Una opción del grupo "${g.name}" está sin nombre.`);
          return;
        }
      }
    }

    setIsProcessing(true);
    try {
      const payload = groups.map((g) => ({
        id: g.id,
        name: g.name.trim(),
        type: g.type,
        isRequired: g.isRequired,
        minSelect: parseInt(g.minSelect) || 0,
        maxSelect: g.maxSelect ? parseInt(g.maxSelect) : null,
        options: g.options.map((o) => ({
          id: o.id,
          name: o.name.trim(),
          priceExtra: parseFloat(o.priceExtra) || 0,
          colorHex: g.type === "SIZE_COLOR" || o.colorHex ? o.colorHex : null,
          ingredientId: o.ingredientId ? parseInt(o.ingredientId) : null,
          ingredientQty: o.ingredientQty ? parseFloat(o.ingredientQty) : 1,
        })),
      }));

      const res = await fetch(`/api/products/${productId}/modifiers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Error al guardar los modificadores.");
      }

      toast.success("Modificadores guardados con éxito.");
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar los modificadores.");
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    groups,
    ingredients,
    loading,
    isProcessing,
    collapsed,
    pickerOpen,
    setPickerOpen,
    pickerSearch,
    setPickerSearch,
    templatesOpen,
    setTemplatesOpen,
    updateGroup,
    updateOption,
    handleAddGroup,
    handleRemoveGroup,
    handleAddOption,
    handleRemoveOption,
    toggleCollapse,
    applyTemplate,
    handleSave,
  };
}
