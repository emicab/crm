"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Product, Category, PromotionCondition } from '@/types';
import { Loader2, ArrowLeft, Plus, X, Search } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { debounce } from '@/lib/utils';

const NuevaPromocionPage = () => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('BUY_X_GET_Y');
  const [discountType, setDiscountType] = useState('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [maxDiscountQty, setMaxDiscountQty] = useState('');
  const [priority, setPriority] = useState('0');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [conditions, setConditions] = useState<{ productId?: number; productName?: string; categoryId?: number; categoryName?: string; minQuantity: number }[]>([]);
  const [searchType, setSearchType] = useState<'product' | 'category'>('product');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchItems = useCallback(
    debounce(async (term: string) => {
      if (!term.trim()) { setSearchResults([]); return; }
      setSearching(true);
      try {
        if (searchType === 'product') {
          const res = await fetch(`/api/products?search=${encodeURIComponent(term)}&limit=10`);
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data.products || data);
          }
        } else {
          const res = await fetch(`/api/categories?search=${encodeURIComponent(term)}&limit=10`);
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data.categories || data || []);
          }
        }
      } catch { /* ignore */ }
      finally { setSearching(false); }
    }, 300),
    [searchType]
  );

  useEffect(() => { searchItems(searchTerm); }, [searchTerm, searchType]);

  const addCondition = (item: any) => {
    const exists = conditions.some(c =>
      searchType === 'product' ? c.productId === item.id : c.categoryId === item.id
    );
    if (exists) return;
    setConditions([...conditions, {
      ...(searchType === 'product' ? { productId: item.id, productName: item.name } : { categoryId: item.id, categoryName: item.name }),
      minQuantity: 1,
    }]);
    setSearchTerm('');
    setSearchResults([]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateConditionQty = (index: number, qty: string) => {
    setConditions(conditions.map((c, i) => i === index ? { ...c, minQuantity: parseInt(qty) || 1 } : c));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
    if (!discountValue || parseFloat(discountValue) <= 0) { setError('El valor del descuento debe ser un número positivo.'); return; }
    if ((type === 'BUY_X_GET_Y' || type === 'SET_DISCOUNT') && conditions.length === 0) {
      setError('Agregá al menos una condición (producto o categoría).');
      return;
    }

    setSaving(true);
    try {
      const body: any = {
        name: name.trim(),
        description: description.trim() || null,
        type,
        discountType,
        discountValue: parseFloat(discountValue),
        minQuantity: minQuantity || null,
        maxDiscountQty: maxDiscountQty || null,
        priority: parseInt(priority) || 0,
        startDate: startDate || null,
        endDate: endDate || null,
        conditions: conditions.map(c => ({
          productId: c.productId || null,
          categoryId: c.categoryId || null,
          minQuantity: c.minQuantity || 1,
        })),
      };

      const res = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al crear promoción');
      }
      router.push('/promociones');
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

      <h1 className="text-2xl font-bold text-foreground mb-6">Nueva Promoción</h1>

      <form onSubmit={handleSubmit} className="bg-muted p-6 rounded-xl shadow-lg space-y-4">
        {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded">{error}</p>}

        <Input label="Nombre" value={name} onChange={e => setName(e.target.value)} required />
        <Input label="Descripción (opcional)" value={description} onChange={e => setDescription(e.target.value)} />

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Tipo de Promoción</label>
          <select value={type} onChange={e => setType(e.target.value)}
            className="w-full rounded-md border border-border bg-background text-foreground p-2 text-sm">
            <option value="BUY_X_GET_Y">2x1 / Lleva N, paga M</option>
            <option value="SET_DISCOUNT">Descuento por conjunto (A+B)</option>
            <option value="THRESHOLD">Descuento por umbral de total</option>
          </select>
        </div>

        {type === 'THRESHOLD' && (
          <Input label="Umbral mínimo ($)" type="number" step="0.01" min="0" value={minQuantity} onChange={e => setMinQuantity(e.target.value)}
            placeholder="Ej: 1000" />
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Tipo de Descuento</label>
            <select value={discountType} onChange={e => setDiscountType(e.target.value)}
              className="w-full rounded-md border border-border bg-background text-foreground p-2 text-sm">
              <option value="PERCENTAGE">Porcentaje (%)</option>
              <option value="FIXED_AMOUNT">Monto fijo ($)</option>
            </select>
          </div>
          <Input label="Valor" type="number" step="0.01" min="0" value={discountValue} onChange={e => setDiscountValue(e.target.value)}
            placeholder={discountType === 'PERCENTAGE' ? 'Ej: 10' : 'Ej: 500'} required />
        </div>

        {type === 'BUY_X_GET_Y' && (
          <Input label="Máx. unidades con descuento (opcional)" type="number" min="1" value={maxDiscountQty}
            onChange={e => setMaxDiscountQty(e.target.value)} placeholder="Ej: 1 (para 2x1)" />
        )}

        <Input label="Prioridad (mayor = se evalúa primero)" type="number" value={priority} onChange={e => setPriority(e.target.value)} />

        <div className="grid grid-cols-2 gap-4">
          <Input label="Válido desde (opcional)" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <Input label="Válido hasta (opcional)" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Condiciones {type === 'THRESHOLD' ? '(opcional - productos/categorías excluidos del umbral)' : '(productos o categorías que activan la promo)'}
          </label>

          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => setSearchType('product')}
              className={`px-3 py-1 text-xs rounded-full ${searchType === 'product' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground-muted border'}`}>
              Productos
            </button>
            <button type="button" onClick={() => setSearchType('category')}
              className={`px-3 py-1 text-xs rounded-full ${searchType === 'category' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground-muted border'}`}>
              Categorías
            </button>
          </div>

          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <input type="text" placeholder={`Buscar ${searchType === 'product' ? 'producto' : 'categoría'}...`}
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            {searching && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-foreground-muted" />}
          </div>

          {searchResults.length > 0 && (
            <div className="mb-3 border border-border rounded-md bg-background max-h-40 overflow-y-auto">
              {searchResults.map((item: any) => (
                <button key={item.id} type="button" onClick={() => addCondition(item)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors">
                  {item.name}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {conditions.length === 0 && <p className="text-sm text-foreground-muted">Sin condiciones.</p>}
            {conditions.map((c, i) => (
              <div key={i} className="flex items-center gap-2 bg-background p-2 rounded-md border border-border">
                <span className="flex-1 text-sm font-medium">{c.productName || c.categoryName}</span>
                <span className="text-xs text-foreground-muted">mín:</span>
                <input type="number" min="1" value={c.minQuantity}
                  onChange={e => updateConditionQty(i, e.target.value)}
                  className="w-14 text-center text-sm rounded border border-border bg-background p-1" />
                <button type="button" onClick={() => removeCondition(i)} className="text-destructive hover:text-destructive/80">
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <Button variant="primary" type="submit" disabled={saving} className="w-full">
          {saving ? 'Guardando...' : 'Guardar Promoción'}
        </Button>
      </form>
    </div>
  );
};

export default NuevaPromocionPage;
