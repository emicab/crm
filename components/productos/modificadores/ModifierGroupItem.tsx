"use client";

import React from "react";
import {
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  Palette,
  Search,
  PackageSearch,
} from "lucide-react";
import type {
  ModifierGroupState,
  ModifierOptionState,
  IngredientOption,
} from "@/hooks/useProductModifiersController";

interface ModifierGroupItemProps {
  group: ModifierGroupState;
  ingredients: IngredientOption[];
  isCollapsed: boolean;
  pickerOpen: { gUid: string; oUid: string } | null;
  pickerSearch: string;
  onToggleCollapse: () => void;
  onUpdateGroup: (gUid: string, patch: Partial<ModifierGroupState>) => void;
  onRemoveGroup: () => void;
  onAddOption: () => void;
  onRemoveOption: (oUid: string) => void;
  onUpdateOption: (oUid: string, patch: Partial<ModifierOptionState>) => void;
  onSetPickerOpen: (picker: { gUid: string; oUid: string } | null) => void;
  onSetPickerSearch: (term: string) => void;
}

const unitLabel = (unitType?: string | null) =>
  unitType === "WEIGHT" ? "kg" : unitType === "VOLUME" ? "L" : "u";

const defaultQtyForUnit = (unitType?: string | null) =>
  unitType === "WEIGHT" || unitType === "VOLUME" ? "0.1" : "1";

export function ModifierGroupItem({
  group,
  ingredients,
  isCollapsed,
  pickerOpen,
  pickerSearch,
  onToggleCollapse,
  onUpdateGroup,
  onRemoveGroup,
  onAddOption,
  onRemoveOption,
  onUpdateOption,
  onSetPickerOpen,
  onSetPickerSearch,
}: ModifierGroupItemProps) {
  return (
    <div className="bg-background border border-border rounded-xl p-4 space-y-4 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
          </button>
          <input
            type="text"
            value={group.name}
            onChange={(e) => onUpdateGroup(group.uid, { name: e.target.value })}
            placeholder="Nombre del grupo (ej. Salsas, Talles, Punto)"
            className="font-bold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none px-1 py-0.5 text-base flex-1"
          />
        </div>
        <button
          type="button"
          onClick={onRemoveGroup}
          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
          title="Eliminar grupo"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {!isCollapsed && (
        <div className="space-y-4 pt-2 border-t border-border/60">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/50 p-3 rounded-lg border border-border/40 text-xs">
            <div>
              <label className="block font-semibold text-foreground-muted mb-1">
                Tipo de Selección
              </label>
              <select
                value={group.type}
                onChange={(e) =>
                  onUpdateGroup(group.uid, {
                    type: e.target.value as any,
                  })
                }
                className="w-full p-2 rounded-lg border border-border bg-background text-foreground font-medium outline-none"
              >
                <option value="SINGLE_SELECT">Selección Única (Radio)</option>
                <option value="MULTI_SELECT">Selección Múltiple (Checkbox)</option>
                <option value="SIZE_COLOR">Talle / Color (Muestras)</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-4">
              <label className="flex items-center gap-2 font-semibold text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={group.isRequired}
                  onChange={(e) =>
                    onUpdateGroup(group.uid, { isRequired: e.target.checked })
                  }
                  className="rounded border-border text-primary focus:ring-primary"
                />
                Obligatorio
              </label>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block font-semibold text-foreground-muted mb-1">
                  Mín.
                </label>
                <input
                  type="number"
                  value={group.minSelect}
                  onChange={(e) =>
                    onUpdateGroup(group.uid, { minSelect: e.target.value })
                  }
                  className="w-full p-1.5 rounded-lg border border-border bg-background text-foreground outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block font-semibold text-foreground-muted mb-1">
                  Máx.
                </label>
                <input
                  type="number"
                  value={group.maxSelect}
                  onChange={(e) =>
                    onUpdateGroup(group.uid, { maxSelect: e.target.value })
                  }
                  placeholder="Sin límite"
                  className="w-full p-1.5 rounded-lg border border-border bg-background text-foreground outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
                Opciones del grupo ({group.options.length})
              </span>
              <button
                type="button"
                onClick={onAddOption}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} /> Agregar Opción
              </button>
            </div>

            <div className="space-y-2">
              {group.options.map((opt) => {
                const linkedIng = ingredients.find(
                  (i) => String(i.id) === opt.ingredientId,
                );
                const isPickerThis =
                  pickerOpen?.gUid === group.uid && pickerOpen?.oUid === opt.uid;

                return (
                  <div
                    key={opt.uid}
                    className="p-2.5 rounded-xl border border-border/80 bg-background space-y-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      {group.type === "SIZE_COLOR" && (
                        <div className="relative shrink-0">
                          <input
                            type="color"
                            value={opt.colorHex || "#000000"}
                            onChange={(e) =>
                              onUpdateOption(opt.uid, {
                                colorHex: e.target.value,
                              })
                            }
                            className="w-7 h-7 rounded-lg border border-border cursor-pointer p-0 bg-transparent"
                            title="Seleccionar color"
                          />
                        </div>
                      )}
                      <input
                        type="text"
                        value={opt.name}
                        onChange={(e) =>
                          onUpdateOption(opt.uid, { name: e.target.value })
                        }
                        placeholder="Nombre opción (ej. Queso Extra, Talle L)"
                        className="flex-1 p-2 rounded-lg border border-border bg-background text-foreground outline-none font-medium"
                      />
                      <div className="flex items-center gap-1 shrink-0 w-28">
                        <span className="text-foreground-muted">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={opt.priceExtra}
                          onChange={(e) =>
                            onUpdateOption(opt.uid, {
                              priceExtra: e.target.value,
                            })
                          }
                          placeholder="Extra"
                          className="w-full p-2 rounded-lg border border-border bg-background text-foreground outline-none font-mono"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveOption(opt.uid)}
                        className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* Selector de Ingrediente del Recetario */}
                    <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      {linkedIng ? (
                        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                          <PackageSearch size={13} className="shrink-0" />
                          <span>
                            Descuenta: <strong>{linkedIng.name}</strong>
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={opt.ingredientQty || "1"}
                            onChange={(e) =>
                              onUpdateOption(opt.uid, {
                                ingredientQty: e.target.value,
                              })
                            }
                            className="w-14 px-1.5 py-0.5 rounded bg-background text-foreground font-mono border border-emerald-500/40 text-center outline-none"
                          />
                          <span>{unitLabel(linkedIng.unitType)}</span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateOption(opt.uid, {
                                ingredientId: "",
                                ingredientQty: "1",
                              })
                            }
                            className="text-rose-500 font-bold hover:underline ml-1 cursor-pointer"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (isPickerThis) {
                              onSetPickerOpen(null);
                            } else {
                              onSetPickerOpen({
                                gUid: group.uid,
                                oUid: opt.uid,
                              });
                              onSetPickerSearch("");
                            }
                          }}
                          className="text-foreground-muted hover:text-primary font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <PackageSearch size={13} />
                          <span>+ Vincular ingrediente del recetario</span>
                        </button>
                      )}
                    </div>

                    {isPickerThis && (
                      <div className="p-3 bg-muted border border-border rounded-xl space-y-2 mt-2">
                        <div className="relative">
                          <Search
                            size={14}
                            className="absolute left-2.5 top-2.5 text-foreground-muted"
                          />
                          <input
                            type="text"
                            value={pickerSearch}
                            onChange={(e) => onSetPickerSearch(e.target.value)}
                            placeholder="Buscar ingrediente..."
                            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs outline-none"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-36 overflow-y-auto space-y-1">
                          {ingredients
                            .filter((i) =>
                              i.name
                                .toLowerCase()
                                .includes(pickerSearch.toLowerCase()),
                            )
                            .slice(0, 50)
                            .map((ing) => (
                              <button
                                key={ing.id}
                                type="button"
                                onClick={() => {
                                  onUpdateOption(opt.uid, {
                                    ingredientId: String(ing.id),
                                    ingredientQty: defaultQtyForUnit(
                                      ing.unitType,
                                    ),
                                  });
                                  onSetPickerOpen(null);
                                }}
                                className="w-full text-left p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary text-xs flex justify-between items-center transition-colors cursor-pointer"
                              >
                                <span className="font-medium">{ing.name}</span>
                                <span className="text-[10px] text-foreground-muted font-mono">
                                  {unitLabel(ing.unitType)}
                                </span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
