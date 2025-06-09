"use client";

import React, { useEffect, useState, useCallback } from "react";
import type { Category } from "@/types";
import Button from "@/components/ui/Button";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { Edit3, Trash2, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

const CategoryTable = () => {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      setCategories(await response.json());
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al cargar las categorías.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenDeleteModal = (category: Category) => {
    setItemToDelete(category);
    setIsModalOpen(true);
  };

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
      setCategories((prev) => prev.filter((cat) => cat.id !== itemToDelete.id));
      toast.success(`Categoría "${itemToDelete.name}" eliminada.`);
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

  const handleEdit = (categoryId: number) => {
    router.push(`/categorias/${categoryId}/editar`);
  };

  if (loading) {
    /* ... JSX de loading ... */
  }
  if (error) {
    /* ... JSX de error ... */
  }

  return (
    <>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Categoría"
        confirmText="Sí, Eliminar"
        isLoading={isDeleting}
      >
        ¿Estás seguro de que quieres eliminar la categoría{" "}
        <strong className="text-foreground">"{itemToDelete?.name}"</strong>?
        Esta acción no se puede deshacer.
      </ConfirmationModal>

      <div className="bg-muted p-4 sm:p-6 rounded-lg shadow">
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
              {categories.map((category) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default CategoryTable;
