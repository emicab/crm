"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Sale, SaleItem, Product, Client, Seller } from "@/types";
import {
    Loader2,
    AlertCircle,
    ArrowLeft,
    UserCircle,
    Tag,
    ShoppingBag,
    Edit3,
    Printer,
    CreditCard,
    Hash,
    Info,
    Percent,
    UserPlus,
    MessageSquare,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { getPaymentTypeDisplay } from "@/lib/displayTexts";
import toast from "react-hot-toast";

interface SaleItemDetail extends Omit<SaleItem, "product"> {
    product: Product | null;
    subtotal: number;
}
interface SaleDetail
    extends Omit<Sale, "items" | "totalAmount" | "priceAtSale"> {
    items: SaleItemDetail[];
    totalAmount: number;
    client?: Client | null;
    seller?: Seller;
}

const SaleDetailPage = () => {
    const router = useRouter();
    const params = useParams();
    const saleId = params.id as string;

    const [sale, setSale] = useState<SaleDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (saleId) {
            const fetchSaleDetail = async () => {
                setLoading(true);
                setError(null);
                try {
                    const response = await fetch(`/api/ventas/${saleId}`);
                    if (!response.ok) {
                        const errorData = await response
                            .json()
                            .catch(() => ({}));
                        throw new Error(
                            errorData.message ||
                                `Venta no encontrada o error al cargar (${response.status})`
                        );
                    }
                    const data = await response.json();
                    setSale({
                        ...data,
                        totalAmount: parseFloat(data.totalAmount),
                        items: data.items.map((item: any) => ({
                            ...item,
                            priceAtSale: parseFloat(item.priceAtSale),
                            subtotal:
                                parseFloat(item.priceAtSale) * item.quantity,
                            product: item.product
                                ? {
                                      ...item.product,
                                      pricePurchase: item.product.pricePurchase
                                          ? parseFloat(
                                                item.product.pricePurchase
                                            )
                                          : null,
                                      priceSale: parseFloat(
                                          item.product.priceSale
                                      ),
                                      quantityStock: parseInt(
                                          item.product.quantityStock
                                      ),
                                  }
                                : null,
                        })),
                    });
                } catch (err: any) {
                    setError(err.message);
                    console.error("Error fetching sale detail:", err);
                } finally {
                    setLoading(false);
                }
            };
            fetchSaleDetail();
        } else {
            setError("ID de venta no especificado.");
            setLoading(false);
        }
    }, [saleId]);

    const formatCurrency = (amount: number | string) => {
        const numAmount =
            typeof amount === "string" ? parseFloat(amount) : amount;
        if (isNaN(numAmount)) return "-";
        return new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
        }).format(numAmount);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "Fecha no disponible";
        return new Date(dateString).toLocaleString("es-AR", {
            dateStyle: "medium",
            timeStyle: "short",
        });
    };

    const handlePrintOrSavePDF = async () => {
        // Llama a la función expuesta por el preload script
        if (window.electronAPI) {
            toast.loading("Generando PDF...", { id: "pdf-toast" });
            const result = await window.electronAPI.saveSaleAsPDF();
            toast.dismiss("pdf-toast");

            if (result.success) {
                toast.success(`PDF guardado exitosamente en: ${result.path}`);
            } else if (result.error !== "Cancelled") {
                toast.error(`Error al generar PDF: ${result.error}`);
            }
        } else {
            console.error(
                "La API de Electron no está disponible. Asegúrate de que estás en un entorno Electron con el preload script cargado."
            );
            toast.error(
                "La función de impresión solo está disponible en la aplicación de escritorio."
            );
        }
    };

    const handleShareOnWhatsApp = async () => {
        if (!sale?.client?.phone) {
            toast.error(
                "Este cliente no tiene un número de teléfono registrado."
            );
            return;
        }

        if (window.electronAPI) {
            toast.loading("Preparando para compartir...", {
                id: "whatsapp-toast",
            });
            const result = await window.electronAPI.saveSaleAsPDF();
            toast.dismiss("whatsapp-toast");

            if (result.success && result.path) {
                toast.success(
                    `PDF guardado. Ahora abre WhatsApp para enviarlo manualmente desde: ${result.path}`,
                    { duration: 6000 }
                );
                // Abre WhatsApp en el navegador por defecto
                const whatsappUrl = `https://wa.me/${sale.client.phone.replace(
                    /\D/g,
                    ""
                )}`; // Limpia el número de teléfono
                window.open(whatsappUrl, "_blank");
            } else if (result.error !== "Cancelled") {
                toast.error(`Error al generar PDF: ${result.error}`);
            }
        } else {
            toast.error(
                "La función de compartir solo está disponible en la aplicación de escritorio."
            );
        }
    };

    if (loading) {
        return (
            <div className='flex flex-col items-center justify-center h-64'>
                <Loader2 size={32} className='animate-spin text-primary' />
                <p className='mt-2 text-foreground-muted'>
                    Cargando detalles de la venta...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className='flex flex-col items-center justify-center'>
                <AlertCircle size={48} className='text-destructive mb-4' />
                <h2 className='text-xl font-semibold text-destructive mb-2'>
                    Error al Cargar la Venta
                </h2>
                <p className='text-foreground-muted mb-4'>{error}</p>
                <Button
                    variant='outline'
                    onClick={() => router.push("/ventas")}
                >
                    Volver al Historial
                </Button>
            </div>
        );
    }

    if (!sale) {
        return (
            <p className='text-center text-foreground-muted'>
                No se encontraron datos para esta venta.
            </p>
        );
    }

    return (
        <div className='max-w-4xl mx-auto'>
            <div className='flex justify-between items-center mb-6'>
                <Button
                    variant='outline'
                    size='sm'
                    onClick={() => router.back()}
                >
                    <ArrowLeft size={16} className='mr-2' />
                    Volver
                </Button>
            </div>

            <div className='bg-muted p-6 sm:p-8 rounded-xl shadow-lg'>
                <div className='flex flex-col sm:flex-row justify-between items-start mb-6 pb-6 border-b border-border'>
                    <div>
                        <h1 className='text-3xl font-bold text-primary mb-1'>
                            Venta #{sale.id}
                        </h1>
                        <p className='text-sm text-foreground-muted'>
                            Registrada el: {formatDate(sale.saleDate)}
                        </p>
                    </div>
                    <div className='text-right mt-4 sm:mt-0'>
                        <p className='text-sm text-foreground-muted'>
                            Monto Total
                        </p>
                        <p className='text-3xl font-bold text-foreground'>
                            {formatCurrency(sale.totalAmount)}
                        </p>
                    </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8'>
                    <div>
                        <h3 className='text-sm font-medium text-foreground-muted mb-1 flex items-center'>
                            <UserCircle
                                size={16}
                                className='mr-2 text-primary'
                            />
                            Cliente
                        </h3>
                        {sale.client ? (
                            <Link
                                href={`/clientes/${sale.client.id}/ventas`}
                                className='text-primary hover:underline font-medium'
                            >
                                {`${sale.client.firstName} ${
                                    sale.client.lastName || ""
                                }`.trim()}
                            </Link>
                        ) : (
                            <p className='text-foreground font-medium'>
                                Consumidor Final
                            </p>
                        )}
                        {sale.client?.email && (
                            <p className='text-xs text-foreground-muted'>
                                {sale.client.email}
                            </p>
                        )}
                        {sale.client?.phone && (
                            <p className='text-xs text-foreground-muted'>
                                {sale.client.phone}
                            </p>
                        )}
                    </div>
                    <div>
                        <h3 className='text-sm font-medium text-foreground-muted mb-1 flex items-center'>
                            <UserPlus size={16} className='mr-2 text-primary' />
                            Vendedor
                        </h3>
                        {sale.seller ? (
                            <Link
                                href={`/vendedores/${sale.seller.id}/ventas`}
                                className='text-primary hover:underline font-medium'
                            >
                                {sale.seller.name}
                            </Link>
                        ) : (
                            <p className='text-foreground font-medium'>N/A</p>
                        )}
                    </div>
                    <div>
                        <h3 className='text-sm font-medium text-foreground-muted mb-1 flex items-center'>
                            <CreditCard
                                size={16}
                                className='mr-2 text-primary'
                            />
                            Tipo de Pago
                        </h3>
                        <p className='text-foreground font-medium'>
                            {getPaymentTypeDisplay(sale.paymentType)}
                        </p>
                    </div>
                    {sale.discountCodeApplied && (
                        <div>
                            <h3 className='text-sm font-medium text-foreground-muted mb-1 flex items-center'>
                                <Percent
                                    size={16}
                                    className='mr-2 text-primary'
                                />
                                Cód. Descuento Aplicado
                            </h3>
                            <p className='text-foreground_major_custom_colors font-medium'>
                                {sale.discountCodeApplied}
                            </p>
                        </div>
                    )}
                    {sale.notes && (
                        <div className='md:col-span-2'>
                            <h3 className='text-sm font-medium text-foreground-muted mb-1 flex items-center'>
                                <Info size={16} className='mr-2 text-primary' />
                                Notas Adicionales
                            </h3>
                            <p className='text-sm text-foreground bg-background p-3 rounded-md border border-border'>
                                {sale.notes}
                            </p>
                        </div>
                    )}
                </div>

                <div>
                    <h2 className='text-xl font-semibold text-foreground mb-3 flex items-center'>
                        <ShoppingBag size={20} className='mr-2 text-primary' />
                        Ítems Vendidos ({sale.items.length})
                    </h2>
                    <div className='overflow-x-auto border border-border rounded-lg'>
                        <table className='w-full text-left'>
                            <thead className='bg-slate-100 dark:bg-slate-400'>
                                <tr>
                                    <th className='p-3 text-sm font-semibold text-foreground'>
                                        Producto
                                    </th>
                                    <th className='p-3 text-sm font-semibold text-foreground text-center'>
                                        Cantidad
                                    </th>
                                    <th className='p-3 text-sm font-semibold text-foreground text-right'>
                                        Precio Unit.
                                    </th>
                                    <th className='p-3 text-sm font-semibold text-foreground text-right'>
                                        Subtotal
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sale.items.map((item, index) => (
                                    <tr
                                        key={item.id || index}
                                        className='border-b border-border last:border-b-0 hover:bg-slate-20 dark:hover:bg-slate-500/50 transition-colors'
                                    >
                                        <td className='p-3 text-sm text-foreground font-medium'>
                                            {item.product?.name ||
                                                "Producto no disponible"}
                                            {item.product?.sku && (
                                                <span className='block text-xs text-foreground-muted'>
                                                    SKU: {item.product.sku}
                                                </span>
                                            )}
                                        </td>
                                        <td className='p-3 text-sm text-foreground text-center'>
                                            {item.quantity}
                                        </td>
                                        <td className='p-3 text-sm text-foreground text-right'>
                                            {formatCurrency(item.priceAtSale)}
                                        </td>
                                        <td className='p-3 text-sm text-foreground font-semibold text-right'>
                                            {formatCurrency(item.subtotal)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className='mt-8 flex justify-end space-x-3'>
                    {/* --- NUEVOS BOTONES DE ACCIÓN --- */}
                    <div className='flex space-x-2'>
                        <Button
                            variant='outline'
                            onClick={handlePrintOrSavePDF}
                        >
                            <Printer size={16} className='mr-2' />
                            Imprimir / Guardar PDF
                        </Button>
                        <Button
                            variant='whatsapp'
                            onClick={handleShareOnWhatsApp}
                            
                        >
                            <MessageSquare size={16} className='mr-2' />
                            Compartir por WhatsApp
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SaleDetailPage;
