"use client";

import React, { useEffect, useState, useCallback } from "react";
import type { Brand } from "@/types";
import Button from "@/components/ui/Button";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { Edit3, Trash2, Loader2, ImageOff, AlertCircle } from "lucide-react";
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

      <div className="bg-muted p-4 sm:p-6 rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left">
            <thead className="border-b border-border">
              <tr>
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
                    {brand.logoUrl ? (
                      <img
                        src={brand.logoUrl}
                        alt={`Logo de ${brand.name}`}
                        width={40}
                        height={40}
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
