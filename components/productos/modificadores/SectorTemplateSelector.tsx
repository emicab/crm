"use client";

import React from "react";
import { Wand2 } from "lucide-react";
import {
  GASTRONOMIA_TEMPLATES,
  INDUMENTARIA_TEMPLATES,
  type TemplateGroup,
} from "@/hooks/useProductModifiersController";

interface SectorTemplateSelectorProps {
  businessSector: string;
  isOpen: boolean;
  onToggle: () => void;
  onApplyTemplate: (template: TemplateGroup[]) => void;
}

export function SectorTemplateSelector({
  businessSector,
  isOpen,
  onToggle,
  onApplyTemplate,
}: SectorTemplateSelectorProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center gap-1.5 hover:bg-indigo-500/15 transition-colors cursor-pointer"
      >
        <Wand2 size={14} /> Plantillas Rápidas
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 p-3 bg-background border border-border rounded-2xl shadow-xl z-20 space-y-2 text-xs">
          <p className="font-bold text-foreground">Plantillas recomendadas:</p>
          <button
            type="button"
            onClick={() => onApplyTemplate(GASTRONOMIA_TEMPLATES)}
            className="w-full p-2 rounded-xl text-left hover:bg-muted font-semibold transition-colors cursor-pointer border border-border/40"
          >
            🍔 Gastronomía (Punto de cocción, Extras)
          </button>
          <button
            type="button"
            onClick={() => onApplyTemplate(INDUMENTARIA_TEMPLATES)}
            className="w-full p-2 rounded-xl text-left hover:bg-muted font-semibold transition-colors cursor-pointer border border-border/40"
          >
            👕 Indumentaria (Color y Talle)
          </button>
        </div>
      )}
    </div>
  );
}
