"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PaymentTypeEnum as PaymentTypeEnumType } from '@/types';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import { Loader2, ArrowLeft, Save, ShoppingBag, Trash2, PlusCircle } from 'lucide-react';
import { getPaymentTypeDisplay } from '@/lib/displayTexts';
import toast from 'react-hot-toast';

interface EditableItem {
  productId: number;
  productName: string;
  quantity: number;
  purchasePrice: number;
  subtotal: number;
}

export default function EditarCompraPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [form, setForm] = useState({
    supplierId: '',
    paymentType: '',
    invoiceNumber: '',
    notes: '',
    status: '',
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/compras/${id}`).then(r => r.ok ? r.json() : null),
      fetch('/api/proveedores').then(r => r.ok ? r.json() : []),
    ]).then(([purchase, suppliersData]) => {
      if (!purchase) {
        toast.error('Compra no encontrada.');
        router.push('/compras');
        return;
      }
      setSuppliers(suppliersData);
      setForm({
        supplierId: String(purchase.supplierId),
        paymentType: purchase.paymentType || '',
        invoiceNumber: purchase.invoiceNumber || '',
        notes: purchase.notes || '',
        status: purchase.status,
      });
      setItems(purchase.items.map((item: any) => ({
        productId: item.productId,
        productName: item.product?.name || `Producto #${item.productId}`,
        quantity: item.quantity,
        purchasePrice: parseFloat(item.purchasePrice),
        subtotal: item.quantity * parseFloat(item.purchasePrice),
      })));
      setLoading(false);
    }).catch(() => {
      toast.error('Error al cargar datos.');
      router.push('/compras');
    });
  }, [id, router]);

  // Búsqueda de productos
  useEffect(() => {
    if (!productSearch.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(productSearch)}`);
        if (res.ok) {
          const data = await res.json();
          const inCartIds = items.map(i => i.productId);
          setSearchResults((Array.isArray(data) ? data : data.data || []).filter((p: any) => !inCartIds.includes(p.id)).slice(0, 5));
        }
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch, items]);

  const addProduct = (product: any) => {
    setItems(prev => [...prev, {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      purchasePrice: parseFloat(product.pricePurchase) || 0,
      subtotal: parseFloat(product.pricePurchase) || 0,
    }]);
    setProductSearch('');
    setSearchResults([]);
  };

  const updateItem = (productId: number, field: 'quantity' | 'purchasePrice', value: number) => {
    setItems(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      const updated = { ...item, [field]: value };
      updated.subtotal = updated.quantity * updated.purchasePrice;
      return updated;
    }));
  };

  const removeItem = (productId: number) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  };

  const total = items.reduce((sum, i) => sum + i.subtotal, 0);

  const handleSave = async () => {
    if (!form.supplierId) { toast.error('Seleccioná un proveedor.'); return; }
    if (items.length === 0) { toast.error('Agregá al menos un producto.'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/compras/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: parseInt(form.supplierId),
          paymentType: form.paymentType || null,
          invoiceNumber: form.invoiceNumber.trim() || null,
          notes: form.notes.trim() || null,
          status: form.status,
          items: items.map(i => ({ productId: i.productId, quantity: i.quantity, purchasePrice: i.purchasePrice })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al guardar');
      }
      toast.success('Compra actualizada correctamente.');
      router.push(`/compras/${id}`);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 size={32} className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-6">
        <ArrowLeft size={16} className="mr-2" /> Volver
      </Button>

      <div className="bg-muted p-6 sm:p-8 rounded-xl shadow space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Editar Compra #{id}</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label="Proveedor *" value={form.supplierId} onChange={(e) => handleChange('supplierId', e.target.value)} required>
            <option value="">Selecciona un proveedor</option>
            {suppliers.map((s: any) => (
              <option key={s.id} value={String(s.id)}>{s.name}</option>
            ))}
          </Select>
          <Select label="Medio de Pago" value={form.paymentType} onChange={(e) => handleChange('paymentType', e.target.value)}>
            <option value="">Sin medio de pago</option>
            {Object.values(PaymentTypeEnumType).map((type) => (
              <option key={type} value={type}>{getPaymentTypeDisplay(type)}</option>
            ))}
          </Select>
          <Input label="Nº de Factura" value={form.invoiceNumber} onChange={(e) => handleChange('invoiceNumber', e.target.value)} />
          <Select label="Estado" value={form.status} onChange={(e) => handleChange('status', e.target.value)} required>
            <option value="PENDING">Pendiente</option>
            <option value="RECEIVED">Recibido</option>
            <option value="CANCELLED">Cancelado</option>
          </Select>
        </div>

        {/* Productos */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="bg-background px-4 py-2 border-b border-border flex items-center gap-2 text-sm font-medium text-foreground">
            <ShoppingBag size={16} className="text-primary" />
            Productos ({items.length})
          </div>

          {items.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left font-medium text-foreground-muted">Producto</th>
                  <th className="p-2 text-center font-medium text-foreground-muted w-20">Cant.</th>
                  <th className="p-2 text-right font-medium text-foreground-muted w-28">Costo Unit.</th>
                  <th className="p-2 text-right font-medium text-foreground-muted w-28">Subtotal</th>
                  <th className="p-2 text-center w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.productId} className="border-t border-border">
                    <td className="p-2 text-foreground font-medium">{item.productName}</td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.productId, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full h-8 text-center bg-background border border-border rounded text-sm"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.purchasePrice}
                        onChange={(e) => updateItem(item.productId, 'purchasePrice', parseFloat(e.target.value) || 0)}
                        className="w-full h-8 text-right bg-background border border-border rounded text-sm"
                      />
                    </td>
                    <td className="p-2 text-right font-semibold text-foreground">{formatCurrency(item.subtotal)}</td>
                    <td className="p-2 text-center">
                      <button onClick={() => removeItem(item.productId)} className="text-destructive hover:text-destructive/80 p-1">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {items.length === 0 && (
            <div className="p-4 text-center text-sm text-foreground-muted">No hay productos en esta compra.</div>
          )}

          <div className="p-3 border-t border-border bg-background">
            <p className="text-right text-lg font-bold text-foreground">Total: {formatCurrency(total)}</p>
          </div>
        </div>

        {/* Agregar producto */}
        <div className="relative">
          <Input
            label="Agregar producto"
            placeholder="Buscar producto por nombre..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            autoComplete="off"
          />
          {searchResults.length > 0 && (
            <ul className="absolute z-10 w-full bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
              {searchResults.map((p: any) => (
                <li key={p.id} onClick={() => addProduct(p)} className="px-3 py-2 hover:bg-muted cursor-pointer text-sm flex justify-between">
                  <span>{p.name}</span>
                  <span className="text-foreground-muted">{formatCurrency(parseFloat(p.priceSale))}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground-muted mb-1.5">Notas</label>
          <textarea rows={3} value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} className="block w-full rounded-md border border-border bg-background" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => router.back()} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save size={16} className="mr-2" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}
