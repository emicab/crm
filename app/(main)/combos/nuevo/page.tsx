"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/types';
import { Loader2, ArrowLeft, X, Search, Info } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { debounce } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatCurrency';

const NuevoComboPage = () => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pricingMode, setPricingMode] = useState<'fixed' | 'percentage'>('fixed');
  const [fixedPrice, setFixedPrice] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [items, setItems] = useState<{ productId: number; productName: string; quantity: number; defaultPrice: number; customPrice: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchProducts = useMemo(
    () =>
      debounce(async (term: string) => {
        if (!term.trim()) { setSearchResults([]); return; }
        setSearching(true);
        try {
          const res = await fetch(`/api/products?search=${encodeURIComponent(term)}&limit=10`);
          if (res.ok) {
            const data = await res.json();
            setSearchResults((data.products || data).map((p: any) => ({
              ...p,
              priceSale: parseFloat(p.priceSale),
            })));
          }
        } catch { /* ignore */ }
        finally { setSearching(false); }
      }, 300),
    []
  );

  useEffect(() => { searchProducts(searchTerm); }, [searchTerm, searchProducts]);

  const addItem = (product: Product) => {
    if (items.some(i => i.productId === product.id)) return;
    setItems([...items, { productId: product.id, productName: product.name, quantity: 1, defaultPrice: product.priceSale, customPrice: '' }]);
    setSearchTerm('');
    setSearchResults([]);
  };

  const removeItem = (productId: number) => setItems(items.filter(i => i.productId !== productId));

  const updateItem = (productId: number, field: 'quantity' | 'customPrice', value: string) => {
    setItems(items.map(i => i.productId === productId ? { ...i, [field]: value } : i));
  };

  const totalFullPrice = items.reduce((sum, i) => {
    const unitPrice = i.customPrice ? parseFloat(i.customPrice) : i.defaultPrice;
    return sum + (unitPrice || 0) * (parseInt(i.quantity as any) || 0);
  }, 0);

  const effectivePrice = pricingMode === 'fixed'
    ? (parseFloat(fixedPrice) || 0)
    : totalFullPrice * (1 - (parseFloat(discountPercent) || 0) / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
    if (items.length === 0) { setError('Agregá al menos un producto.'); return; }
    if (effectivePrice <= 0) { setError('El precio del combo debe ser un número positivo.'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/combos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          price: effectivePrice,
          items: items.map(i => ({
            productId: i.productId,
            quantity: parseInt(i.quantity as any) || 1,
            customPrice: i.customPrice ? parseFloat(i.customPrice) : null,
          })),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al crear combo');
      }
      router.push('/combos');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-4">
        <ArrowLeft size={16} className="mr-2" /> Volver
      </Button>

      <h1 className="text-2xl font-bold text-foreground mb-6">Nuevo Combo</h1>

      <form onSubmit={handleSubmit} className="bg-muted p-6 rounded-xl shadow-lg space-y-4">
        {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded">{error}</p>}

        <Input label="Nombre" value={name} onChange={e => setName(e.target.value)} required />
        <Input label="Descripción (opcional)" value={description} onChange={e => setDescription(e.target.value)} />

        <div className="border border-border rounded-md p-4 space-y-3">
          <label className="text-sm font-medium text-foreground">Precio del Combo</label>

          <div className="flex gap-2">
            <button type="button" onClick={() => setPricingMode('fixed')}
              className={`flex-1 py-2 text-sm rounded-md font-medium transition-colors ${pricingMode === 'fixed' ? 'bg-primary text-primary-foreground' : 'bg-background border border-border text-foreground-muted'}`}>
              Precio fijo
            </button>
            <button type="button" onClick={() => setPricingMode('percentage')}
              className={`flex-1 py-2 text-sm rounded-md font-medium transition-colors ${pricingMode === 'percentage' ? 'bg-primary text-primary-foreground' : 'bg-background border border-border text-foreground-muted'}`}>
              % de descuento
            </button>
          </div>

          {pricingMode === 'fixed' ? (
            <Input type="number" step="0.01" min="0" value={fixedPrice} onChange={e => setFixedPrice(e.target.value)}
              placeholder="Ej: 500" />
          ) : (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input type="number" step="0.1" min="0" max="100" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)}
                  placeholder="Ej: 20" />
              </div>
              {totalFullPrice > 0 && (
                <p className="text-sm text-foreground-muted pb-2">
                  = {formatCurrency(effectivePrice)}
                </p>
              )}
            </div>
          )}

          {items.length > 0 && (
            <div className="flex items-center gap-2 text-sm bg-background p-2 rounded border border-border">
              <Info size={14} className="text-primary" />
              <span className="text-foreground-muted">Suma de productos:</span>
              <span className="font-semibold text-foreground">{formatCurrency(totalFullPrice)}</span>
              {effectivePrice > 0 && effectivePrice < totalFullPrice && (
                <span className="text-success text-xs">({Math.round((1 - effectivePrice / totalFullPrice) * 100)}% ahorro)</span>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Productos</label>
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              placeholder="Buscar producto para agregar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {searching && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-foreground-muted" />}
          </div>

          {searchResults.length > 0 && (
            <div className="mb-3 border border-border rounded-md bg-background max-h-40 overflow-y-auto">
              {searchResults.map(p => (
                <button key={p.id} type="button" onClick={() => addItem(p)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex justify-between">
                  <span>{p.name}</span>
                  <span className="text-foreground-muted">{formatCurrency(p.priceSale)}</span>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {items.length === 0 && <p className="text-sm text-foreground-muted">No hay productos agregados.</p>}
            {items.map(item => (
              <div key={item.productId} className="flex items-center gap-2 bg-background p-2 rounded-md border border-border">
                <span className="flex-1 text-sm font-medium">
                  {item.productName}
                  <span className="text-foreground-muted text-xs ml-1">({formatCurrency(item.defaultPrice)} c/u)</span>
                </span>
                <input type="number" min="1" value={item.quantity} onChange={e => updateItem(item.productId, 'quantity', e.target.value)}
                  className="w-16 text-center text-sm rounded border border-border bg-background p-1" title="Cantidad" />
                <input type="number" step="0.01" min="0" value={item.customPrice}
                  onChange={e => updateItem(item.productId, 'customPrice', e.target.value)}
                  className="w-24 text-sm rounded border border-border bg-background p-1" placeholder="Precio (opc)" title="Precio personalizado en el combo" />
                <button type="button" onClick={() => removeItem(item.productId)} className="text-destructive hover:text-destructive/80">
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <Button variant="primary" type="submit" disabled={saving} className="w-full">
          {saving ? 'Guardando...' : `Guardar Combo (${formatCurrency(effectivePrice)})`}
        </Button>
      </form>
    </div>
  );
};

export default NuevoComboPage;
