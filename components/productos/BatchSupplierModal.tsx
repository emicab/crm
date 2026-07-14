"use client";

import React from 'react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { Loader2 } from 'lucide-react';
import type { Supplier } from '@/types';

interface BatchSupplierModalProps {
  isOpen: boolean;
  selectedCount: number;
  supplierId: string;
  suppliers: Supplier[];
  isSaving: boolean;
  onSupplierChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

const BatchSupplierModal: React.FC<BatchSupplierModalProps> = ({
  isOpen,
  selectedCount,
  supplierId,
  suppliers,
  isSaving,
  onSupplierChange,
  onSave,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-muted text-foreground rounded-lg shadow-xl w-full max-w-md m-4 p-6">
        <h3 className="text-lg font-semibold mb-4">Asignar Proveedor</h3>
        <p className="text-sm text-foreground-muted mb-4">
          Asignar proveedor a {selectedCount} producto{selectedCount !== 1 ? 's' : ''}.
        </p>
        <Select
          label="Proveedor"
          name="batchSupplierId"
          value={supplierId}
          onChange={(e) => onSupplierChange(e.target.value)}
        >
          <option value="">Seleccionar proveedor...</option>
          {suppliers.map(s => (
            <option key={s.id} value={String(s.id)}>{s.name}</option>
          ))}
        </Select>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onSave} disabled={isSaving || !supplierId}>
            {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BatchSupplierModal;
