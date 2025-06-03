// components/ventas/SalesHistoryTable.tsx
"use client";

import React, { useEffect, useState } from "react";
import type { Sale } from "@/types"; // Usaremos el tipo Sale que definimos
import { Loader2, AlertCircle, Eye } from "lucide-react"; // Eye para un futuro botón de "ver detalle"
import Button from "@/components/ui/Button"; // Para el botón de detalle
import { useRouter } from "next/navigation";
import { getPaymentTypeDisplay } from "@/lib/displayTexts";

const SalesHistoryTable = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    const fetchSales = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/ventas");
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Error HTTP: ${response.status}`
          );
        }
        let data: any[] = await response.json(); // Recibir como any[] para el mapeo inicial

        // Convertir montos a número y asegurar que los objetos anidados tengan los tipos correctos
        const typedSales: Sale[] = data.map((sale) => ({
          ...sale,
          totalAmount: parseFloat(String(sale.totalAmount)),
          saleDate: sale.saleDate, // Asumir que ya es string o Date compatible
          createdAt: sale.createdAt,
          updatedAt: sale.updatedAt,
          client: sale.client
            ? {
                ...sale.client,
                createdAt: sale.client.createdAt,
                updatedAt: sale.client.updatedAt,
              }
            : null,
          seller: sale.seller
            ? {
                ...sale.seller,
                createdAt: sale.seller.createdAt,
                updatedAt: sale.seller.updatedAt,
              }
            : null,
          items: sale.items.map((item: any) => ({
            ...item,
            priceAtSale: parseFloat(String(item.priceAtSale)),
            product: item.product
              ? {
                  ...item.product,
                  pricePurchase:
                    item.product.pricePurchase !== null
                      ? parseFloat(String(item.product.pricePurchase))
                      : null,
                  priceSale: parseFloat(String(item.product.priceSale)),
                  quantityStock: parseInt(String(item.product.quantityStock)),
                  stockMinAlert:
                    item.product.stockMinAlert !== null
                      ? parseInt(String(item.product.stockMinAlert))
                      : null,
                  createdAt: item.product.createdAt,
                  updatedAt: item.product.updatedAt,
                  // Asumir que brand y category son objetos completos si se incluyen, o solo IDs
                }
              : null,
          })),
        }));
        setSales(typedSales);
      } catch (err: any) {
        setError(err.message || "Error al cargar el historial de ventas.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, []);

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

  const handleViewDetails = (saleId: number) => {
    router.push(`/ventas/${saleId}`);
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
            {sales.length === 0 && !loading ? (
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewDetails(sale.id)}
                      title="Ver detalles de la venta"
                    >
                      <Eye size={16} className="text-primary" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesHistoryTable;
