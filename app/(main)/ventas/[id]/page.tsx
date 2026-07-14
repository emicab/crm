"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Sale, SaleItem, Product, Client, Seller, CashRegister } from "@/types";
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
    X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatCurrency";
import { formatDate } from "@/lib/formatDate";
import { getPaymentTypeDisplay } from "@/lib/displayTexts";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";

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
    cashRegister?: CashRegister | null;
}

const SaleDetailPage = () => {
    const router = useRouter();
    const params = useParams();
    const saleId = params?.id as string;

    const [sale, setSale] = useState<SaleDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showPhoneModal, setShowPhoneModal] = useState(false);
    const [manualPhone, setManualPhone] = useState("");

    // Estados para vincular cliente
    const [showClientModal, setShowClientModal] = useState(false);
    const [clientSearchTerm, setClientSearchTerm] = useState("");
    const [searchedClients, setSearchedClients] = useState<Client[]>([]);
    const [isUpdatingClient, setIsUpdatingClient] = useState(false);

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
                                      quantityStock: parseFloat(
                                          String(item.product.quantityStock).replace(',', '.')
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

    const triggerWhatsAppSend = async (phone: string) => {
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
                const whatsappUrl = `https://wa.me/${phone.replace(
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

    const handleShareOnWhatsApp = async () => {
        if (sale?.client?.phone) {
            triggerWhatsAppSend(sale.client.phone);
        } else {
            setManualPhone("");
            setShowPhoneModal(true);
        }
    };

    // Búsqueda de cliente con debounce
    useEffect(() => {
        if (clientSearchTerm.trim() === "") {
            setSearchedClients([]);
            return;
        }
        const delayDebounceFn = setTimeout(async () => {
            try {
                const res = await fetch(`/api/clients?search=${encodeURIComponent(clientSearchTerm)}`);
                if (res.ok) {
                    const data = await res.json();
                    setSearchedClients(data);
                }
            } catch (err) {
                console.error(err);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [clientSearchTerm]);

    const handleLinkClient = async (clientId: number | null) => {
        setIsUpdatingClient(true);
        try {
            const res = await fetch(`/api/ventas/${saleId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientId }),
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || "Error al actualizar el cliente.");
            }
            const updatedSale = await res.json();
            setSale(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    client: updatedSale.client,
                };
            });
            toast.success(clientId ? "¡Cliente vinculado exitosamente!" : "¡Cliente desvinculado exitosamente!");
            setShowClientModal(false);
        } catch (err: any) {
            toast.error(err.message || "Error al vincular el cliente.");
        } finally {
            setIsUpdatingClient(false);
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
                        <h3 className='text-sm font-medium text-foreground-muted mb-1 flex items-center justify-between'>
                            <span className="flex items-center">
                                <UserCircle
                                    size={16}
                                    className='mr-2 text-primary'
                                />
                                Cliente
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    setClientSearchTerm("");
                                    setSearchedClients([]);
                                    setShowClientModal(true);
                                }}
                                className="text-xs text-primary hover:underline"
                            >
                                {sale.client ? "Cambiar" : "Vincular"}
                            </button>
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
                    <div>
                        <h3 className='text-sm font-medium text-foreground-muted mb-1 flex items-center'>
                            <Hash size={16} className='mr-2 text-primary' />
                            Caja
                        </h3>
                        <p className='text-foreground font-medium'>
                            {sale.cashRegister ? `#${sale.cashRegister.id} - ${sale.cashRegister.status === 'OPEN' ? 'Abierta' : 'Cerrada'}` : 'Sin caja'}
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
                            <p className='text-foreground font-medium'>
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

            {/* Modal para ingresar teléfono manual */}
            <AnimatePresence>
                {showPhoneModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowPhoneModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-muted text-foreground rounded-lg shadow-xl w-full max-w-md m-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-foreground flex items-center">
                                        <MessageSquare className="mr-2 text-primary" size={20} />
                                        Compartir por WhatsApp
                                    </h3>
                                    <button
                                        onClick={() => setShowPhoneModal(false)}
                                        className="p-1 rounded-full hover:bg-border transition-colors text-foreground-muted hover:text-foreground"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <p className="text-sm text-foreground-muted mb-4">
                                    Este cliente no posee número de teléfono registrado o no hay cliente vinculado a la venta. Por favor, ingrese el número de teléfono manualmente para enviar el PDF.
                                </p>
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="manual-phone-input" className="block text-xs font-semibold uppercase tracking-wider text-foreground-muted mb-2">
                                            Número de Teléfono
                                        </label>
                                        <input
                                            id="manual-phone-input"
                                            type="text"
                                            className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none"
                                            placeholder="Ej. 5491122334455"
                                            value={manualPhone}
                                            onChange={(e) => setManualPhone(e.target.value)}
                                        />
                                        <span className="text-[10px] text-foreground-muted mt-1 block">
                                            Incluya código de país y código de área sin espacios, guiones ni el prefijo +
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-background px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 rounded-b-lg gap-2">
                                <Button
                                    variant="whatsapp"
                                    onClick={() => {
                                        if (!manualPhone.trim()) {
                                            toast.error("Por favor, ingrese un número de teléfono.");
                                            return;
                                        }
                                        setShowPhoneModal(false);
                                        triggerWhatsAppSend(manualPhone);
                                    }}
                                    className="w-full sm:w-auto"
                                >
                                    Enviar
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowPhoneModal(false)}
                                    className="w-full sm:w-auto"
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal para vincular cliente */}
            <AnimatePresence>
                {showClientModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowClientModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-muted text-foreground rounded-lg shadow-xl w-full max-w-md m-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-foreground flex items-center">
                                        <UserCircle className="mr-2 text-primary" size={20} />
                                        Vincular Cliente
                                    </h3>
                                    <button
                                        onClick={() => setShowClientModal(false)}
                                        className="p-1 rounded-full hover:bg-border transition-colors text-foreground-muted hover:text-foreground"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <p className="text-sm text-foreground-muted mb-4">
                                    Busque y seleccione el cliente que desea vincular a esta venta.
                                </p>
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="client-search-input" className="block text-xs font-semibold uppercase tracking-wider text-foreground-muted mb-2">
                                            Buscar Cliente
                                        </label>
                                        <input
                                            id="client-search-input"
                                            type="text"
                                            className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none"
                                            placeholder="Buscar por nombre, email o DNI..."
                                            value={clientSearchTerm}
                                            onChange={(e) => setClientSearchTerm(e.target.value)}
                                            autoFocus
                                        />
                                    </div>

                                    {/* Resultados de búsqueda */}
                                    {clientSearchTerm.trim() !== "" && (
                                        <div className="max-h-60 overflow-y-auto border border-border rounded-lg bg-background divide-y divide-border">
                                            {searchedClients.length === 0 ? (
                                                <p className="p-3 text-sm text-foreground-muted text-center">
                                                    No se encontraron clientes.
                                                </p>
                                            ) : (
                                                searchedClients.map((client) => (
                                                    <button
                                                        key={client.id}
                                                        type="button"
                                                        onClick={() => handleLinkClient(client.id)}
                                                        disabled={isUpdatingClient}
                                                        className="w-full text-left p-3 text-sm hover:bg-muted transition-colors flex justify-between items-center text-foreground disabled:opacity-50"
                                                    >
                                                        <div>
                                                            <span className="font-semibold">
                                                                {client.firstName} {client.lastName || ""}
                                                            </span>
                                                            {client.email && (
                                                                <span className="block text-xs text-foreground-muted">
                                                                    {client.email}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-primary font-medium">
                                                            Seleccionar
                                                        </span>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="bg-background px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 rounded-b-lg gap-2">
                                {sale.client && (
                                    <Button
                                        variant="destructive"
                                        onClick={() => handleLinkClient(null)}
                                        disabled={isUpdatingClient}
                                        className="w-full sm:w-auto"
                                    >
                                        Desvincular Cliente
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={() => setShowClientModal(false)}
                                    disabled={isUpdatingClient}
                                    className="w-full sm:w-auto"
                                >
                                    Cerrar
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SaleDetailPage;
