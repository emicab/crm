"use client";

import React from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Filter, X } from 'lucide-react';
import type { Brand, Category, Supplier } from '@/types';

interface ProductFiltersProps {
  filters: { search: string; brandId: string; categoryId: string; supplierId: string };
  brands: Brand[];
  categories: Category[];
  suppliers: Supplier[];
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onClear: () => void;
  onExportCSV: () => void;
  onImportCSV: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ProductFilters: React.FC<ProductFiltersProps> = ({
  filters, brands, categories, suppliers, onChange, onClear, onExportCSV, onImportCSV,
}) => (
  <div className="mb-6 p-4 border border-border rounded-md bg-background">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
      <h3 className="text-lg font-medium text-foreground flex items-center">
        <Filter size={18} className="mr-2 text-primary" /> Filtros y Búsqueda
      </h3>
      <div className="flex items-center space-x-2">
        <Button onClick={onExportCSV} variant="outline" size="sm" className="text-xs">
          Exportar CSV
        </Button>
        <label className="flex items-center justify-center h-8 px-3 text-xs font-medium rounded-md border border-input bg-background hover:bg-muted text-foreground transition-colors cursor-pointer">
          Importar CSV
          <input type="file" accept=".csv" onChange={onImportCSV} className="hidden" />
        </label>
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Input name="search" placeholder="Buscar por nombre o SKU..." value={filters.search} onChange={onChange} />
      <Select name="brandId" value={filters.brandId} onChange={onChange} aria-label="Filtrar por Marca">
        <option value="">Todas las Marcas</option>
        {brands.map((b) => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
      </Select>
      <Select name="categoryId" value={filters.categoryId} onChange={onChange} aria-label="Filtrar por Categoría">
        <option value="">Todas las Categorías</option>
        {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
      </Select>
      <Select name="supplierId" value={filters.supplierId} onChange={onChange} aria-label="Filtrar por Proveedor">
        <option value="">Todos los Proveedores</option>
        {suppliers.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
      </Select>
      <Button onClick={onClear} variant="outline" className="h-10 self-end">
        <X size={16} className="mr-2" /> Limpiar Filtros
      </Button>
    </div>
  </div>
);

export default ProductFilters;
