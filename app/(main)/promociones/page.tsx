"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Promotion } from '@/types';
import { Loader2, AlertCircle, Plus, Trash2, Edit3, Percent, Tag } from 'lucide-react';
import Button from '@/components/ui/Button';
import Link from 'next/link';

const formatCurrency = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(num);
};

const PromocionesPage = () => {
  const router = useRouter();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPromotions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/promotions');
      if (!res.ok) throw new Error('Error al cargar promociones');
      const data = await res.json();
      setPromotions(data.map((p: any) => ({ ...p, discountValue: parseFloat(p.discountValue) })));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPromotions(); }, []);

  const handleDelete = async () => {
    if (deleteTarget === null) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/promotions/${deleteTarget}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setDeleteTarget(null);
      fetchPromotions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      BUY_X_GET_Y: '2x1 / Lleva N, paga M',
      SET_DISCOUNT: 'Descuento por conjunto',
      THRESHOLD: 'Descuento por umbral',
    };
    return labels[type] || type;
  };

  const getDiscountLabel = (p: Promotion) => {
    if (p.discountType === 'PERCENTAGE') return `${p.discountValue}%`;
    return formatCurrency(p.discountValue);
  };

  const isActive = (p: Promotion) => {
    if (p.status !== 'ACTIVE') return false;
    const now = new Date();
    if (p.startDate && new Date(p.startDate) > now) return false;
    if (p.endDate && new Date(p.endDate) < now) return false;
    return true;
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 size={32} className="animate-spin text-primary" /></div>;
  if (error) return <div className="text-center text-destructive p-4">{error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Percent size={24} className="text-primary" /> Promociones
        </h1>
        <Link href="/promociones/nueva">
          <Button variant="primary" size="sm"><Plus size={16} className="mr-2" />Nueva Promo</Button>
        </Link>
      </div>

      <div className="bg-muted p-4 sm:p-6 rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-border">
              <tr>
                <th className="p-3 text-sm font-semibold text-foreground">Nombre</th>
                <th className="p-3 text-sm font-semibold text-foreground">Tipo</th>
                <th className="p-3 text-sm font-semibold text-foreground">Condiciones</th>
                <th className="p-3 text-sm font-semibold text-foreground text-center">Descuento</th>
                <th className="p-3 text-sm font-semibold text-foreground text-center">Vigente</th>
                <th className="p-3 text-sm font-semibold text-foreground text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {promotions.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-foreground-muted py-8">No hay promociones creadas.</td></tr>
              ) : (
                promotions.map(p => (
                  <tr key={p.id} className="border-b border-border last:border-b-0 hover:bg-background transition-colors">
                    <td className="p-3 text-sm font-medium text-foreground">
                      {p.name}
                      {p.description && <span className="block text-xs text-foreground-muted">{p.description}</span>}
                    </td>
                    <td className="p-3 text-sm text-foreground-muted">{getTypeLabel(p.type)}</td>
                    <td className="p-3 text-sm text-foreground-muted">
                      {p.conditions?.map((c, i) => {
                        const prod = c.product?.name;
                        const cat = c.category?.name;
                        const what = prod || cat || 'Cualquier producto';
                        return <span key={i} className="block">{c.minQuantity}x {what}</span>;
                      })}
                    </td>
                    <td className="p-3 text-sm font-semibold text-center">{getDiscountLabel(p)}</td>
                    <td className="p-3 text-sm text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${isActive(p) ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                        {isActive(p) ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-center">
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => router.push(`/promociones/${p.id}/editar`)} title="Editar">
                          <Edit3 size={16} className="text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(p.id)} title="Eliminar">
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

      {deleteTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-muted p-6 rounded-xl shadow-xl max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-2">¿Eliminar promoción?</h3>
            <p className="text-sm text-foreground-muted mb-4">Esta acción no se puede deshacer.</p>
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

export default PromocionesPage;
