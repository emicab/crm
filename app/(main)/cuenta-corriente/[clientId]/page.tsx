"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Plus, 
  DollarSign, 
  Loader2, 
  FileText, 
  Wallet, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown 
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import toast from "react-hot-toast";
import { PaymentTypeEnum } from "@/types";
import { getPaymentTypeDisplay } from "@/lib/displayTexts";

interface Movement {
  id: number;
  type: string;
  amount: string;
  description: string | null;
  saleId: number | null;
  createdAt: string;
}

interface Client {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
}

interface AccountDetails {
  id: number;
  clientId: number;
  balance: string;
  client: Client;
  movements: Movement[];
}

export default function ClienteCuentaDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.clientId as string;

  const [account, setAccount] = useState<AccountDetails | null>(null);
  const [hasOpenCaja, setHasOpenCaja] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulario de pago
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentTypeEnum>(PaymentTypeEnum.CASH);
  const [paymentDescription, setPaymentDescription] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Cargar balance y movimientos
      const accountRes = await fetch(`/api/cuenta-corriente?clientId=${clientId}`);
      if (!accountRes.ok) throw new Error("Error al obtener datos de cuenta.");
      const accountData = await accountRes.json();
      setAccount(accountData);

      // Cargar estado de caja
      const cajaRes = await fetch("/api/caja");
      if (cajaRes.ok) {
        const cajaData = await cajaRes.json();
        setHasOpenCaja(!!cajaData.open);
      }
    } catch (err: any) {
      toast.error(err.message || "Error al cargar ficha del cliente.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchData();
    }
  }, [clientId]);

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasOpenCaja) {
      toast.error("Debe haber una caja abierta para registrar un cobro.");
      return;
    }

    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Por favor, ingresá un monto válido mayor a cero.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/cuenta-corriente/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: parseInt(clientId),
          amount: amountNum,
          paymentType,
          description: paymentDescription.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Error al registrar el cobro");
      }

      toast.success("Pago registrado con éxito.");
      setShowPaymentModal(false);
      setPaymentAmount("");
      setPaymentDescription("");
      setPaymentType(PaymentTypeEnum.CASH);
      
      // Recargar ficha
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Error al procesar el pago.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="text-foreground-muted text-sm">Cargando ficha de cuenta corriente...</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-16">
        <p className="text-foreground">Ficha de cliente no encontrada.</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/cuenta-corriente")} className="mt-4">
          Volver
        </Button>
      </div>
    );
  }

  const { client, balance, movements } = account;
  const balanceVal = parseFloat(balance);
  const isDebt = balanceVal > 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Botón Volver */}
      <button 
        onClick={() => router.push("/cuenta-corriente")} 
        className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground font-semibold uppercase tracking-wider transition-colors"
      >
        <ArrowLeft size={14} /> Volver a cuentas corrientes
      </button>

      {/* Cabecera & Perfil */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info del Cliente */}
        <div className="bg-white border border-border p-6 rounded-2xl shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center gap-4 border-b border-border pb-4">
            <div className="bg-primary/10 text-primary p-3 rounded-full">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {client.firstName} {client.lastName || ""}
              </h2>
              <p className="text-xs text-foreground-muted">
                Cliente ID: #{client.id} &bull; Registrado el {new Date(client.createdAt).toLocaleDateString("es-AR")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-foreground">
            <div className="flex items-center gap-2 text-foreground-muted">
              <Phone size={16} className="shrink-0" />
              <span>{client.phone || "Sin teléfono"}</span>
            </div>
            <div className="flex items-center gap-2 text-foreground-muted">
              <Mail size={16} className="shrink-0 text-break" />
              <span className="truncate">{client.email || "Sin correo"}</span>
            </div>
            <div className="flex items-center gap-2 text-foreground-muted sm:col-span-2">
              <MapPin size={16} className="shrink-0" />
              <span>{client.address || "Sin dirección física"}</span>
            </div>
          </div>

          {client.notes && (
            <div className="bg-muted p-4 rounded-xl border border-border">
              <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider mb-1">Notas del cliente</p>
              <p className="text-xs text-foreground leading-relaxed">{client.notes}</p>
            </div>
          )}
        </div>

        {/* Info de Cuenta y Saldo */}
        <div className="bg-white border border-border p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">Saldo de la Cuenta</h3>
            <div className="mt-3">
              <p className={`text-3xl font-extrabold ${isDebt ? "text-destructive" : "text-success"}`}>
                ${Math.abs(balanceVal).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-foreground-muted mt-1 font-medium">
                {isDebt ? "El cliente tiene saldo deudor (debe)." : balanceVal < 0 ? "El cliente tiene saldo a favor (crédito)." : "Cuenta al día (saldo $0)."}
              </p>
            </div>
          </div>

          <div className="pt-6">
            {hasOpenCaja ? (
              <Button 
                variant="primary" 
                className="w-full flex items-center justify-center gap-2"
                onClick={() => setShowPaymentModal(true)}
              >
                <Plus size={16} /> Registrar Cobro
              </Button>
            ) : (
              <div className="bg-muted border border-border p-3.5 rounded-xl text-center flex flex-col items-center gap-1.5">
                <Wallet size={16} className="text-foreground-muted" />
                <p className="text-xs font-semibold text-foreground-muted leading-tight">
                  Abrí la caja para registrar cobros
                </p>
                <p className="text-[10px] text-foreground-muted/70 leading-normal">
                  Los ingresos de dinero deben registrarse sobre una caja abierta.
                </p>
              </div>
            )}

            {isDebt && client.phone && (
              <button
                type="button"
                onClick={() => {
                  const phoneVal = client.phone!.replace(/\D/g, "");
                  const finalPhone = phoneVal.startsWith("54") ? phoneVal : "549" + phoneVal;
                  const formattedBalance = balanceVal.toLocaleString("es-AR", { minimumFractionDigits: 2 });
                  const message = `Hola ${client.firstName}! Te recordamos que tenés un saldo pendiente en tu Cuenta Corriente con nosotros de $${formattedBalance}. Podés pasar por nuestro local a realizar entregas cuando gustes. ¡Muchas gracias!`;
                  window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`, "_blank");
                }}
                className="w-full mt-2.5 py-2 px-3 border border-emerald-500 hover:bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer bg-white"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.464L0 24zm6.59-4.846c1.6.95 3.198 1.451 4.937 1.452 5.466 0 9.909-4.444 9.913-9.91.002-2.651-1.02-5.143-2.877-7.001C16.808 1.838 14.321.815 11.99.815c-5.474 0-9.919 4.444-9.924 9.91-.001 1.89.504 3.734 1.466 5.361l-.961 3.507 3.577-.938zm11.567-7.643c-.307-.154-1.82-.9-2.1-.1-.28.1-.56.56-.687.7-.128.14-.256.155-.563.002-.307-.154-1.3-.478-2.477-1.528-.915-.815-1.532-1.822-1.712-2.129-.18-.308-.019-.475.135-.629.138-.138.307-.359.461-.539.154-.18.205-.308.307-.513.102-.206.051-.385-.026-.539-.077-.154-.687-1.657-.942-2.27-.249-.598-.5-.517-.687-.527-.179-.009-.385-.01-.59-.01-.205 0-.539.077-.82.385-.282.308-1.077 1.051-1.077 2.562 0 1.512 1.102 2.973 1.256 3.178.154.205 2.169 3.313 5.253 4.643.734.316 1.307.505 1.753.647.737.234 1.407.2 1.938.12.593-.09 1.82-.743 2.076-1.461.256-.718.256-1.333.179-1.461-.077-.128-.282-.205-.59-.359z"/>
                </svg>
                Notificar Deuda por WhatsApp
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Historial de Movimientos */}
      <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <span className="inline-block w-1.5 h-5 bg-primary rounded-full align-middle" />
          Historial de Movimientos
        </h2>

        {movements.length === 0 ? (
          <div className="py-12 text-center text-foreground-muted text-sm border border-dashed border-border rounded-xl">
            <Calendar size={24} className="mx-auto text-foreground-muted/40 mb-2" />
            No hay movimientos registrados en esta cuenta corriente.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted text-foreground-muted font-medium text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Fecha</th>
                  <th className="px-6 py-3 text-left">Concepto / Descripción</th>
                  <th className="px-6 py-3 text-right">Variación Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white text-foreground">
                {movements.map((m) => {
                  const amt = parseFloat(m.amount);
                  const isPayment = m.type === "PAYMENT";
                  
                  let conceptText = "";
                  if (m.type === "SALE_ON_ACCOUNT") conceptText = "Venta en Cta Cte";
                  else if (m.type === "PAYMENT") conceptText = "Entrega de Dinero";
                  else conceptText = "Ajuste de Saldo";

                  return (
                    <tr key={m.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-foreground-muted text-xs">
                        {new Date(m.createdAt).toLocaleString("es-AR")}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isPayment ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                          }`}>
                            {conceptText}
                          </span>
                          <span className="font-medium text-foreground text-sm">
                            {m.description}
                          </span>
                          {m.saleId && (
                            <Link href={`/ventas`} className="text-xs text-primary hover:underline font-mono shrink-0 ml-1">
                              (Ver Venta #{m.saleId})
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-semibold">
                        <span className={isPayment ? "text-success" : "text-destructive"}>
                          {isPayment ? "-" : "+"}${Math.abs(amt).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Registrar Cobro (Payment Modal) */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}>
          <form 
            onSubmit={handleRegisterPayment} 
            className="bg-muted text-foreground rounded-2xl shadow-xl w-full max-w-md m-4 p-6 space-y-4" 
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
              <DollarSign size={20} className="text-primary" /> Registrar Cobro / Entrega
            </h3>
            <p className="text-xs text-foreground-muted">
              Registrá una entrega de dinero del cliente. El monto amortizará su saldo deudor actual y se ingresará a la caja abierta.
            </p>

            <div className="space-y-4">
              <Input
                label="Monto a Cobrar ($) *"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required
                disabled={isSubmitting}
              />

              <Select
                label="Método de Pago *"
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as PaymentTypeEnum)}
                required
                disabled={isSubmitting}
              >
                {/* Omitimos ON_ACCOUNT para registrar un pago de deuda */}
                {Object.values(PaymentTypeEnum)
                  .filter(type => type !== PaymentTypeEnum.ON_ACCOUNT)
                  .map((type) => (
                    <option key={type} value={type}>
                      {getPaymentTypeDisplay(type)}
                    </option>
                  ))}
              </Select>

              <Input
                label="Descripción / Detalle (Opcional)"
                placeholder="Ej: Entrega a cuenta, Pago de factura..."
                value={paymentDescription}
                onChange={(e) => setPaymentDescription(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowPaymentModal(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                variant="primary"
                disabled={isSubmitting || !paymentAmount}
              >
                {isSubmitting ? "Procesando..." : "Registrar Pago"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
