// components/proveedores/SupplierTable.tsx
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import type { Supplier } from '@/types';
import Button from '@/components/ui/Button';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { Edit3, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

const SupplierTable = () => {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/proveedores');
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      setSuppliers(await response.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar proveedores.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleOpenDeleteModal = (supplier: Supplier) => {
    setItemToDelete(supplier);
    setIsModalOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/proveedores/${itemToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'No se pudo eliminar el proveedor.');
      }
      setSuppliers(prev => prev.filter(s => s.id !== itemToDelete.id));
      toast.success(`Proveedor "${itemToDelete.name}" eliminado.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error.');
    } finally {
      setIsModalOpen(false);
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const handleEdit = (supplierId: number) => {
    router.push(`/proveedores/${supplierId}/editar`);
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-primary" /></div>;
  if (error) return <div className="text-center text-destructive p-4 bg-destructive/10 rounded-md">{error}</div>;

  return (
    <>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Proveedor"
        confirmText="Sí, Eliminar"
        isLoading={isDeleting}
      >
        ¿Estás seguro de que quieres eliminar al proveedor <strong className="text-foreground">"{itemToDelete?.name}"</strong>? Esta acción no se puede deshacer.
      </ConfirmationModal>

      <div className="bg-muted p-4 sm:p-6 rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead className="border-b border-border">
              <tr>
                <th className="p-3 text-sm font-semibold text-foreground">Nombre</th>
                <th className="p-3 text-sm font-semibold text-foreground">Contacto</th>
                <th className="p-3 text-sm font-semibold text-foreground">Email</th>
                <th className="p-3 text-sm font-semibold text-foreground">Teléfono</th>
                <th className="p-3 text-sm font-semibold text-foreground text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 && !loading ? (
                <tr><td colSpan={5} className="text-center text-foreground-muted py-8">No hay proveedores registrados.</td></tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b border-border last:border-b-0 hover:bg-background transition-colors">
                    <td className="p-3 text-sm text-foreground font-medium">{supplier.name}</td>
                    <td className="p-3 text-sm text-foreground-muted">{supplier.contactPerson || '-'}</td>
                    <td className="p-3 text-sm text-foreground-muted">{supplier.email || '-'}</td>
                    <td className="p-3 text-sm text-foreground-muted">{supplier.phone || '-'}</td>
                    <td className="p-3 text-sm text-center">
                      <div className="flex justify-center items-center space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(supplier.id)} title="Editar"><Edit3 size={16} className="text-primary" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteModal(supplier)} title="Eliminar"><Trash2 size={16} className="text-destructive" /></Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default SupplierTable;