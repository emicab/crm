"use client";

import React from "react";
import { Eye, Truck, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import type { WebOrder } from "@/hooks/useWebOrdersController";

interface OrdersTableProps {
  orders: WebOrder[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onSelectAll: () => void;
  onOpenDetail: (order: WebOrder) => void;
  onStatusChange: (orderId: number, status: WebOrder["status"]) => void;
  requireMpForDelivery?: boolean;
}

export function OrdersTable({
  orders,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onOpenDetail,
  onStatusChange,
  requireMpForDelivery = true,
}: OrdersTableProps) {
  return (
    <div className="bg-muted rounded-2xl border border-border overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-background/50 font-bold uppercase tracking-wider text-foreground-muted">
            <tr>
              <th className="py-3 px-3 w-8 text-center">
                <input
                  type="checkbox"
                  checked={orders.length > 0 && selectedIds.size === orders.length}
                  onChange={onSelectAll}
                  className="rounded border-border cursor-pointer"
                />
              </th>
              <th className="py-3 px-3">Pedido</th>
              <th className="py-3 px-3">Cliente</th>
              <th className="py-3 px-3">Modalidad</th>
              <th className="py-3 px-3">Pago</th>
              <th className="py-3 px-3">Estado</th>
              <th className="py-3 px-3 text-right">Total</th>
              <th className="py-3 px-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-foreground-muted py-12">
                  No se encontraron pedidos web.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-background/80 transition-colors"
                >
                  <td className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(order.id)}
                      onChange={() => onToggleSelect(order.id)}
                      className="rounded border-border cursor-pointer"
                    />
                  </td>
                  <td className="py-3 px-3 font-mono font-extrabold text-foreground">
                    #{order.webOrderNumber}
                  </td>
                  <td className="py-3 px-3 font-semibold text-foreground">
                    <div>{order.clientName}</div>
                    <div className="text-[11px] text-foreground-muted">
                      {order.clientPhone}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-foreground">
                      {order.deliveryType === "DELIVERY" ? "🚚 Envío" : "🏬 Retiro"}
                    </span>
                    {order.shippingAddress && (
                      <div className="text-[11px] text-foreground-muted truncate max-w-[150px]">
                        {order.shippingAddress}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        order.paymentStatus === "PAID"
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                          : (order.paymentMethod || "").toUpperCase().includes("MERCADO") &&
                            requireMpForDelivery
                          ? "bg-rose-500/10 text-rose-600 border border-rose-500/30"
                          : "bg-amber-500/10 text-amber-600 border border-amber-500/30"
                      }`}
                    >
                      {order.paymentStatus === "PAID"
                        ? "Pagado"
                        : (order.paymentMethod || "").toUpperCase().includes("MERCADO") &&
                          requireMpForDelivery
                        ? "Esperando Pago"
                        : "Pendiente"}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-foreground">
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                    {formatCurrency(parseFloat(order.totalAmount))}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onOpenDetail(order)}
                      className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
