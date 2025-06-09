// components/vendedores/SellerTable.tsx
"use client";

import React, { useEffect, useState } from 'react';
import type { Seller } from '@/types';
import Button from '@/components/ui/Button';
import { Edit3, Trash2, Loader2, UserCheck, UserX, AlertCircle } from 'lucide-react'; // Importar AlertCircle
import { useRouter } from 'next/navigation'; // Descomentar si se usa para handleEdit aquí
import toast from 'react-hot-toast';
import ConfirmationModal from '../ui/ConfirmationModal';

const SellerTable = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Error para la carga inicial
  const [actionError, setActionError] = useState<string | null>(null); // Error para acciones (delete)

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Seller | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter(); // Descomentar si se usa para handleEdit aquí

  const fetchSellers = async () => {
    setLoading(true);
    setError(null);
    setActionError(null);
    try {
      const response = await fetch('/api/vendedores');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }
      const data = await response.json();
      setSellers(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los vendedores.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchSellers();
  }, []);

  const handleOpenDeleteModal = (seller: Seller) => {
    setItemToDelete(seller);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/vendedores/${itemToDelete.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Error al eliminar el vendedor.");
      }
      setSellers((prev) => prev.filter((p) => p.id !== itemToDelete.id));
      toast.success(`Vendedor "${itemToDelete.name}" eliminado.`);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Ocurrió un error inesperado.";
      toast.error(errorMessage);
    } finally {
      setIsModalOpen(false);
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };


  const handleEdit = (sellerId: number) => {
    router.push(`/vendedores/${sellerId}/editar`);
  };

  // ... (resto del componente: loading, error, renderizado de la tabla)
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="ml-2 text-foreground-muted">Cargando vendedores...</p>
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
    <>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar vendedor"
        confirmText="Sí, Eliminar"
        isLoading={isDeleting}
      >
        ¿Estás seguro de que quieres eliminar el vendedor{" "}
        <strong className="text-foreground">"{itemToDelete?.name}"</strong>?
        <br />
        Esta acción no se puede deshacer.
      </ConfirmationModal>
      <div className="bg-muted p-4 sm:p-6 rounded-lg shadow">
        {actionError && (
          <div className="mb-4 text-center text-destructive p-3 bg-destructive/10 rounded-md">
            <AlertCircle size={18} className="inline-block mr-2" />
            {actionError}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left">
            <thead className="border-b border-border">
              <tr>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground">
                  Nombre
                </th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground">
                  Email
                </th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground">
                  Teléfono
                </th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground text-center">
                  Estado
                </th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground text-center">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {sellers.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center text-foreground-muted py-8"
                  >
                    No se encontraron vendedores. Comienza agregando uno nuevo.
                  </td>
                </tr>
              ) : (
                sellers.map((seller) => (
                  <tr
                    key={seller.id}
                    className="border-b border-border last:border-b-0 hover:bg-background transition-colors"
                  >
                    <td className="p-3 sm:p-4 text-sm text-foreground font-medium">
                      {seller.name}
                    </td>
                    <td className="p-3 sm:p-4 text-sm text-foreground-muted">
                      {seller.email || "-"}
                    </td>
                    <td className="p-3 sm:p-4 text-sm text-foreground-muted">
                      {seller.phone || "-"}
                    </td>
                    <td className="p-3 sm:p-4 text-sm text-center">
                      {seller.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success">
                          <UserCheck size={14} className="mr-1" /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/20 text-destructive">
                          <UserX size={14} className="mr-1" /> Inactivo
                        </span>
                      )}
                    </td>
                    <td className="p-3 sm:p-4 text-sm text-center">
                      <div className="flex justify-center items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(seller.id)}
                          title="Editar"
                        >
                          <Edit3 size={16} className="text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDeleteModal(seller)}
                          title="Eliminar"
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
      </div>
    </>
  );
};

export default SellerTable;