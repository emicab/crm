"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Purchase, PurchaseItem, Product } from '@/types';
import { Loader2, AlertCircle, ArrowLeft, Truck, ShoppingBag, FileText, CreditCard, Edit3, Trash2, MessageSquare, CheckCircle, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import Input from '@/components/ui/Input';
import { formatCurrency } from '@/lib/formatCurrency';
import { formatDate } from '@/lib/formatDate';
import { getPaymentTypeDisplay } from '@/lib/displayTexts';
import toast from 'react-hot-toast';

interface PurchaseItemDetail extends Omit<PurchaseItem, 'product'> {
  product: Product | null;
  subtotal: number;
}
interface PurchaseDetail extends Omit<Purchase, 'items' | 'totalAmount'> {
  items: PurchaseItemDetail[];
  totalAmount: number;
}

interface ReceiveItem {
  productId: number;
  productName: string;
  orderedQty: number;
  receivedQty: number;
  purchasePrice: number;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    PENDING: 'bg-foreground-muted/20 text-foreground-muted',
    ORDERED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    RECEIVED: 'bg-success/20 text-success',
    CANCELLED: 'bg-destructive/20 text-destructive',
  };
  const labels: Record<string, string> = {
    PENDING: 'Pendiente',
    ORDERED: 'Enviada',
    RECEIVED: 'Recibida',
    CANCELLED: 'Cancelada',
  };
  return { cls: map[status] || 'bg-foreground-muted/20 text-foreground-muted', label: labels[status] || status };
};

const PurchaseDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const purchaseId = params?.id as string;

  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Receive modal
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveItems, setReceiveItems] = useState<ReceiveItem[]>([]);
  const [receiveSearchTerm, setReceiveSearchTerm] = useState('');
  const [receiveSearchResults, setReceiveSearchResults] = useState<Product[]>([]);

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
        } finally {
          setLoading(false);
        }
      };
      fetchPurchaseDetail();
    }
  }, [purchaseId]);

  // Search products for receive modal
  useEffect(() => {
    if (!receiveSearchTerm.trim()) { setReceiveSearchResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(receiveSearchTerm)}`);
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : data.data || [];
          setReceiveSearchResults(items.map((p: any) => ({ ...p, pricePurchase: parseFloat(p.pricePurchase) || 0, priceSale: parseFloat(p.priceSale) })).slice(0, 5));
        }
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [receiveSearchTerm]);

  const handleDelete = async () => {
    if (!purchase) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/compras/${purchase.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Error al eliminar');
      router.push('/compras');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
      setShowConfirm(false);
    } finally { setDeleting(false); }
  };

  const handleSendOrderWhatsApp = () => {
    if (!purchase) return;
    const phone = purchase.supplier?.phone;
    if (!phone) { toast.error('El proveedor no tiene teléfono registrado.'); return; }
    const lines = purchase.items.map(i => `- ${i.product?.name || `#${i.productId}`}: ${i.quantity} x ${formatCurrency(i.purchasePrice)}`);
    const msg = `Hola ${purchase.supplier?.name || ''}, te hago el pedido:\n\n${lines.join('\n')}\n\nTotal: ${formatCurrency(purchase.totalAmount)}\n\nSaludos!`;
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    updateStatus('ORDERED');
  };

  const updateStatus = async (newStatus: string) => {
    if (!purchase) return;
    try {
      const res = await fetch(`/api/compras/${purchase.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Error al actualizar estado');
      const updated = await res.json();
      setPurchase({ ...updated, totalAmount: parseFloat(updated.totalAmount), items: updated.items.map((i: any) => ({ ...i, purchasePrice: parseFloat(i.purchasePrice), subtotal: parseFloat(i.purchasePrice) * i.quantity })) });
      toast.success(newStatus === 'ORDERED' ? 'Pedido marcado como enviado.' : newStatus === 'PENDING' ? 'Pedido revertido a pendiente.' : 'Estado actualizado.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar estado.');
    }
  };

  const openReceiveModal = () => {
    if (!purchase) return;
    setReceiveItems(purchase.items.map(i => ({
      productId: i.productId,
      productName: i.product?.name || `#${i.productId}`,
      orderedQty: i.quantity,
      receivedQty: i.quantity,
      purchasePrice: i.purchasePrice,
    })));
    setShowReceiveModal(true);
  };

  const handleReceiveQtyChange = (productId: number, value: string) => {
    const qty = parseFloat(value.replace(',', '.'));
    if (isNaN(qty) || qty < 0) return;
    setReceiveItems(prev => prev.map(i => i.productId === productId ? { ...i, receivedQty: qty } : i));
  };

  const handleRemoveReceiveItem = (productId: number) => {
    setReceiveItems(prev => prev.filter(i => i.productId !== productId));
  };

  const handleAddReceiveProduct = (product: Product) => {
    if (receiveItems.some(i => i.productId === product.id)) {
      toast.error('Ese producto ya está en la lista.');
      return;
    }
    setReceiveItems(prev => [...prev, {
      productId: product.id,
      productName: product.name,
      orderedQty: 0,
      receivedQty: 1,
      purchasePrice: product.pricePurchase || 0,
    }]);
    setReceiveSearchTerm('');
    setReceiveSearchResults([]);
  };

  const handleConfirmReceive = async () => {
    if (!purchase) return;
    const validItems = receiveItems.filter(i => i.receivedQty > 0);
    if (validItems.length === 0) { toast.error('Agregá al menos un producto con cantidad recibida.'); return; }

    const itemsPayload = validItems.map(i => ({
      productId: i.productId,
      quantity: i.orderedQty,
      quantityReceived: i.receivedQty,
      purchasePrice: i.purchasePrice,
    }));

    try {
      const res = await fetch(`/api/compras/${purchase.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RECEIVED', items: itemsPayload }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Error al recibir');
      const updated = await res.json();
      setPurchase({ ...updated, totalAmount: parseFloat(updated.totalAmount), items: updated.items.map((i: any) => ({ ...i, purchasePrice: parseFloat(i.purchasePrice), subtotal: parseFloat(i.purchasePrice) * i.quantity })) });
      setShowReceiveModal(false);
      toast.success('¡Compra recibida! Stock actualizado.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al recibir la compra.');
    }
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

  const statusInfo = statusBadge(purchase.status);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft size={16} className="mr-2" />
          Volver
        </Button>
        <div className="flex gap-2">
          {purchase.status === 'PENDING' && (
            <>
              <Button variant="outline" size="sm" onClick={() => updateStatus('ORDERED')}>
                <CheckCircle size={16} className="mr-2" />
                Marcar como Enviada
              </Button>
              {purchase.supplier?.phone && (
                <Button variant="whatsapp" size="sm" onClick={handleSendOrderWhatsApp}>
                  <MessageSquare size={16} className="mr-2" />
                  Enviar Pedido (WhatsApp)
                </Button>
              )}
            </>
          )}
          {purchase.status === 'ORDERED' && (
            <>
              <Button variant="primary" size="sm" onClick={openReceiveModal}>
                <CheckCircle size={16} className="mr-2" />
                Recibir Pedido
              </Button>
              <Button variant="outline" size="sm" onClick={() => updateStatus('PENDING')}>
                Revertir a Pendiente
              </Button>
            </>
          )}
          <Link href={`/compras/${purchaseId}/editar`}>
            <Button variant="primary" size="sm">
              <Edit3 size={16} className="mr-2" />
              Editar
            </Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={() => setShowConfirm(true)} disabled={deleting}>
            <Trash2 size={16} className="mr-2" />
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-muted p-6 rounded-xl shadow-xl max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-2">¿Eliminar compra?</h3>
            <p className="text-sm text-foreground-muted mb-4">
              Se revertirá el stock de los productos y se eliminarán el gasto y movimiento de caja asociados.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)} disabled={deleting}>Cancelar</Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>{deleting ? 'Eliminando...' : 'Eliminar'}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-muted p-6 sm:p-8 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 pb-6 border-b border-border">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-1">Compra #{purchase.id}</h1>
            <p className="text-sm text-foreground-muted">Registrada el: {formatDate(purchase.purchaseDate)}</p>
            <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.cls}`}>
              {statusInfo.label}
            </span>
            {purchase.status === 'RECEIVED' && purchase.items.some(i => i.quantityReceived != null && i.quantityReceived < i.quantity) && (
              <p className="text-xs text-foreground-muted mt-1">Recibido parcialmente</p>
            )}
          </div>
          <div className="text-right mt-4 sm:mt-0">
            <p className="text-sm text-foreground-muted">Costo Total</p>
            <p className="text-3xl font-bold text-foreground">{formatCurrency(purchase.totalAmount)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
          <div>
            <h3 className="text-sm font-medium text-foreground-muted mb-1 flex items-center"><Truck size={16} className="mr-2 text-primary" />Proveedor</h3>
            <p className="text-foreground font-medium">{purchase.supplier?.name || 'N/A'}{purchase.supplier?.phone && <span className="text-xs text-foreground-muted ml-2">({purchase.supplier.phone})</span>}</p>
          </div>
          {purchase.invoiceNumber && (
            <div>
              <h3 className="text-sm font-medium text-foreground-muted mb-1 flex items-center"><FileText size={16} className="mr-2 text-primary"/>Nº de Factura</h3>
              <p className="text-foreground font-medium">{purchase.invoiceNumber}</p>
            </div>
          )}
          {purchase.paymentType && (
            <div>
              <h3 className="text-sm font-medium text-foreground-muted mb-1 flex items-center"><CreditCard size={16} className="mr-2 text-primary"/>Medio de Pago</h3>
              <p className="text-foreground font-medium">{getPaymentTypeDisplay(purchase.paymentType)}</p>
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
            <ShoppingBag size={20} className="mr-2 text-primary"/>Ítems
          </h2>
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-left">
              <thead className="bg-slate-100 dark:bg-slate-700">
                <tr>
                  <th className="p-3 text-sm font-semibold text-foreground">Producto</th>
                  <th className="p-3 text-sm font-semibold text-foreground text-center">Pedido</th>
                  {purchase.status === 'RECEIVED' && <th className="p-3 text-sm font-semibold text-foreground text-center">Recibido</th>}
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
                    {purchase.status === 'RECEIVED' && (
                      <td className="p-3 text-sm text-center">
                        <span className={item.quantityReceived != null && item.quantityReceived < item.quantity ? 'text-destructive font-semibold' : 'text-foreground'}>
                          {item.quantityReceived ?? item.quantity}
                        </span>
                      </td>
                    )}
                    <td className="p-3 text-sm text-foreground text-right">{formatCurrency(item.purchasePrice)}</td>
                    <td className="p-3 text-sm text-foreground font-semibold text-right">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Receive Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowReceiveModal(false)}>
          <div className="bg-muted text-foreground rounded-lg shadow-xl w-full max-w-3xl m-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Recibir Pedido</h3>
                <button onClick={() => setShowReceiveModal(false)} className="p-1 rounded-full hover:bg-border text-foreground-muted"><X size={20} /></button>
              </div>

              <table className="w-full text-left mb-4">
                <thead className="border-b border-border">
                  <tr>
                    <th className="p-2 text-sm font-semibold">Producto</th>
                    <th className="p-2 text-sm font-semibold text-center">Pedido</th>
                    <th className="p-2 text-sm font-semibold text-center">Recibido</th>
                    <th className="p-2 text-sm font-semibold text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {receiveItems.map((item) => (
                    <tr key={item.productId} className="border-b border-border">
                      <td className="p-2 text-sm">{item.productName}</td>
                      <td className="p-2 text-sm text-center">{item.orderedQty}</td>
                      <td className="p-2 text-sm text-center">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={String(item.receivedQty)}
                          onChange={(e) => handleReceiveQtyChange(item.productId, e.target.value)}
                          className="w-24 h-8 py-1 text-center inline-block"
                        />
                      </td>
                      <td className="p-2 text-sm text-center">
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveReceiveItem(item.productId)} className="h-8 w-8">
                          <X size={14} className="text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Add new product to receive */}
              <div className="relative mb-4">
                <div className="flex gap-2 items-center">
                  <Input
                    type="text"
                    placeholder="Agregar producto que no estaba en el pedido..."
                    value={receiveSearchTerm}
                    onChange={(e) => setReceiveSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                </div>
                {receiveSearchResults.length > 0 && (
                  <ul className="absolute z-10 w-full bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                    {receiveSearchResults.map(p => (
                      <li key={p.id} onClick={() => handleAddReceiveProduct(p)} className="px-3 py-2 hover:bg-muted cursor-pointer text-sm flex justify-between">
                        <span>{p.name}</span>
                        <span className="text-foreground-muted">{formatCurrency(p.pricePurchase || 0)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowReceiveModal(false)}>Cancelar</Button>
                <Button type="button" variant="primary" onClick={handleConfirmReceive}>
                  <CheckCircle size={16} className="mr-2" />
                  Confirmar Recepción
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseDetailPage;