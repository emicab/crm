"use client";

import React from 'react';
import Button from '@/components/ui/Button';
import { Edit3, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/formatCurrency';
import type { Product } from '@/types';

interface ProductMobileCardProps {
  product: Product;
  onEdit: (id: number) => void;
  onOpenDelete: (product: Product) => void;
}

const ProductMobileCard: React.FC<ProductMobileCardProps> = ({ product, onEdit, onOpenDelete }) => {
  const stockLabel = product.quantityStock +
    (product.unitType === 'WEIGHT' ? ' kg' : product.unitType === 'VOLUME' ? ' L' : '');

  return (
    <div className="bg-background p-4 rounded-lg border border-border shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-foreground">{product.name}</p>
          <p className="text-xs text-foreground-muted">SKU: {product.sku || 'N/A'}</p>
        </div>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon" onClick={() => onEdit(product.id)} title="Editar" className="h-8 w-8">
            <Edit3 size={16} className="text-primary" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onOpenDelete(product)} title="Eliminar" className="h-8 w-8">
            <Trash2 size={16} className="text-destructive" />
          </Button>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-border/60 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-foreground-muted">Precio Venta</p>
          <p className="font-semibold text-foreground">{formatCurrency(product.priceSale)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-foreground-muted">Precio Compra</p>
          <p className="font-semibold text-foreground">{formatCurrency(product.pricePurchase ?? 0)}</p>
        </div>
        <div>
          <p className="text-xs text-foreground-muted">Stock</p>
          <p className="font-semibold text-foreground">{stockLabel}</p>
        </div>
        <div>
          <p className="text-xs text-foreground-muted">Marca</p>
          <p className="font-medium text-foreground">{product.brand.name}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-foreground-muted">Categoría</p>
          <p className="font-medium text-foreground">{product.category.name}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-foreground-muted">Proveedor</p>
          <p className="font-medium text-foreground">{product.supplier?.name || '-'}</p>
        </div>
      </div>
    </div>
  );
};

export default ProductMobileCard;
