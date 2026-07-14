"use client";

import React, { useState, useEffect, useRef } from "react";

interface WeightModalProps {
  isOpen: boolean;
  productName: string;
  unitType: string;
  initialValue?: string;
  onConfirm: (quantityInKgOrL: number) => void;
  onCancel: () => void;
}

const WeightModal: React.FC<WeightModalProps> = ({ isOpen, productName, unitType, initialValue, onConfirm, onCancel }) => {
  const [value, setValue] = useState(initialValue || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue || '');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!value.trim()) return;
    const numVal = parseFloat(value.replace(',', '.'));
    if (numVal <= 0 || isNaN(numVal)) return;
    onConfirm(numVal / 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-muted text-foreground rounded-lg shadow-xl w-full max-w-xs m-4 p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-1">{productName}</h3>
        <p className="text-sm text-foreground-muted mb-4">
          Ingresá cantidad en <strong>{unitType === 'WEIGHT' ? 'gramos' : 'mililitros'}</strong>
        </p>
        <div className="relative">
          <input
            ref={inputRef}
            type="number"
            step="any"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={unitType === 'WEIGHT' ? 'ej: 500' : 'ej: 350'}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            autoFocus
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-muted pointer-events-none">
            {unitType === 'WEIGHT' ? 'g' : 'mL'}
          </span>
        </div>
        <p className="text-[10px] text-foreground-muted/60 mt-2">
          <kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono text-[9px]">Enter</kbd> confirmar &middot;
          <kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono text-[9px] ml-1">Esc</kbd> cancelar
        </p>
      </div>
    </div>
  );
};

export default WeightModal;
