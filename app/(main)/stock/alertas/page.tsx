"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AlertTriangle, Loader2, Package, Edit3, PlusCircle, RefreshCw, X, ShoppingCart, CheckSquare } from 'lucide-react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import CreatePurchaseModal from '@/components/stock/CreatePurchaseModal';
import type { Supplier } from '@/types';
import { motion, AnimatePresence } from 'motion/react';

interface AlertProduct {
  id: number;
  name: string;
  sku: string | null;
  quantityStock: number;
  stockMinAlert: number | null;
  pricePurchase: number | null;
  priceSale: number;
  unitType: string | null;
  supplier?: { id: number; name: string } | null;
}

export default function StockAlertasPage() {
  const [products, setProducts] = useState<AlertProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filterSupplierId, setFilterSupplierId] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [productsToOrder, setProductsToOrder] = useState<AlertProduct[]>([]);

  const fetchAlerts = async () => {
    setLoading(true);
    setIsRefreshing(true);
    try {
      const [productsRes, suppliersRes] = await Promise.all([
        fetch('/api/products?limit=200'),
        fetch('/api/proveedores'),
      ]);
      if (!productsRes.ok) throw new Error('Error al cargar productos');
      if (suppliersRes.ok) setSuppliers(await suppliersRes.json());

      const data = await productsRes.json();
      const items: AlertProduct[] = (Array.isArray(data) ? data : data.data || [])
        .filter((p: any) => p.stockMinAlert !== null && p.stockMinAlert !== undefined && p.quantityStock < p.stockMinAlert)
        .map((p: any) => ({
          ...p,
          pricePurchase: p.pricePurchase ? parseFloat(p.pricePurchase) : null,
          priceSale: parseFloat(p.priceSale),
        }));
      setProducts(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!filterSupplierId) return products;
    return products.filter(p => p.supplier?.id === parseInt(filterSupplierId));
  }, [products, filterSupplierId]);

  const supplierOptions = useMemo(() => {
    const ids = new Set(products.map(p => p.supplier?.id).filter(Boolean) as number[]);
    return suppliers.filter(s => ids.has(s.id));
  }, [products, suppliers]);

  const allSelected = filteredProducts.length > 0 && selectedIds.size === filteredProducts.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleToggle = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddToOrder = (productId: number) => {
    const prod = products.find(p => p.id === productId);
    if (prod) {
      setProductsToOrder([prod]);
      setShowCreateModal(true);
    }
  };

  const handleOpenBatchOrder = () => {
    const list = products.filter(p => selectedIds.has(p.id));
    setProductsToOrder(list);
    setShowCreateModal(true);
  };

  const handleSuccess = () => {
    setSelectedIds(new Set());
    fetchAlerts();
  };

  return (
    <div className="w-full font-sans">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <AlertTriangle size={28} className="text-red-500 animate-pulse" />
          <h1 className="text-2xl font-bold text-foreground">Alertas de Stock</h1>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchAlerts} 
            className="flex items-center gap-2 px-3.5 py-2 text-sm bg-muted hover:bg-background border border-border rounded-xl transition-all shadow-sm duration-200"
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} /> Actualizar
          </button>
          <Link href="/compras/nueva" className="flex items-center gap-2 px-3.5 py-2 text-sm bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all shadow-md font-medium">
            <PlusCircle size={16} /> Nueva Compra
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-muted rounded-2xl border border-border shadow-inner">
          <Package size={48} className="mx-auto text-success/60 mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Todo en orden</h2>
          <p className="text-foreground-muted mt-2 text-sm">No hay productos por debajo del stock mínimo.</p>
        </div>
      ) : (
        <div className="bg-muted rounded-2xl border border-border overflow-hidden shadow-md">
          <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-background/40">
            <p className="text-sm text-foreground-muted font-medium whitespace-nowrap">
              {products.length} producto{products.length !== 1 ? 's' : ''} por debajo del stock mínimo
              {filterSupplierId && ` (${filteredProducts.length} filtrados)`}
            </p>
            <div className="w-full sm:w-64">
              <Select
                name="supplierFilter"
                value={filterSupplierId}
                onChange={(e) => { setFilterSupplierId(e.target.value); setSelectedIds(new Set()); }}
                aria-label="Filtrar por proveedor"
                className="text-sm rounded-xl"
              >
                <option value="">Todos los proveedores</option>
                {supplierOptions.map(s => (
                  <option key={s.id} value={String(s.id)}>{s.name}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="border-b border-border bg-background/10">
                <tr>
                  <th className="p-3 sm:p-4 w-10">
                    <input type="checkbox" checked={allSelected} onChange={handleSelectAll} className="rounded border-border bg-background" />
                  </th>
                  <th className="p-3 sm:p-4 text-sm font-bold text-foreground">Producto</th>
                  <th className="p-3 sm:p-4 text-sm font-bold text-foreground hidden sm:table-cell">SKU</th>
                  <th className="p-3 sm:p-4 text-sm font-bold text-foreground hidden md:table-cell">Proveedor</th>
                  <th className="p-3 sm:p-4 text-sm font-bold text-foreground text-center">Stock Alerta</th>
                  <th className="p-3 sm:p-4 text-sm font-bold text-foreground text-center">Mínimo</th>
                  <th className="p-3 sm:p-4 text-sm font-bold text-foreground text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const stockRatio = Math.min(100, Math.max(0, (product.quantityStock / (product.stockMinAlert || 1)) * 100));
                  return (
                    <tr key={product.id} className="border-b border-border/40 last:border-b-0 hover:bg-background/40 transition-colors">
                      <td className="p-3 sm:p-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(product.id)}
                          onChange={() => handleToggle(product.id)}
                          className="rounded border-border bg-background"
                        />
                      </td>
                      <td className="p-3 sm:p-4 text-sm font-semibold text-foreground">{product.name}</td>
                      <td className="p-3 sm:p-4 text-sm text-foreground-muted hidden sm:table-cell font-mono text-xs">{product.sku || '-'}</td>
                      <td className="p-3 sm:p-4 text-sm text-foreground-muted hidden md:table-cell">{product.supplier?.name || '-'}</td>
                      <td className="p-3 sm:p-4 text-sm text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-500 text-xs font-bold">
                            <AlertTriangle size={11} className="text-red-500 animate-pulse" />
                            {product.quantityStock} {product.unitType === 'WEIGHT' ? 'kg' : product.unitType === 'VOLUME' ? 'L' : 'u'}
                          </span>
                          <div className="w-16 h-1.5 bg-border/80 rounded-full overflow-hidden mt-0.5">
                            <div 
                              className="bg-red-500 h-full rounded-full" 
                              style={{ width: `${stockRatio}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 text-sm text-center text-foreground-muted font-medium">
                        {product.stockMinAlert} {product.unitType === 'WEIGHT' ? 'kg' : product.unitType === 'VOLUME' ? 'L' : 'u'}
                      </td>
                      <td className="p-3 sm:p-4 text-sm text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleAddToOrder(product.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-medium shadow-sm hover:scale-105 active:scale-95"
                            title="Agregar a orden de compra"
                          >
                            <ShoppingCart size={12} />
                            <span>Pedido</span>
                          </button>
                          <Link
                            href={`/productos/${product.id}/editar`}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-all font-medium border border-border/50 hover:scale-105 active:scale-95"
                          >
                            <Edit3 size={12} />
                            <span>Editar</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && filterSupplierId && (
            <div className="text-center py-8 text-foreground-muted text-sm">
              No hay alertas de stock para este proveedor.
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed bottom-[20px] left-4 md:left-[272px] right-4 z-40 p-4 bg-muted/95 border border-border shadow-2xl rounded-2xl backdrop-blur-md"
          >
            <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckSquare size={20} className="text-primary animate-bounce" />
                <span className="text-sm font-semibold text-foreground">
                  {selectedIds.size} producto{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="p-1 rounded-full hover:bg-border transition-colors text-foreground-muted hover:text-foreground"
                >
                  <X size={16} />
                </button>
              </div>
              <Button variant="primary" onClick={handleOpenBatchOrder} className="shadow-lg hover:scale-102 active:scale-98">
                <ShoppingCart size={16} className="mr-1.5" />
                Crear Orden de Compra ({selectedIds.size})
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CreatePurchaseModal
        isOpen={showCreateModal}
        products={productsToOrder}
        suppliers={suppliers}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
