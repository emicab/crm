"use client";

import React from "react";
import { X, Plus, Sliders, Loader2, Layers } from "lucide-react";
import Button from "@/components/ui/Button";
import { useProductModifiersController } from "@/hooks/useProductModifiersController";
import { ModifierGroupItem } from "./modificadores/ModifierGroupItem";
import { SectorTemplateSelector } from "./modificadores/SectorTemplateSelector";

interface ProductModifiersModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: number;
  productName: string;
  businessSector?: string;
  onSuccess?: () => void;
}

const ProductModifiersModal: React.FC<ProductModifiersModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
  businessSector = "GASTRONOMIA",
  onSuccess,
}) => {
  const {
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
  } = useProductModifiersController(isOpen, productId, onSuccess, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="bg-background text-foreground w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold truncate">
                Variantes & Modificadores
              </h3>
              <p className="text-xs text-foreground-muted">
                Producto: <span className="font-bold text-foreground">{productName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SectorTemplateSelector
              businessSector={businessSector}
              isOpen={templatesOpen}
              onToggle={() => setTemplatesOpen((prev) => !prev)}
              onApplyTemplate={applyTemplate}
            />

            <button
              onClick={onClose}
              className="p-2 rounded-full text-foreground-muted hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12 bg-muted/50 rounded-2xl border border-dashed border-border p-6 space-y-3">
              <Layers size={40} className="mx-auto text-foreground-muted" />
              <p className="font-bold text-foreground">
                No hay grupos de modificadores configurados
              </p>
              <p className="text-xs text-foreground-muted max-w-sm mx-auto">
                Agregá grupos para personalizar este producto (ej. Punto de cocción, Talles, Colores o Aderezos extra).
              </p>
              <Button
                type="button"
                variant="primary"
                onClick={handleAddGroup}
                className="mt-2"
              >
                <Plus size={16} className="mr-1.5" /> Crear Primer Grupo
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <ModifierGroupItem
                  key={group.uid}
                  group={group}
                  ingredients={ingredients}
                  isCollapsed={Boolean(collapsed[group.uid])}
                  pickerOpen={pickerOpen}
                  pickerSearch={pickerSearch}
                  onToggleCollapse={() => toggleCollapse(group.uid)}
                  onUpdateGroup={(gUid, patch) => updateGroup(gUid, patch)}
                  onRemoveGroup={() => handleRemoveGroup(group.uid)}
                  onAddOption={() => handleAddOption(group.uid)}
                  onRemoveOption={(oUid) => handleRemoveOption(group.uid, oUid)}
                  onUpdateOption={(oUid, patch) => updateOption(group.uid, oUid, patch)}
                  onSetPickerOpen={setPickerOpen}
                  onSetPickerSearch={setPickerSearch}
                />
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={handleAddGroup}
                className="w-full border-dashed"
              >
                <Plus size={16} className="mr-1.5" /> Agregar Nuevo Grupo de Opciones
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/40 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={isProcessing}
          >
            {isProcessing && <Loader2 size={16} className="animate-spin mr-2" />}
            Guardar Modificadores
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductModifiersModal;
