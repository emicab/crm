"use client";

import React, { useEffect, useState } from "react";
import type { Category } from "@/types";
import Button from "@/components/ui/Button";
import { Edit3, Trash2, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import ConfirmationModal from "../ui/ConfirmationModal";

const CategoryTable = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false); // Para el estado de carga del botón del modal

  const router = useRouter();

  // Esta función ahora solo abre el modal
  const handleOpenDeleteModal = (category: Category) => {
    setItemToDelete(category);
    setIsModalOpen(true);
  };

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    setActionError(null);
    try {
      const response = await fetch("/api/categories");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }
      const data = await response.json();
      setCategories(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar las categorías.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/categories/${itemToDelete.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "No se pudo eliminar la categoría."
        );
      }
      // Actualizar la UI
      setCategories((prevCategories) =>
        prevCategories.filter((cat) => cat.id !== itemToDelete.id)
      );
    } catch (err: any) {
      console.error("Error al eliminar categoría:", err);
      alert(`Error: ${err.message}`); // O mostrar un toast/notificación
    } finally {
      setIsModalOpen(false); // Cerrar el modal
      setIsDeleting(false); // Quitar estado de carga
      setItemToDelete(null); // Limpiar el ítem a eliminar
    }
  };

  const handleEdit = (categoryId: number) => {
    router.push(`/categorias/${categoryId}/editar`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="ml-2 text-foreground-muted">Cargando categorías...</p>
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
      <div className="bg-muted p-4 sm:p-6 rounded-lg shadow">
        {actionError && (
          <div className="mb-4 text-center text-destructive p-3 bg-destructive/10 rounded-md">
            <AlertCircle size={18} className="inline-block mr-2" />
            {actionError}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] text-left">
            <thead className="border-b border-border">
              <tr>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground">
                  Nombre
                </th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground text-center">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={2}
                    className="text-center text-foreground-muted py-8"
                  >
                    No se encontraron categorías. Comienza agregando una nueva.
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr
                    key={category.id}
                    className="border-b border-border last:border-b-0 hover:bg-background transition-colors"
                  >
                    <td className="p-3 sm:p-4 text-sm text-foreground font-medium">
                      {category.name}
                    </td>
                    <td className="p-3 sm:p-4 text-sm text-center">
                      <div className="flex justify-center items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(category.id)}
                          title="Editar"
                        >
                          <Edit3 size={16} className="text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDeleteModal(category)}
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
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Categoría"
        confirmText="Sí, Eliminar"
        isLoading={isDeleting}
      >
        ¿Estás seguro de que quieres eliminar la categoría
        <strong className="text-foreground"> "{itemToDelete?.name}"</strong>?
        Esta acción no se puede deshacer.
      </ConfirmationModal>
    </>
  );
};

export default CategoryTable;
