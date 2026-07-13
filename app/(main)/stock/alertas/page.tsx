"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Loader2, Package, Edit3, PlusCircle, RefreshCw } from 'lucide-react';
import type { Product } from '@/types';

export default function StockAlertasPage() {
  const [products, setProducts] = useState<(Product & { supplier?: { name: string } | null })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products?limit=200');
      if (!res.ok) throw new Error('Error al cargar productos');
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.data || [];
      const alertProducts = items.filter(
        (p: any) => p.stockMinAlert !== null && p.stockMinAlert !== undefined && p.quantityStock < p.stockMinAlert
      );
      setProducts(alertProducts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <AlertTriangle size={28} className="text-warning" />
          <h1 className="text-2xl font-bold text-foreground">Alertas de Stock</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchAlerts}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-muted hover:bg-background border border-border rounded-lg transition-colors"
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
          <Link
            href="/compras/nueva"
            className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <PlusCircle size={16} />
            Nueva Compra
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-muted rounded-xl border border-border">
          <Package size={48} className="mx-auto text-success/60 mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Todo en orden</h2>
          <p className="text-foreground-muted mt-2">No hay productos por debajo del stock mínimo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-foreground-muted">
            {products.length} producto{products.length !== 1 ? 's' : ''} por debajo del stock mínimo.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left">
              <thead className="border-b border-border">
                <tr>
                  <th className="p-3 text-sm font-semibold text-foreground">Producto</th>
                  <th className="p-3 text-sm font-semibold text-foreground">SKU</th>
                  <th className="p-3 text-sm font-semibold text-foreground">Proveedor</th>
                  <th className="p-3 text-sm font-semibold text-foreground text-center">Stock Actual</th>
                  <th className="p-3 text-sm font-semibold text-foreground text-center">Stock Mínimo</th>
                  <th className="p-3 text-sm font-semibold text-foreground text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors">
                    <td className="p-3 text-sm font-medium text-foreground">{product.name}</td>
                    <td className="p-3 text-sm text-foreground-muted">{product.sku || '-'}</td>
                    <td className="p-3 text-sm text-foreground-muted">{product.supplier?.name || '-'}</td>
                    <td className="p-3 text-sm text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-semibold">
                        <AlertTriangle size={14} />
                        {product.quantityStock}{product.unitType === 'WEIGHT' ? ' kg' : product.unitType === 'VOLUME' ? ' L' : ''}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-center text-foreground-muted">{product.stockMinAlert}{product.unitType === 'WEIGHT' ? ' kg' : product.unitType === 'VOLUME' ? ' L' : ''}</td>
                    <td className="p-3 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/productos/${product.id}/editar`}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-accent text-accent-foreground rounded hover:bg-accent/80 transition-colors"
                        >
                          <Edit3 size={12} />
                          Editar
                        </Link>
                        <Link
                          href={`/compras/nueva?productId=${product.id}`}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                        >
                          <PlusCircle size={12} />
                          Orden de Compra
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
