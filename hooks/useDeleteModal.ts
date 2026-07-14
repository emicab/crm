import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

interface UseDeleteModalOptions {
  onSuccess?: () => void;
  successMessage?: string;
}

interface UseDeleteModalResult<T> {
  isModalOpen: boolean;
  itemToDelete: T | null;
  isDeleting: boolean;
  openDelete: (item: T) => void;
  closeDelete: () => void;
  confirmDelete: (
    deleteFn: (item: T) => Promise<Response>,
    getItemName?: (item: T) => string
  ) => Promise<void>;
}

export function useDeleteModal<T extends { id?: number }>(
  options?: UseDeleteModalOptions
): UseDeleteModalResult<T> {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openDelete = useCallback((item: T) => {
    setItemToDelete(item);
    setIsModalOpen(true);
  }, []);

  const closeDelete = useCallback(() => {
    setIsModalOpen(false);
    setItemToDelete(null);
    setIsDeleting(false);
  }, []);

  const confirmDelete = useCallback(async (
    deleteFn: (item: T) => Promise<Response>,
    getItemName?: (item: T) => string
  ) => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const response = await deleteFn(itemToDelete);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al eliminar.');
      }
      toast.success(options?.successMessage || (
        getItemName ? `"${getItemName(itemToDelete)}" eliminado.` : 'Eliminado correctamente.'
      ));
      options?.onSuccess?.();
      closeDelete();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setIsDeleting(false);
    }
  }, [itemToDelete, options]);

  return { isModalOpen, itemToDelete, isDeleting, openDelete, closeDelete, confirmDelete };
}
