// app/compras/[id]/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Purchase, PurchaseItem, Product } from '@/types';
import { Loader2, AlertCircle, ArrowLeft, UserCircle, Truck, ShoppingBag, FileText } from 'lucide-react';
import Button from '@/components/ui/Button';

// Interfaces para asegurar el tipado correcto de los datos anidados
interface PurchaseItemDetail extends Omit<PurchaseItem, 'product'> {
  product: Product | null;
  subtotal: number; // Calcularemos esto en el frontend
}
interface PurchaseDetail extends Omit<Purchase, 'items' | 'totalAmount'> {
  items: PurchaseItemDetail[];
  totalAmount: number;
}

const PurchaseDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const purchaseId = params.id as string;

  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (purchaseId) {
      const fetchPurchaseDetail = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/compras/${purchaseId}`);
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Compra no encontrada o error al cargar (${response.status})`);
          }
          const data = await response.json();
          // Convertir strings numéricos a números y calcular subtotales
          setPurchase({
            ...data,
            totalAmount: parseFloat(data.totalAmount),
            items: data.items.map((item: any) => ({
              ...item,
              purchasePrice: parseFloat(item.purchasePrice),
              subtotal: parseFloat(item.purchasePrice) * item.quantity 
            }))
          });
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
          console.error("Error fetching purchase detail:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchPurchaseDetail();
    }
  }, [purchaseId]);

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '-';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Fecha no disponible';
    return new Date(dateString).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 size={32} className="animate-spin text-primary" /></div>;
  if (error) return (
    <div className="text-center p-8">
      <AlertCircle size={48} className="text-destructive mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-destructive mb-2">Error al Cargar la Compra</h2>
      <p className="text-foreground-muted mb-4">{error}</p>
      <Button variant="outline" onClick={() => router.push('/compras')}>Volver al Historial</Button>
    </div>
  );
  if (!purchase) return <p className="text-center text-foreground-muted">No se encontraron datos para esta compra.</p>;

  return (
    <div className="max-w-4xl mx-auto">
      <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-6">
        <ArrowLeft size={16} className="mr-2" />
        Volver
      </Button>

      <div className="bg-muted p-6 sm:p-8 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 pb-6 border-b border-border">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-1">Compra #{purchase.id}</h1>
            <p className="text-sm text-foreground-muted">Registrada el: {formatDate(purchase.purchaseDate)}</p>
            <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                        ${purchase.status === 'RECEIVED' ? 'bg-success/20 text-success' : 'bg-amber-100 text-amber-800'}`}>
              Estado: {purchase.status}
            </span>
          </div>
          <div className="text-right mt-4 sm:mt-0">
            <p className="text-sm text-foreground-muted">Costo Total</p>
            <p className="text-3xl font-bold text-foreground">{formatCurrency(purchase.totalAmount)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
          <div>
            <h3 className="text-sm font-medium text-foreground-muted mb-1 flex items-center"><Truck size={16} className="mr-2 text-primary" />Proveedor</h3>
            <p className="text-foreground font-medium">{purchase.supplier?.name || 'N/A'}</p>
          </div>
          {purchase.invoiceNumber && (
            <div>
              <h3 className="text-sm font-medium text-foreground-muted mb-1 flex items-center"><FileText size={16} className="mr-2 text-primary"/>Nº de Factura</h3>
              <p className="text-foreground font-medium">{purchase.invoiceNumber}</p>
            </div>
          )}
          {purchase.notes && (
             <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-foreground-muted mb-1">Notas Adicionales</h3>
              <p className="text-sm text-foreground bg-background p-3 rounded-md border border-border">{purchase.notes}</p>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center">
            <ShoppingBag size={20} className="mr-2 text-primary"/>Ítems Comprados ({purchase.items.length})
          </h2>
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-left">
              <thead className="bg-slate-100 dark:bg-slate-700">
                <tr>
                  <th className="p-3 text-sm font-semibold text-foreground">Producto</th>
                  <th className="p-3 text-sm font-semibold text-foreground text-center">Cantidad</th>
                  <th className="p-3 text-sm font-semibold text-foreground text-right">Costo Unit.</th>
                  <th className="p-3 text-sm font-semibold text-foreground text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {purchase.items.map((item, index) => (
                  <tr key={item.id || index} className="border-b border-border last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="p-3 text-sm text-foreground font-medium">
                      {item.product?.name || 'Producto no disponible'}
                      {item.product?.sku && <span className="block text-xs text-foreground-muted">SKU: {item.product.sku}</span>}
                    </td>
                    <td className="p-3 text-sm text-foreground text-center">{item.quantity}</td>
                    <td className="p-3 text-sm text-foreground text-right">{formatCurrency(item.purchasePrice)}</td>
                    <td className="p-3 text-sm text-foreground font-semibold text-right">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseDetailPage;