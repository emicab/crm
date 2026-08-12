"use client";

import React from "react";
import { Search } from "lucide-react";

interface WebOrdersFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  paymentStatusFilter: string;
  onPaymentStatusFilterChange: (value: string) => void;
  totalFiltered: number;
}

export function WebOrdersFilterBar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  paymentStatusFilter,
  onPaymentStatusFilterChange,
  totalFiltered,
}: WebOrdersFilterBarProps) {
  return (
    <div className="bg-muted p-4 rounded-2xl border border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
      <div className="relative flex-1">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por #pedido, cliente, teléfono o dirección..."
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="p-2 rounded-xl border border-border bg-background text-foreground font-semibold outline-none cursor-pointer"
        >
          <option value="ALL">Todos los Estados</option>
          <option value="ACTIVE">🔥 Activos (En curso)</option>
          <option value="PENDING_PREPARATION">🟡 En preparación</option>
          <option value="READY_FOR_PICKUP">🟢 Listo para retiro</option>
          <option value="SHIPPED">🚚 En camino</option>
          <option value="DELIVERED">✅ Entregados</option>
          <option value="PENDING_REVIEW">⚠️ En revisión de stock</option>
          <option value="CANCELLED">❌ Cancelados</option>
        </select>

        <select
          value={paymentStatusFilter}
          onChange={(e) => onPaymentStatusFilterChange(e.target.value)}
          className="p-2 rounded-xl border border-border bg-background text-foreground font-semibold outline-none cursor-pointer"
        >
          <option value="ALL">Todos los Pagos</option>
          <option value="PAID">✓ Pagados</option>
          <option value="PENDING">⌛ Pago Pendiente (MP)</option>
          <option value="UNPAID">💵 Pago al Entregar / Presencial</option>
        </select>

        <span className="text-foreground-muted font-mono font-bold px-2">
          {totalFiltered} result.
        </span>
      </div>
    </div>
  );
}
