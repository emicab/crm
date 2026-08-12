"use client";

import React from "react";
import { ComandaCard } from "./ComandaCard";
import type { WebOrder } from "@/hooks/useWebOrdersController";

interface ComandaGridProps {
  orders: WebOrder[];
  onOpenDetail: (order: WebOrder) => void;
  onStatusChange: (orderId: number, status: WebOrder["status"]) => void;
  requireMpForDelivery?: boolean;
}

export function ComandaGrid({
  orders,
  onOpenDetail,
  onStatusChange,
  requireMpForDelivery = true,
}: ComandaGridProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-16 bg-muted rounded-2xl border border-border space-y-3">
        <p className="font-bold text-foreground text-base">
          No hay comandas activas en este momento.
        </p>
        <p className="text-xs text-foreground-muted max-w-sm mx-auto">
          Los nuevos pedidos recibidos por la tienda web o registrados manualmente
          aparecerán automáticamente en esta grilla.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {orders.map((order) => (
        <ComandaCard
          key={order.id}
          order={order}
          requireMpForDelivery={requireMpForDelivery}
          onOpenDetail={onOpenDetail}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );
}
