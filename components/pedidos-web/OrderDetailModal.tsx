"use client";

import React from "react";
import {
  X,
  Printer,
  Link2,
  MessageCircle,
  Share2,
  Clock,
  MapPin,
  Truck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/formatCurrency";
import type { WebOrder, WebOrderItem, Branch } from "@/hooks/useWebOrdersController";
import toast from "react-hot-toast";

interface ParsedModifier {
  groupName: string;
  optionName: string;
  priceExtra?: number;
}

function parseItemModifiers(item: WebOrderItem): ParsedModifier[] {
  if (!item.modifiers) return [];
  try {
    const parsed =
      typeof item.modifiers === "string"
        ? JSON.parse(item.modifiers)
        : item.modifiers;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Texto legible del estado del pedido para el cliente (WhatsApp / compartir).
const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "pendiente de pago",
  PENDING_PREPARATION: "en preparación",
  PENDING_REVIEW: "en revisión de stock",
  READY_FOR_PICKUP: "listo para retiro",
  SHIPPED: "en camino",
  DELIVERED: "entregado",
  CANCELLED: "cancelado",
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] || status.toLowerCase().replace(/_/g, " ");
}

// Normaliza el teléfono a formato internacional AR (wa.me requiere 549...).
function normalizePhone(raw: string): string {
  const digits = String(raw || "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.startsWith("549")) return digits;
  if (digits.startsWith("54")) return "549" + digits.slice(2);
  return "549" + digits;
}

function openExternal(url: string) {
  import("@tauri-apps/plugin-shell")
    .then(({ open }) => open(url))
    .catch(() => {
      window.open(url, "_blank");
    });
}

interface OrderDetailModalProps {
  order: WebOrder | null;
  branches: Branch[];
  storeSlug: string;
  platformDomain: string;
  requireMpForDelivery?: boolean;
  onClose: () => void;
  onStatusChange: (orderId: number, status: WebOrder["status"]) => void;
  onBranchChange: (orderId: number, branchId: number | null) => void;
}

export function OrderDetailModal({
  order,
  branches,
  storeSlug,
  platformDomain,
  requireMpForDelivery = true,
  onClose,
  onStatusChange,
  onBranchChange,
}: OrderDetailModalProps) {
  if (!order) return null;

  const isMpUnpaid =
    (order.paymentMethod || "").toUpperCase().includes("MERCADO") &&
    order.paymentStatus !== "PAID";
  const blockedByPayment = isMpUnpaid && requireMpForDelivery;

  const storeBase = (platformDomain || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .toLowerCase() || "clinstore.vercel.app";

  const trackingLink = order.trackingCode
    ? `https://${storeBase}/${storeSlug || "tienda"}/pedido/${order.trackingCode}`
    : "";

  const handleCopyTrackingLink = () => {
    if (!trackingLink) return;
    navigator.clipboard.writeText(trackingLink);
    toast.success("Enlace de seguimiento copiado al portapapeles.");
  };

  const buildStatusMessage = () => {
    const state = statusLabel(order.status);
    return `¡Hola ${order.clientName}! Tu pedido #${order.webOrderNumber} está ${state} 📦\n\nSeguilo en tiempo real acá: ${trackingLink}`;
  };

  const handleSendWhatsAppTracking = () => {
    const cleanPhone = normalizePhone(order.clientPhone);
    if (!cleanPhone) {
      toast.error("El pedido no tiene un teléfono válido del cliente.");
      return;
    }
    if (!trackingLink) {
      toast.error("El pedido no tiene enlace de seguimiento.");
      return;
    }
    const msg = buildStatusMessage();
    openExternal(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`);
  };

  const handleShareStatus = () => {
    if (!trackingLink) {
      toast.error("El pedido no tiene enlace de seguimiento.");
      return;
    }
    navigator.clipboard.writeText(buildStatusMessage());
    toast.success("Estado del pedido copiado al portapapeles.");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-background text-foreground border border-border rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-border bg-muted/40 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold font-mono text-cyan-600 dark:text-cyan-400">
                Pedido #{order.webOrderNumber}
              </h3>
              <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 border border-cyan-500/30">
                {order.deliveryType === "DELIVERY" ? "🚚 Envío" : "🏬 Retiro"}
              </span>
            </div>
            <p className="text-xs text-foreground-muted mt-0.5">
              Recibido el {new Date(order.createdAt).toLocaleString("es-AR")}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-foreground-muted hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6 text-xs">
          {/* Tracking Link Bar */}
          {trackingLink && (
            <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 truncate">
                <Link2 size={16} className="text-cyan-500 shrink-0" />
                <span className="font-mono text-cyan-700 dark:text-cyan-300 truncate">
                  {trackingLink}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyTrackingLink}
                >
                  Copiar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleShareStatus}
                  title="Copiá el estado actual del pedido con su enlace de seguimiento"
                >
                  <Share2 size={14} className="mr-1" /> Compartir estado
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSendWhatsAppTracking}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  <MessageCircle size={14} className="mr-1" /> WhatsApp
                </Button>
              </div>
            </div>
          )}

          {/* Customer & Delivery Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-2xl border border-border/50">
            <div className="space-y-1">
              <p className="font-bold text-foreground text-sm">
                👤 {order.clientName}
              </p>
              <p className="text-foreground-muted">📞 {order.clientPhone}</p>
              {order.clientEmail && (
                <p className="text-foreground-muted">✉️ {order.clientEmail}</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="font-bold text-foreground">
                {order.deliveryType === "DELIVERY"
                  ? "🚚 Envío a Domicilio"
                  : "🏬 Retiro en Local"}
              </p>
              {order.shippingAddress && (
                <p className="text-foreground-muted flex items-start gap-1">
                  <MapPin size={13} className="shrink-0 mt-0.5 text-rose-500" />
                  <span>{order.shippingAddress}</span>
                </p>
              )}
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-3">
            <h4 className="font-bold text-foreground text-sm uppercase tracking-wider">
              Productos Solicitados
            </h4>
            <div className="divide-y divide-border/60 bg-muted/30 rounded-2xl p-3 border border-border/40">
              {order.items.map((it) => {
                const mods = parseItemModifiers(it);
                return (
                  <div
                    key={it.id}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3"
                  >
                    <div>
                      <p className="font-bold text-foreground">
                        {it.quantity}× {it.product?.name || `Producto #${it.productId}`}
                      </p>
                      {mods.length > 0 && (
                        <p className="text-foreground-muted text-[11px] mt-0.5">
                          {mods
                            .map(
                              (m) =>
                                `${m.groupName}: ${m.optionName}${
                                  m.priceExtra ? ` (+$${m.priceExtra})` : ""
                                }`,
                            )
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                    <span className="font-mono font-bold text-foreground">
                      {formatCurrency(parseFloat(it.subtotal))}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totals Breakdown */}
          <div className="space-y-1.5 pt-2 border-t border-border font-semibold text-right">
            <div className="flex justify-between text-foreground-muted">
              <span>Subtotal:</span>
              <span>
                {formatCurrency(parseFloat(order.subtotalAmount || order.totalAmount))}
              </span>
            </div>
            {order.deliveryFee && parseFloat(order.deliveryFee) > 0 && (
              <div className="flex justify-between text-foreground-muted">
                <span>Envío:</span>
                <span>+{formatCurrency(parseFloat(order.deliveryFee))}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black font-mono text-cyan-600 dark:text-cyan-400 pt-2 border-t border-border">
              <span>Total a cobrar:</span>
              <span>{formatCurrency(parseFloat(order.totalAmount))}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-muted/40 flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Acciones para PedidosYa / Rappi si aplica */}
            {(order.origin === "PEDIDOS_YA" || order.origin === "RAPPI") && order.status === "PENDING_PREPARATION" && (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="primary"
                  className="bg-rose-600 hover:bg-rose-500 text-white"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/integrations/order-action", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ orderId: order.id, action: "ACCEPT", prepTimeMinutes: 20 }),
                      });
                      if (res.ok) {
                        toast.success("Pedido aceptado exitosamente");
                        onStatusChange(order.id, "PENDING_PREPARATION");
                        onClose();
                      }
                    } catch (err) {
                      toast.error("Error al aceptar pedido externo");
                    }
                  }}
                >
                  <CheckCircle2 size={16} className="mr-1.5" /> Aceptar (20 min)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-rose-500/40 text-rose-600 hover:bg-rose-500/10"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/integrations/order-action", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ orderId: order.id, action: "CANCEL", cancelReason: "STORE_BUSY" }),
                      });
                      if (res.ok) {
                        toast.success("Pedido rechazado");
                        onStatusChange(order.id, "CANCELLED");
                        onClose();
                      }
                    } catch (err) {
                      toast.error("Error al cancelar pedido");
                    }
                  }}
                >
                  Rechazar
                </Button>
              </div>
            )}

            {/* Acciones genéricas / ClinStore */}
            {order.origin !== "PEDIDOS_YA" && order.origin !== "RAPPI" && order.status === "PENDING_PREPARATION" && blockedByPayment && (
              <Button
                type="button"
                variant="outline"
                disabled
                title="Esperando confirmación del pago de Mercado Pago"
                className="cursor-not-allowed border-amber-500/40 text-amber-700 dark:text-amber-400"
              >
                <Clock size={16} className="mr-1.5" /> Esperando Pago
              </Button>
            )}

            {order.origin !== "PEDIDOS_YA" && order.origin !== "RAPPI" && order.status === "PENDING_PREPARATION" && !blockedByPayment && (
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  onStatusChange(order.id, "READY_FOR_PICKUP");
                  onClose();
                }}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                <CheckCircle2 size={16} className="mr-1.5" /> Marcar Listo
              </Button>
            )}

            {order.status === "READY_FOR_PICKUP" && (
              <Button
                type="button"
                variant="primary"
                onClick={async () => {
                  if (order.origin === "PEDIDOS_YA" || order.origin === "RAPPI") {
                    await fetch("/api/integrations/order-action", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ orderId: order.id, action: "DISPATCH" }),
                    });
                  }
                  onStatusChange(
                    order.id,
                    order.deliveryType === "DELIVERY" ? "SHIPPED" : "DELIVERED",
                  );
                  onClose();
                }}
              >
                <Truck size={16} className="mr-1.5" />{" "}
                {order.deliveryType === "DELIVERY" ? "Despachar" : "Entregar"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
