"use client";

import React from "react";
import Button from "@/components/ui/Button";

interface UnitTypeModalProps {
  isOpen: boolean;
  productName: string;
  onConfirm: (unitType: string) => void;
  onCancel: () => void;
}

const options = [
  { value: 'UNIT', label: 'Unidad', desc: 'Se vende pieza por pieza' },
  { value: 'WEIGHT', label: 'Peso (kg)', desc: 'Se vende por kilogramo' },
  { value: 'VOLUME', label: 'Volumen (L)', desc: 'Se vende por litro' },
];

const UnitTypeModal: React.FC<UnitTypeModalProps> = ({ isOpen, productName, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-muted text-foreground rounded-2xl shadow-xl w-full max-w-sm m-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-1">Tipo de unidad</h3>
        <p className="text-sm text-foreground-muted mb-4">
          ¿Cómo se vende <strong>{productName}</strong>?
        </p>
        <div className="space-y-3">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onConfirm(opt.value)}
              className="w-full text-left p-3.5 rounded-xl border border-border bg-background hover:border-primary hover:bg-primary/5 transition-all text-foreground cursor-pointer active:scale-98"
            >
              <p className="font-semibold text-sm">{opt.label}</p>
              <p className="text-xs text-foreground-muted mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">Cancelar</Button>
        </div>
      </div>
    </div>
  );
};

export default UnitTypeModal;
