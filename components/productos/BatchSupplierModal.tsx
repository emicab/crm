"use client";

import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { Loader2 } from 'lucide-react';
import type { Supplier, Brand, Category } from '@/types';
import { useQuickCreate } from '@/hooks/useQuickCreate';
import QuickCreateModal from './QuickCreateModal';

interface BatchSupplierModalProps {
  isOpen: boolean;
  selectedCount: number;
  brands: Brand[];
  categories: Category[];
  suppliers: Supplier[];
  isSaving: boolean;
  onSave: (data: { brandId?: string; categoryId?: string; supplierId?: string }) => void;
  onClose: () => void;
  onBrandCreated: (brand: Brand) => void;
  onCategoryCreated: (category: Category) => void;
  onSupplierCreated: (supplier: Supplier) => void;
}

const BatchSupplierModal: React.FC<BatchSupplierModalProps> = ({
  isOpen,
  selectedCount,
  brands,
  categories,
  suppliers,
  isSaving,
  onSave,
  onClose,
  onBrandCreated,
  onCategoryCreated,
  onSupplierCreated,
}) => {
  const [supplierId, setSupplierId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const brandQuickCreate = useQuickCreate({
    apiEndpoint: '/api/brands',
    label: 'marca',
    onCreated: (item) => onBrandCreated(item as Brand),
    onFieldSelect: setBrandId,
  });

  const categoryQuickCreate = useQuickCreate({
    apiEndpoint: '/api/categories',
    label: 'categoría',
    onCreated: (item) => onCategoryCreated(item as Category),
    onFieldSelect: setCategoryId,
  });

  const supplierQuickCreate = useQuickCreate({
    apiEndpoint: '/api/proveedores',
    label: 'proveedor',
    onCreated: (item) => onSupplierCreated(item as Supplier),
    onFieldSelect: setSupplierId,
  });

  // Resetear estados cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setSupplierId('');
      setBrandId('');
      setCategoryId('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const data: { brandId?: string; categoryId?: string; supplierId?: string } = {};
    if (brandId) data.brandId = brandId;
    if (categoryId) data.categoryId = categoryId;
    if (supplierId) data.supplierId = supplierId;
    onSave(data);
  };

  const hasChanges = !!(brandId || categoryId || supplierId);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-muted text-foreground rounded-lg shadow-xl w-full max-w-md m-4 p-6">
          <h3 className="text-lg font-semibold mb-4 text-primary">Asignación Masiva</h3>
          <p className="text-sm text-foreground-muted mb-4">
            Selecciona los campos que deseas actualizar para los {selectedCount} producto{selectedCount !== 1 ? 's' : ''} seleccionados. Los campos vacíos no se modificarán.
          </p>
          
          <div className="space-y-4">
            <div>
              <Select
                label="Categoría"
                name="batchCategoryId"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">No modificar (mantener actual)</option>
                {categories.map(c => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => categoryQuickCreate.setIsOpen(true)}
                className="mt-1 text-xs text-primary hover:underline flex items-center"
              >
                + Nueva Categoría
              </button>
            </div>

            <div>
              <Select
                label="Marca"
                name="batchBrandId"
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
              >
                <option value="">No modificar (mantener actual)</option>
                {brands.map(b => (
                  <option key={b.id} value={String(b.id)}>{b.name}</option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => brandQuickCreate.setIsOpen(true)}
                className="mt-1 text-xs text-primary hover:underline flex items-center"
              >
                + Nueva Marca
              </button>
            </div>

            <div>
              <Select
                label="Proveedor"
                name="batchSupplierId"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">No modificar (mantener actual)</option>
                {suppliers.map(s => (
                  <option key={s.id} value={String(s.id)}>{s.name}</option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => supplierQuickCreate.setIsOpen(true)}
                className="mt-1 text-xs text-primary hover:underline flex items-center"
              >
                + Nuevo Proveedor
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Aplicar Cambios
            </Button>
          </div>
        </div>
      </div>

      <QuickCreateModal
        isOpen={brandQuickCreate.isOpen}
        title="Nueva Marca"
        value={brandQuickCreate.name}
        isLoading={brandQuickCreate.isCreating}
        onChange={brandQuickCreate.setName}
        onSubmit={brandQuickCreate.handleCreate}
        onClose={() => brandQuickCreate.setIsOpen(false)}
      />

      <QuickCreateModal
        isOpen={categoryQuickCreate.isOpen}
        title="Nueva Categoría"
        value={categoryQuickCreate.name}
        isLoading={categoryQuickCreate.isCreating}
        onChange={categoryQuickCreate.setName}
        onSubmit={categoryQuickCreate.handleCreate}
        onClose={() => categoryQuickCreate.setIsOpen(false)}
      />

      <QuickCreateModal
        isOpen={supplierQuickCreate.isOpen}
        title="Nuevo Proveedor"
        value={supplierQuickCreate.name}
        isLoading={supplierQuickCreate.isCreating}
        onChange={supplierQuickCreate.setName}
        onSubmit={supplierQuickCreate.handleCreate}
        onClose={() => supplierQuickCreate.setIsOpen(false)}
      />
    </>
  );
};

export default BatchSupplierModal;
