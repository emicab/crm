
"use client";

import React, { useEffect, useState } from 'react';
import type { Product } from '@/types';
import Button from '@/components/ui/Button';
import { Edit3, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

const ProductTable = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const router = useRouter();

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    setActionError(null);
    try {
      const response = await fetch('/api/products');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }
      let data = await response.json();
      data = data.map((product: any) => ({
        ...product,
        pricePurchase: parseFloat(product.pricePurchase),
        priceSale: parseFloat(product.priceSale),
      }));
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los productos.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (productId: number) => {
    if (confirm('¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.')) {
      setActionError(null);
      try {
        const response = await fetch(`/api/products/${productId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error al eliminar: ${response.statusText} (${response.status})`);
        }
        setProducts(prevProducts => prevProducts.filter(product => product.id !== productId));
      
      } catch (err: any) {
        console.error('Error al eliminar el producto:', err);
        setActionError(err.message);
        alert(`Error: ${err.message}`);
      }
    }
  };

  const handleEdit = (productId: number) => {
    router.push(`/productos/${productId}/editar`);
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="ml-2 text-foreground-muted">Cargando productos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive p-4 bg-destructive/10 rounded-md">
          <AlertCircle size={20} className="inline-block mr-2" />
          {error}
      </div>
    );
  }

  return (
    <div className="bg-muted p-4 sm:p-6 rounded-lg shadow">
      {actionError && (
        <div className="mb-4 text-center text-destructive p-3 bg-destructive/10 rounded-md">
          <AlertCircle size={18} className="inline-block mr-2" />
          {actionError}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-left">
          <thead className="border-b border-border">
            <tr>
              <th className="p-3 sm:p-4 text-sm font-semibold text-foreground">Nombre</th>
              <th className="p-3 sm:p-4 text-sm font-semibold text-foreground">SKU</th>
              <th className="p-3 sm:p-4 text-sm font-semibold text-foreground">Marca</th>
              <th className="p-3 sm:p-4 text-sm font-semibold text-foreground">Categoría</th>
              <th className="p-3 sm:p-4 text-sm font-semibold text-foreground text-right">Precio Venta</th>
              <th className="p-3 sm:p-4 text-sm font-semibold text-foreground text-center">Stock</th>
              <th className="p-3 sm:p-4 text-sm font-semibold text-foreground text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && !loading ? (
                <tr>
                    <td colSpan={7} className="text-center text-foreground-muted py-8">
                        No se encontraron productos.
                    </td>
                </tr>
            ) : (
                products.map((product) => (
                <tr key={product.id} className="border-b border-border last:border-b-0 hover:bg-background transition-colors">
                    <td className="p-3 sm:p-4 text-sm text-foreground font-medium">{product.name}</td>
                    <td className="p-3 sm:p-4 text-sm text-foreground-muted">{product.sku || '-'}</td>
                    <td className="p-3 sm:p-4 text-sm text-foreground-muted">{product.brand.name}</td>
                    <td className="p-3 sm:p-4 text-sm text-foreground-muted">{product.category.name}</td>
                    <td className="p-3 sm:p-4 text-sm text-foreground text-right">{formatCurrency(product.priceSale)}</td>
                    <td className="p-3 sm:p-4 text-sm text-foreground text-center">{product.quantityStock}</td>
                    <td className="p-3 sm:p-4 text-sm text-center">
                    <div className="flex justify-center items-center space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(product.id)} title="Editar">
                        <Edit3 size={16} className="text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} title="Eliminar">
                        <Trash2 size={16} className="text-destructive" />
                        </Button>
                    </div>
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductTable;