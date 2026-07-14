// components/compras/PurchaseHistoryTable.tsx
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import type { Purchase } from '@/types';
import { Loader2, AlertCircle, Eye, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/formatCurrency';
import { formatDate } from '@/lib/formatDate';
import { getPaymentTypeDisplay } from '@/lib/displayTexts';

const PurchaseHistoryTable = () => {
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/compras');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }
      const data = await response.json();
      // Convertir montos a número
      setPurchases(data.map((p: any) => ({
        ...p,
        totalAmount: parseFloat(p.totalAmount),
      })));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar el historial de compras.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const handleViewDetails = (purchaseId: number) => {
    router.push(`/compras/${purchaseId}`);
  };

  const handleDelete = async () => {
    if (deleteTarget === null) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/compras/${deleteTarget}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al eliminar la compra.');
      }
      setDeleteTarget(null);
      fetchPurchases();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la compra.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };



  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="ml-2 text-foreground-muted">Cargando historial de compras...</p>
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left">
          <thead className="border-b border-border">
            <tr>
              <th className="p-3 text-sm font-semibold text-foreground">ID Compra</th>
              <th className="p-3 text-sm font-semibold text-foreground">Fecha</th>
              <th className="p-3 text-sm font-semibold text-foreground">Proveedor</th>
              <th className="p-3 text-sm font-semibold text-foreground">Nº Factura</th>
              <th className="p-3 text-sm font-semibold text-foreground">Pago</th>
              <th className="p-3 text-sm font-semibold text-foreground text-center">Nº Ítems</th>
              <th className="p-3 text-sm font-semibold text-foreground text-center">Estado</th>
              <th className="p-3 text-sm font-semibold text-foreground text-right">Monto Total</th>
              <th className="p-3 text-sm font-semibold text-foreground text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 && !loading ? (
              <tr>
                <td colSpan={9} className="text-center text-foreground-muted py-8">
                  No hay compras registradas todavía.
                </td>
              </tr>
            ) : (
              purchases.map((purchase) => (
                <tr key={purchase.id} className="border-b border-border last:border-b-0 hover:bg-background transition-colors">
                  <td className="p-3 text-sm text-foreground font-medium">#{purchase.id}</td>
                  <td className="p-3 text-sm text-foreground-muted">{formatDate(purchase.purchaseDate)}</td>
                  <td className="p-3 text-sm text-foreground-muted">{purchase.supplier?.name || 'N/A'}</td>
                  <td className="p-3 text-sm text-foreground-muted">{purchase.invoiceNumber || '-'}</td>
                  <td className="p-3 text-sm text-foreground-muted">{purchase.paymentType ? getPaymentTypeDisplay(purchase.paymentType) : '-'}</td>
                  <td className="p-3 text-sm text-foreground-muted text-center">{purchase.items.length}</td>
                  <td className="p-3 text-sm text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                        ${purchase.status === 'RECEIVED' ? 'bg-success/20 text-success' : 'bg-amber-100 text-amber-800'}`}>
                      {purchase.status} {/* Podríamos traducir esto también con un helper */}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-foreground font-semibold text-right">{formatCurrency(purchase.totalAmount)}</td>
                  <td className="p-3 text-sm text-center">
                    <div className="flex justify-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleViewDetails(purchase.id)} 
                        title="Ver detalles de la compra"
                      >
                        <Eye size={16} className="text-primary" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setDeleteTarget(purchase.id)} 
                        title="Eliminar compra"
                      >
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

      {deleteTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-muted p-6 rounded-xl shadow-xl max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-2">¿Eliminar compra #{deleteTarget}?</h3>
            <p className="text-sm text-foreground-muted mb-4">
              Se revertirá el stock de los productos y se eliminarán el gasto y movimiento de caja asociados. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseHistoryTable;