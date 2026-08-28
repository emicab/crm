"use client";

import React from "react";
import {
  Clock,
  Phone,
  MapPin,
  Truck,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import type { WebOrder, WebOrderItem } from "@/hooks/useWebOrdersController";

interface ParsedModifier {
  groupName: string;
  optionName: string;
  priceExtra?: number;
  colorHex?: string;
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

function ScheduledBadge({
  scheduledFor,
  prominent = false,
}: {
  scheduledFor?: string | null;
  prominent?: boolean;
}) {
  if (!scheduledFor) return null;
  const date = new Date(scheduledFor);
  if (!(date.getTime() > Date.now())) return null;
  const label = date.toLocaleString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (prominent) {
    return (
      <div className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-amber-400 text-amber-950 font-black text-xs shadow-md shadow-amber-500/20 border border-amber-300">
        <span className="flex items-center gap-1.5 tracking-wider uppercase text-[11px] font-black">
          <Clock size={14} className="shrink-0 stroke-[2.5]" />
          <span>AGENDADO PARA</span>
        </span>
        <span className="font-mono text-xs bg-amber-950/15 px-2 py-0.5 rounded-md font-bold">
          {label}
        </span>
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-amber-950 border border-amber-300 shadow-sm">
      <Clock size={12} className="shrink-0 stroke-[2.5]" /> Agendado {label}
    </span>
  );
}

interface ComandaCardProps {
  order: WebOrder;
  onOpenDetail: (order: WebOrder) => void;
  onStatusChange: (orderId: number, status: WebOrder["status"]) => void;
  requireMpForDelivery?: boolean;
}

export function ComandaCard({
  order,
  onOpenDetail,
  onStatusChange,
  requireMpForDelivery = true,
}: ComandaCardProps) {
  const isScheduled =
    order.scheduledFor && new Date(order.scheduledFor) > new Date();

  const isMpUnpaid =
    (order.paymentMethod || "").toUpperCase().includes("MERCADO") &&
    order.paymentStatus !== "PAID";
  const blockedByPayment = isMpUnpaid && requireMpForDelivery;

  return (
    <div
      className={`rounded-2xl border bg-card text-card-foreground shadow-md overflow-hidden flex flex-col justify-between transition-all duration-200 ${
        isScheduled
          ? "border-amber-400 ring-2 ring-amber-400/40 shadow-amber-500/10"
          : order.status === "PENDING_REVIEW"
          ? "border-rose-400 ring-2 ring-rose-400/30"
          : "border-border"
      }`}
    >
      {/* Comanda Card Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-black text-base text-cyan-400">
              #{order.webOrderNumber}
            </span>
            {order.origin === "PEDIDOS_YA" && (
              <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md bg-rose-600 text-white border border-rose-400">
                🔴 PedidosYa
              </span>
            )}
            {order.origin === "RAPPI" && (
              <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md bg-amber-600 text-white border border-amber-400">
                🟠 Rappi
              </span>
            )}
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-white/10 border border-white/20">
              {order.deliveryType === "DELIVERY" ? "🚚 Envío" : "🏬 Retiro"}
            </span>
          </div>

          <span
            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
              order.status === "CANCELLED"
                ? "bg-slate-500/30 text-slate-300 border border-slate-500/40"
                : order.paymentStatus === "PAID"
                ? "bg-emerald-500 text-white"
                : blockedByPayment
                ? "bg-rose-500/30 text-rose-200 border border-rose-500/40"
                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
            }`}
          >
            {order.status === "CANCELLED"
              ? "CANCELADO"
              : order.paymentStatus === "PAID"
              ? "PAGADO"
              : blockedByPayment
              ? "ESPERANDO PAGO"
              : "PENDIENTE PAGO"}
          </span>
        </div>

        {/* Código corto de retiro para el Rider (PedidosYa) */}
        {(order as any).orderCode && (
          <div className="bg-rose-500/20 border border-rose-500/40 p-1.5 rounded-lg flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-300">CÓDIGO RIDER:</span>
            <span className="font-mono font-black text-sm text-yellow-300 tracking-wider">
              {(order as any).orderCode}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
          <span className="font-bold text-white truncate max-w-[180px]">
            👤 {order.clientName}
          </span>
          <span className="text-[11px] text-slate-400">
            {new Date(order.createdAt).toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {order.scheduledFor && (
          <div className="pt-1">
            <ScheduledBadge scheduledFor={order.scheduledFor} prominent={true} />
          </div>
        )}
      </div>

      {/* Comanda Card Body - Items */}
      <div className="p-4 flex-1 space-y-3 min-h-0">
        {order.shippingAddress && order.deliveryType === "DELIVERY" && (
          <p className="text-xs text-foreground-muted flex items-start gap-1.5 bg-muted/60 p-2 rounded-xl border border-border/40">
            <MapPin size={14} className="text-rose-500 shrink-0 mt-0.5" />
            <span className="font-medium truncate">{order.shippingAddress}</span>
          </p>
        )}

        <div className="space-y-2 divide-y divide-border/40">
          {order.items.map((it) => {
            const mods = parseItemModifiers(it);
            return (
              <div key={it.id} className="pt-2 first:pt-0">
                <div className="flex items-start justify-between gap-2 text-xs">
                  <span className="font-bold text-foreground">
                    {it.quantity}× {it.product?.name || `Producto #${it.productId}`}
                  </span>
                  <span className="font-mono font-bold text-foreground shrink-0">
                    {formatCurrency(parseFloat(it.subtotal))}
                  </span>
                </div>
                {mods.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 pl-3">
                    {mods.map((m, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700"
                      >
                        {m.groupName}: {m.optionName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Comanda Card Footer - Total and Actions */}
      <div className="p-3 bg-muted/40 border-t border-border space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-foreground-muted">Total:</span>
          <span className="text-base font-black font-mono text-cyan-600 dark:text-cyan-400">
            {formatCurrency(parseFloat(order.totalAmount))}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenDetail(order)}
            className="p-2 rounded-xl border border-border bg-background hover:bg-muted text-foreground-muted hover:text-foreground text-xs font-bold transition-colors cursor-pointer"
            title="Ver detalle completo"
          >
            <Eye size={16} />
          </button>

          {order.status === "PENDING_PREPARATION" && blockedByPayment && (
            <button
              type="button"
              disabled
              title="Esperando confirmación del pago de Mercado Pago"
              className="flex-1 py-2 px-3 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-not-allowed"
            >
              <Clock size={15} /> Esperando Pago
            </button>
          )}

          {order.status === "PENDING_PREPARATION" && !blockedByPayment && (
            <button
              type="button"
              onClick={() => onStatusChange(order.id, "READY_FOR_PICKUP")}
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={15} /> Marcar Listo
            </button>
          )}

          {order.status === "READY_FOR_PICKUP" && (
            <button
              type="button"
              onClick={() =>
                onStatusChange(
                  order.id,
                  order.deliveryType === "DELIVERY" ? "SHIPPED" : "DELIVERED",
                )
              }
              className="flex-1 py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Truck size={15} />{" "}
              {order.deliveryType === "DELIVERY"
                ? "Enviar a Domicilio"
                : "Entregar al Cliente"}
            </button>
          )}

          {order.status === "SHIPPED" && (
            <button
              type="button"
              onClick={() => onStatusChange(order.id, "DELIVERED")}
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={15} /> Confirmar Entrega
            </button>
          )}

          {(order.status === "DELIVERED" || order.status === "CANCELLED") && (
            <span className="flex-1 text-center py-1.5 text-xs font-extrabold uppercase text-foreground-muted">
              {order.status === "DELIVERED" ? "✅ Entregado" : "❌ Cancelado"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
