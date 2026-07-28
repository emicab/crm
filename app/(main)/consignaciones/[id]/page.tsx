"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, RefreshCcw, AlertCircle, CheckCircle, DollarSign } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";

interface ConsignmentItem {
  id: number;
  productId: number;
  quantityGiven: number;
  quantitySold: number;
  quantityReturned: number;
  priceAtGiven: string;
  product?: {
    name: string;
  };
}

interface Consignment {
  id: number;
  clientId: number;
  status: "DELIVERED" | "SETTLED" | "CANCELLED";
  notes?: string;
  createdAt: string;
  client: {
    firstName: string;
    lastName?: string;
    email?: string;
  };
  items: ConsignmentItem[];
}

export default function RendirConsignacionPage() {
  const router = useRouter();
  const params = useParams();
  const consignmentId = params?.id as string;

  const [consignment, setConsignment] = useState<Consignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado para el formulario de rendición
  const [settlementData, setSettlementData] = useState<
    Record<number, { quantitySold: number | string; quantityReturned: number | string }>
  >({});
  const [paymentType, setPaymentType] = useState<string>("CASH");
  const [invoiceType, setInvoiceType] = useState<string>("NONE");
  const [arcaEnabled, setArcaEnabled] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Verificar si la facturación electrónica ARCA está habilitada en la configuración
    fetch("/api/arca/status")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.enabled) {
          setArcaEnabled(true);
        }
      })
      .catch(() => {});
  }, []);

  const fetchConsignment = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/consignaciones/${consignmentId}`);
      if (!res.ok) throw new Error("Consignación no encontrada.");
      const data: Consignment = await res.json();
      setConsignment(data);

      // Inicializar el formulario con valores por defecto
      const initialMap: Record<number, { quantitySold: number | string; quantityReturned: number | string }> = {};
      data.items.forEach((item) => {
        initialMap[item.id] = {
          quantitySold: data.status === "SETTLED" ? item.quantitySold : item.quantityGiven,
          quantityReturned: data.status === "SETTLED" ? item.quantityReturned : 0,
        };
      });
      setSettlementData(initialMap);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (consignmentId) {
      fetchConsignment();
    }
  }, [consignmentId]);

  const handleSoldChange = (itemId: number, rawVal: string, maxQty: number) => {
    if (rawVal === "") {
      setSettlementData((prev) => ({
        ...prev,
        [itemId]: { quantitySold: "", quantityReturned: maxQty },
      }));
      return;
    }
    const num = parseFloat(rawVal);
    if (isNaN(num)) return;
    const validSold = Math.max(0, Math.min(num, maxQty));
    const autoReturned = maxQty - validSold;
    setSettlementData((prev) => ({
      ...prev,
      [itemId]: {
        quantitySold: validSold,
        quantityReturned: autoReturned,
      },
    }));
  };

  const handleReturnedChange = (itemId: number, rawVal: string, maxQty: number) => {
    if (rawVal === "") {
      setSettlementData((prev) => ({
        ...prev,
        [itemId]: { quantitySold: maxQty, quantityReturned: "" },
      }));
      return;
    }
    const num = parseFloat(rawVal);
    if (isNaN(num)) return;
    const validReturned = Math.max(0, Math.min(num, maxQty));
    const autoSold = maxQty - validReturned;
    setSettlementData((prev) => ({
      ...prev,
      [itemId]: {
        quantitySold: autoSold,
        quantityReturned: validReturned,
      },
    }));
  };

  // Calcular total a cobrar por lo vendido
  const totalAmountToCollect = consignment
    ? consignment.items.reduce((acc, item) => {
        const sold = parseFloat(String(settlementData[item.id]?.quantitySold || 0)) || 0;
        return acc + sold * parseFloat(item.priceAtGiven);
      }, 0)
    : 0;

  const handleSubmitSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consignment) return;

    const settlementItems = consignment.items.map((item) => ({
      itemId: item.id,
      quantitySold: parseFloat(String(settlementData[item.id]?.quantitySold || 0)) || 0,
      quantityReturned: parseFloat(String(settlementData[item.id]?.quantityReturned || 0)) || 0,
    }));

    setSubmitting(true);
    try {
      const res = await fetch(`/api/consignaciones/${consignment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settlementItems,
          paymentType,
          invoiceType,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Error al rendir la consignación.");
      }

      const resData = await res.json();

      if (resData.invoice) {
        toast.success(`¡Factura ARCA autorizada con éxito! CAE: ${resData.invoice.cae}`);
      } else if (resData.arcaError) {
        toast.error(`Rendición completada con advertencia ARCA: ${resData.arcaError}`);
      } else {
        toast.success("¡Rendición procesada exitosamente! Se generó la venta correspondiente y se devolvió el stock restante.");
      }

      fetchConsignment();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
        <span className="ml-3 text-foreground-muted">Cargando consignación...</span>
      </div>
    );
  }

  if (error || !consignment) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={48} className="mx-auto text-destructive mb-3" />
        <h2 className="text-xl font-semibold text-foreground mb-2">{error || "No encontrada"}</h2>
        <Button variant="outline" onClick={() => router.push("/consignaciones")}>
          Volver a Consignaciones
        </Button>
      </div>
    );
  }

  const isDelivered = consignment.status === "DELIVERED";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <Button variant="outline" size="sm" onClick={() => router.push("/consignaciones")} className="mb-3">
          <ArrowLeft size={16} className="mr-2" /> Volver a Consignaciones
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <RefreshCcw className="text-primary" size={28} /> Consignación #{consignment.id}
            </h1>
            <p className="text-foreground-muted text-sm mt-1">
              Cliente: <strong className="text-foreground">{consignment.client.firstName} {consignment.client.lastName || ""}</strong>
            </p>
          </div>
          <div>
            {isDelivered ? (
              <span className="bg-amber-100 text-amber-800 text-sm px-3 py-1.5 rounded-full font-semibold">
                Pendiente de Rendición
              </span>
            ) : consignment.status === "SETTLED" ? (
              <span className="bg-emerald-100 text-emerald-800 text-sm px-3 py-1.5 rounded-full font-semibold flex items-center gap-1">
                <CheckCircle size={16} /> Saldada
              </span>
            ) : (
              <span className="bg-red-100 text-red-800 text-sm px-3 py-1.5 rounded-full font-semibold">
                Cancelada
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Detalle / Formulario de Rendición */}
      <form onSubmit={handleSubmitSettlement} className="space-y-6">
        <div className="bg-muted p-6 rounded-xl shadow space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Productos Entregados y Arqueo</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-foreground font-semibold">
                  <th className="p-3">Producto</th>
                  <th className="p-3 text-center">Precio Unit.</th>
                  <th className="p-3 text-center">Entregados</th>
                  <th className="p-3 text-center w-32">Vendidos</th>
                  <th className="p-3 text-center w-32">Devueltos a Stock</th>
                  <th className="p-3 text-right">Subtotal Cobrado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {consignment.items.map((item) => {
                  const sData = settlementData[item.id] || {
                    quantitySold: item.quantitySold,
                    quantityReturned: item.quantityReturned,
                  };
                  const soldQty = parseFloat(String(sData.quantitySold || 0)) || 0;
                  const itemSubtotal = soldQty * parseFloat(item.priceAtGiven);

                  return (
                    <tr key={item.id} className="hover:bg-background/40">
                      <td className="p-3 font-medium text-foreground">{item.product?.name || "Producto"}</td>
                      <td className="p-3 text-center text-foreground-muted">${item.priceAtGiven}</td>
                      <td className="p-3 text-center font-semibold text-foreground">{item.quantityGiven}</td>
                      <td className="p-3 text-center">
                        {isDelivered ? (
                          <Input
                            type="number"
                            step="any"
                            min={0}
                            max={item.quantityGiven}
                            value={sData.quantitySold}
                            onChange={(e) =>
                              handleSoldChange(item.id, e.target.value, item.quantityGiven)
                            }
                            className="w-24 text-center py-1 font-semibold"
                          />
                        ) : (
                          <span className="font-semibold text-emerald-600">{item.quantitySold}</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {isDelivered ? (
                          <Input
                            type="number"
                            step="any"
                            min={0}
                            max={item.quantityGiven}
                            value={sData.quantityReturned}
                            onChange={(e) =>
                              handleReturnedChange(item.id, e.target.value, item.quantityGiven)
                            }
                            className="w-24 text-center py-1 text-foreground-muted"
                          />
                        ) : (
                          <span className="text-foreground-muted">{item.quantityReturned}</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold text-foreground">${itemSubtotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Resumen Final */}
          <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between pt-4 border-t border-border gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="space-y-1">
                <span className="text-xs text-foreground-muted block">Forma de Pago:</span>
                {isDelivered ? (
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="block rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="CASH">Efectivo</option>
                    <option value="TRANSFER">Transferencia</option>
                    <option value="CARD">Tarjeta</option>
                    <option value="QR">MercadoPago / QR</option>
                    <option value="ON_ACCOUNT">Cargar a Cuenta Corriente</option>
                  </select>
                ) : (
                  <div className="text-sm font-semibold text-foreground flex items-center gap-1">
                    <DollarSign size={16} /> Venta registrada y saldada
                  </div>
                )}
              </div>

              {isDelivered && (
                <div className="space-y-1">
                  <span className="text-xs text-foreground-muted block flex items-center gap-1">
                    Facturación (ARCA / AFIP):
                    {arcaEnabled && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded font-bold">
                        ⚡ ONLINE
                      </span>
                    )}
                  </span>
                  <select
                    value={invoiceType}
                    onChange={(e) => setInvoiceType(e.target.value)}
                    className="block rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="NONE">Sin Factura (Comprobante Interno)</option>
                    <option value="FACTURA_B">Factura B (Consumidor Final)</option>
                    <option value="FACTURA_A">Factura A (Resp. Inscripto)</option>
                    <option value="FACTURA_C">Factura C (Monotributo)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="text-right">
              <span className="text-xs text-foreground-muted block">Total a Cobrar por Vendidos:</span>
              <span className="text-2xl font-bold text-primary">${totalAmountToCollect.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        {isDelivered && (
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => router.push("/consignaciones")} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
              Finalizar Rendición
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
