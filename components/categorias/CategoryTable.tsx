"use client";

import React, { useEffect, useState, useCallback } from "react";
import type { Category } from "@/types";
import Button from "@/components/ui/Button";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { Edit3, Trash2, X } from "lucide-react";
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

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

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

  const handleToggleSelect = (categoryId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === categories.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(categories.map((c) => c.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleConfirmBatchDelete = async () => {
    setIsBatchDeleting(true);
    try {
      const response = await fetch("/api/categories/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const errorData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(errorData.message || "Error al eliminar categorías.");
      }

      toast.success(`Se eliminaron ${errorData.count ?? selectedIds.size} categoría(s).`);
      setSelectedIds(new Set());
      setIsBatchDeleteOpen(false);
      fetchCategories();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setIsBatchDeleting(false);
    }
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

      <ConfirmationModal
        isOpen={isBatchDeleteOpen}
        onClose={() => setIsBatchDeleteOpen(false)}
        onConfirm={handleConfirmBatchDelete}
        title="Eliminar Categorías Masivamente"
        confirmText="Sí, Eliminar Todas"
        isLoading={isBatchDeleting}
      >
        ¿Estás seguro de que querés eliminar{" "}
        <strong className="text-foreground">
          {selectedIds.size} categoría{selectedIds.size !== 1 ? "s" : ""}
        </strong>
        ? Esta acción no se puede deshacer. Las categorías que tengan productos
        asociados no se eliminarán.
      </ConfirmationModal>

      <div className="bg-muted p-4 sm:p-6 rounded-lg shadow">
        {selectedIds.size > 0 && (
          <div className="mb-4 p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <span className="text-sm font-bold text-blue-950">
              {selectedIds.size} categoría{selectedIds.size !== 1 ? "s" : ""}{" "}
              seleccionada{selectedIds.size !== 1 ? "s" : ""}.
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
                className="bg-white"
              >
                <X size={14} className="mr-1" /> Limpiar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBatchDeleteOpen(true)}
                className="border-rose-600 text-rose-700 hover:bg-rose-100 bg-white font-semibold flex items-center gap-1"
              >
                <Trash2 size={14} className="text-rose-600" /> Eliminar Masivo
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[250px] text-left">
            <thead className="border-b border-border">
              <tr>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground w-8 text-center">
                  <input
                    type="checkbox"
                    checked={
                      categories.length > 0 &&
                      selectedIds.size === categories.length
                    }
                    onChange={handleSelectAll}
                    className="rounded border-border cursor-pointer"
                  />
                </th>
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
                  <td className="p-3 sm:p-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(category.id)}
                      onChange={() => handleToggleSelect(category.id)}
                      className="rounded border-border cursor-pointer"
                    />
                  </td>
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
