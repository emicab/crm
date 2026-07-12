"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Combo } from '@/types';
import { Loader2, AlertCircle, Plus, Trash2, Edit3, Tag } from 'lucide-react';
import Button from '@/components/ui/Button';
import Link from 'next/link';

const formatCurrency = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(num);
};

const CombosPage = () => {
  const router = useRouter();
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCombos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/combos');
      if (!res.ok) throw new Error('Error al cargar combos');
      const data = await res.json();
      setCombos(data.map((c: any) => ({ ...c, price: parseFloat(c.price) })));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCombos(); }, []);

  const handleDelete = async () => {
    if (deleteTarget === null) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/combos/${deleteTarget}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar combo');
      setDeleteTarget(null);
      fetchCombos();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 size={32} className="animate-spin text-primary" /></div>;
  if (error) return <div className="text-center text-destructive p-4">{error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Tag size={24} className="text-primary" /> Combos
        </h1>
        <Link href="/combos/nuevo">
          <Button variant="primary" size="sm"><Plus size={16} className="mr-2" />Nuevo Combo</Button>
        </Link>
      </div>

      <div className="bg-muted p-4 sm:p-6 rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-border">
              <tr>
                <th className="p-3 text-sm font-semibold text-foreground">Nombre</th>
                <th className="p-3 text-sm font-semibold text-foreground">Productos</th>
                <th className="p-3 text-sm font-semibold text-foreground text-right">Precio</th>
                <th className="p-3 text-sm font-semibold text-foreground text-center">Activo</th>
                <th className="p-3 text-sm font-semibold text-foreground text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {combos.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-foreground-muted py-8">No hay combos creados.</td></tr>
              ) : (
                combos.map(combo => (
                  <tr key={combo.id} className="border-b border-border last:border-b-0 hover:bg-background transition-colors">
                    <td className="p-3 text-sm font-medium text-foreground">
                      {combo.name}
                      {combo.description && <span className="block text-xs text-foreground-muted">{combo.description}</span>}
                    </td>
                    <td className="p-3 text-sm text-foreground-muted">
                      {combo.items?.map(i => `${i.quantity}x ${i.product?.name || `#${i.productId}`}`).join(', ')}
                    </td>
                    <td className="p-3 text-sm font-semibold text-foreground text-right">{formatCurrency(combo.price)}</td>
                    <td className="p-3 text-sm text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${combo.active ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                        {combo.active ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-center">
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => router.push(`/combos/${combo.id}/editar`)} title="Editar">
                          <Edit3 size={16} className="text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(combo.id)} title="Eliminar">
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
            <h3 className="text-lg font-semibold text-foreground mb-2">¿Eliminar combo?</h3>
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

export default CombosPage;
