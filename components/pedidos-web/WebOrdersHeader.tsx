"use client";

import React from "react";
import { Plus, RefreshCcw, ShoppingBag } from "lucide-react";
import Button from "@/components/ui/Button";

interface WebOrdersHeaderProps {
  totalOrders: number;
  activeOrdersCount: number;
  viewMode: "table" | "comanda";
  autoRefresh: boolean;
  isPulling: boolean;
  onToggleViewMode: (mode: "table" | "comanda") => void;
  onToggleAutoRefresh: () => void;
  onPullOrders: () => void;
  onOpenManualModal: () => void;
}

export function WebOrdersHeader({
  totalOrders,
  activeOrdersCount,
  viewMode,
  autoRefresh,
  isPulling,
  onToggleViewMode,
  onToggleAutoRefresh,
  onPullOrders,
  onOpenManualModal,
}: WebOrdersHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <ShoppingBag className="text-blue-600 dark:text-blue-400" size={32} />
          Pedidos Web & Comanda Online
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Gestioná y prepará en tiempo real los pedidos recibidos desde tu tienda
          web ClinStore.
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Switcher Vista Comanda vs Tabla */}
        <div className="bg-muted p-1 rounded-xl border border-border flex items-center gap-1">
          <button
            type="button"
            onClick={() => onToggleViewMode("comanda")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "comanda"
                ? "bg-background text-foreground shadow-xs"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            🍔 Comanda ({activeOrdersCount})
          </button>
          <button
            type="button"
            onClick={() => onToggleViewMode("table")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "table"
                ? "bg-background text-foreground shadow-xs"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            📋 Tabla ({totalOrders})
          </button>
        </div>

        {/* Auto Refresh Toggle */}
        <button
          type="button"
          onClick={onToggleAutoRefresh}
          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
            autoRefresh
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
              : "bg-muted text-foreground-muted border-border"
          }`}
          title="Actualización automática en segundo plano cada 10 segundos"
        >
          <span
            className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`}
          />
          Auto 10s
        </button>

        <Button
          type="button"
          variant="outline"
          onClick={onPullOrders}
          disabled={isPulling}
        >
          <RefreshCcw
            size={16}
            className={`mr-1.5 ${isPulling ? "animate-spin" : ""}`}
          />
          Actualizar
        </Button>

        <Button type="button" variant="primary" onClick={onOpenManualModal}>
          <Plus size={16} className="mr-1.5" /> Registrar Pedido Manual
        </Button>
      </div>
    </div>
  );
}
