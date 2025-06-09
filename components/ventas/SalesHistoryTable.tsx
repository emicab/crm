"use client";

import React, { useEffect, useState, useCallback } from "react";
import type { Sale } from "@/types";
import Button from "@/components/ui/Button";
import ConfirmationModal from "@/components/ui/ConfirmationModal"; // Importamos el modal
import { Loader2, AlertCircle, Eye, Trash2 } from "lucide-react"; // Importamos el icono de papelera
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast"; // Importamos toast
import { getPaymentTypeDisplay } from "@/lib/displayTexts"; // Reutilizamos el helper de traducción

const SalesHistoryTable = () => {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Estados para el modal de confirmación ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Sale | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ventas");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }
      let data: any[] = await response.json();
      const typedSales: Sale[] = data.map((sale) => ({
        ...sale,
        totalAmount: parseFloat(String(sale.totalAmount)),
        items: sale.items.map((item: any) => ({
          ...item,
          priceAtSale: parseFloat(String(item.priceAtSale)),
        })),
      }));
      setSales(typedSales);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error al cargar el historial de ventas.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleViewDetails = (saleId: number) => {
    router.push(`/ventas/${saleId}`);
  };

  // Función para abrir el modal de confirmación de eliminación
  const handleOpenDeleteModal = (sale: Sale) => {
    setItemToDelete(sale);
    setIsModalOpen(true);
  };

  // Función que se ejecuta al confirmar la eliminación en el modal
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/ventas/${itemToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "No se pudo eliminar la venta.");
      }

      setSales((prevSales) =>
        prevSales.filter((sale) => sale.id !== itemToDelete.id)
      );
      toast.success(`Venta #${itemToDelete.id} eliminada y stock repuesto.`);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="ml-2 text-foreground-muted">
          Cargando historial de ventas...
        </p>
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
        title="Eliminar Venta"
        confirmText="Sí, Eliminar Venta"
        isLoading={isDeleting}
      >
        ¿Estás seguro de que quieres eliminar la venta{" "}
        <strong className="text-foreground">#{itemToDelete?.id}</strong>?
        <br />
        <span className="font-semibold text-destructive">
          Esta acción repondrá el stock de los productos vendidos y no se puede
          deshacer.
        </span>
      </ConfirmationModal>

      <div className="bg-muted p-4 sm:p-6 rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="border-b border-border">
              <tr>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground">
                  ID Venta
                </th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground">
                  Fecha
                </th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground">
                  Cliente
                </th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground">
                  Vendedor
                </th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground text-right">
                  Monto Total
                </th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground">
                  Tipo Pago
                </th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground text-center">
                  Nº Ítems
                </th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground">
                  Cód. Desc.
                </th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground text-center">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {!loading && sales.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center text-foreground-muted py-8"
                  >
                    No hay ventas registradas todavía.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="border-b border-border last:border-b-0 hover:bg-background transition-colors"
                  >
                    <td className="p-3 sm:p-4 text-sm text-foreground font-medium">
                      #{sale.id}
                    </td>
                    <td className="p-3 sm:p-4 text-sm text-foreground-muted">
                      {formatDate(sale.saleDate)}
                    </td>
                    <td className="p-3 sm:p-4 text-sm text-foreground-muted">
                      {sale.client
                        ? `${sale.client.firstName} ${
                            sale.client.lastName || ""
                          }`.trim()
                        : "N/A"}
                    </td>
                    <td className="p-3 sm:p-4 text-sm text-foreground-muted">
                      {sale.seller?.name || "N/A"}
                    </td>
                    <td className="p-3 sm:p-4 text-sm text-foreground font-semibold text-right">
                      {formatCurrency(sale.totalAmount)}
                    </td>
                    <td className="p-3 sm:p-4 text-sm text-foreground-muted">
                      {getPaymentTypeDisplay(sale.paymentType)}
                    </td>
                    <td className="p-3 sm:p-4 text-sm text-foreground-muted text-center">
                      {sale.items.length}
                    </td>
                    <td className="p-3 sm:p-4 text-sm text-foreground-muted">
                      {sale.discountCodeApplied || "-"}
                    </td>
                    <td className="p-3 sm:p-4 text-sm text-center">
                      <div className="flex justify-center items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(sale.id)}
                          title="Ver detalles"
                        >
                          <Eye size={16} className="text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDeleteModal(sale)}
                          title="Eliminar venta"
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

export default SalesHistoryTable;
