"use client";

import React from "react";
import Button from "@/components/ui/Button";
import { X, Edit } from "lucide-react";

interface SelectedBarProps {
  count: number;
  totalCount?: number;
  isAllPagesSelected?: boolean;
  onSelectAllPages?: () => void;
  onClear: () => void;
  onBatchUpdate: () => void;
  onPublishWeb?: () => void;
  onHideWeb?: () => void;
}

const SelectedBar: React.FC<SelectedBarProps> = ({
  count,
  totalCount,
  isAllPagesSelected,
  onSelectAllPages,
  onClear,
  onBatchUpdate,
  onPublishWeb,
  onHideWeb,
}) => {
  if (count === 0 && !isAllPagesSelected) return null;

  const displayCount = isAllPagesSelected && totalCount ? totalCount : count;

  return (
    <div className="mb-4 p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
      <div className="flex flex-wrap items-center gap-2 text-sm text-blue-950">
        <span className="font-bold">
          {isAllPagesSelected
            ? `Se seleccionaron los ${displayCount.toLocaleString("es-AR")} productos de TODAS las páginas.`
            : `${count} producto${count !== 1 ? "s" : ""} seleccionado${count !== 1 ? "s" : ""} en esta página.`}
        </span>

        {!isAllPagesSelected &&
          totalCount &&
          totalCount > count &&
          onSelectAllPages && (
            <button
              type="button"
              onClick={onSelectAllPages}
              className="text-xs font-extrabold text-blue-700 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2.5 py-1 rounded-full transition-colors ml-1"
            >
              Seleccionar los {totalCount.toLocaleString("es-AR")} productos en
              total
            </button>
          )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onPublishWeb && (
          <Button
            variant="outline"
            size="sm"
            onClick={onPublishWeb}
            className="border-emerald-600 text-emerald-700 hover:bg-emerald-100 bg-white font-semibold"
          >
            🌐 Publicar en Web
          </Button>
        )}
        {onHideWeb && (
          <Button
            variant="outline"
            size="sm"
            onClick={onHideWeb}
            className="border-gray-400 text-gray-700 hover:bg-gray-100 bg-white font-semibold"
          >
            🚫 Ocultar de Web
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          className="bg-white"
        >
          <X size={14} className="mr-1" /> Limpiar
        </Button>
        <Button variant="primary" size="sm" onClick={onBatchUpdate}>
          <Edit size={14} className="mr-1" /> Edición Masiva
        </Button>
      </div>
    </div>
  );
};

export default SelectedBar;
