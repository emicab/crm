"use client";

import React, { useEffect, useState, useCallback } from "react";
import type { Brand } from "@/types";
import Button from "@/components/ui/Button";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { Edit3, Trash2, Loader2, ImageOff, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Image from "next/image";

const BrandTable = () => {
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para el modal de confirmación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Brand | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/brands");
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      setBrands(await response.json());
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al cargar las marcas.";
      setError(errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const handleOpenDeleteModal = (brand: Brand) => {
    setItemToDelete(brand);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/brands/${itemToDelete.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "No se pudo eliminar la marca.");
      }
      setBrands((prevBrands) =>
        prevBrands.filter((brand) => brand.id !== itemToDelete.id)
      );
      toast.success(`Marca "${itemToDelete.name}" eliminada exitosamente.`);
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

  const handleEdit = (brandId: number) => {
    router.push(`/marcas/${brandId}/editar`);
  };

  const handleToggleSelect = (brandId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(brandId)) next.delete(brandId);
      else next.add(brandId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === brands.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(brands.map((b) => b.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleConfirmBatchDelete = async () => {
    setIsBatchDeleting(true);
    try {
      const response = await fetch("/api/brands/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const errorData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(errorData.message || "Error al eliminar marcas.");
      }

      toast.success(`Se eliminaron ${errorData.count ?? selectedIds.size} marca(s).`);
      setSelectedIds(new Set());
      setIsBatchDeleteOpen(false);
      fetchBrands();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setIsBatchDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive p-4 bg-destructive/10 rounded-md">
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
        title="Eliminar Marca"
        confirmText="Sí, Eliminar"
        isLoading={isDeleting}
      >
        ¿Estás seguro de que quieres eliminar la marca{" "}
        <strong className="text-foreground">"{itemToDelete?.name}"</strong>?
        Esta acción no se puede deshacer.
      </ConfirmationModal>

      <ConfirmationModal
        isOpen={isBatchDeleteOpen}
        onClose={() => setIsBatchDeleteOpen(false)}
        onConfirm={handleConfirmBatchDelete}
        title="Eliminar Marcas Masivamente"
        confirmText="Sí, Eliminar Todas"
        isLoading={isBatchDeleting}
      >
        ¿Estás seguro de que querés eliminar{" "}
        <strong className="text-foreground">
          {selectedIds.size} marca{selectedIds.size !== 1 ? "s" : ""}
        </strong>
        ? Esta acción no se puede deshacer. Las marcas que tengan productos
        asociados no se eliminarán.
      </ConfirmationModal>

      <div className="bg-muted p-4 sm:p-6 rounded-lg shadow">
        {selectedIds.size > 0 && (
          <div className="mb-4 p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <span className="text-sm font-bold text-blue-950">
              {selectedIds.size} marca{selectedIds.size !== 1 ? "s" : ""}{" "}
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
          <table className="w-full min-w-[600px] text-left">
            <thead className="border-b border-border">
              <tr>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground w-8 text-center">
                  <input
                    type="checkbox"
                    checked={
                      brands.length > 0 &&
                      selectedIds.size === brands.length
                    }
                    onChange={handleSelectAll}
                    className="rounded border-border cursor-pointer"
                  />
                </th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground w-16 text-center">
                  Logo
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
              {brands.map((brand) => (
                <tr
                  key={brand.id}
                  className="border-b border-border last:border-b-0 hover:bg-background transition-colors"
                >
                  <td className="p-3 sm:p-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(brand.id)}
                      onChange={() => handleToggleSelect(brand.id)}
                      className="rounded border-border cursor-pointer"
                    />
                  </td>
                  <td className="p-3 sm:p-4 text-center">
                    {brand.logoUrl ? (
                      <Image
                        src={brand.logoUrl}
                        alt={`Logo de ${brand.name}`}
                        width={40}
                        height={40}
                        unoptimized
                        className="object-contain rounded-sm inline-block"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-slate-200 rounded-sm flex items-center justify-center text-slate-400 inline-block">
                        <ImageOff size={20} />
                      </div>
                    )}
                  </td>
                  <td className="p-3 sm:p-4 text-sm text-foreground font-medium">
                    {brand.name}
                  </td>
                  <td className="p-3 sm:p-4 text-sm text-center">
                    <div className="flex justify-center items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(brand.id)}
                        title="Editar"
                      >
                        <Edit3 size={16} className="text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDeleteModal(brand)}
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

export default BrandTable;
