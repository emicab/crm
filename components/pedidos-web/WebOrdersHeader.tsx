"use client";

import React from "react";
import { Plus, RefreshCcw, ShoppingBag, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import { FEATURE_PEYA, FEATURE_RAPPI } from "@/lib/featureFlags";

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
  const [outletStatus, setOutletStatus] = React.useState<"OPEN" | "BUSY" | "CLOSED">("OPEN");
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);
  const [isReconciling, setIsReconciling] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/integrations/outlet-status")
      .then((res) => res.json())
      .then((data) => {
        if (data.peyaStatus) setOutletStatus(data.peyaStatus);
      })
      .catch(() => {});
  }, []);

  const handleReconcile = async () => {
    try {
      setIsReconciling(true);
      const res = await fetch("/api/integrations/peya/reconcile?hours=24");
      const data = await res.json();
      if (res.ok) {
        toast.success(`Reconciliado: ${data.created} nuevos, ${data.skipped} ya existían`);
      } else {
        toast.error(data.message || "Error en la reconciliación");
      }
    } catch (error) {
      console.error("Error en reconciliación de PedidosYa:", error);
      toast.error("No se pudo reconciliar con PedidosYa");
    } finally {
      setIsReconciling(false);
    }
  };

  const handleStatusChange = async (newStatus: "OPEN" | "BUSY" | "CLOSED") => {
    try {
      setIsUpdatingStatus(true);
      const res = await fetch("/api/integrations/outlet-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peyaStatus: newStatus, rappiStatus: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setOutletStatus(newStatus);
      }
    } catch (error) {
      console.error("Error al actualizar estado de local:", error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <ShoppingBag className="text-blue-600 dark:text-blue-400" size={32} />
          Pedidos Web & Comanda Delivery
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Gestión unificada de pedidos en tiempo real: ClinStore, WhatsApp, PedidosYa y Rappi.
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Selector de Estado de Tienda (Open / Busy / Closed) */}
        {(FEATURE_PEYA || FEATURE_RAPPI) && (
        <div className="bg-muted p-1 rounded-xl border border-border flex items-center gap-1">
          <button
            type="button"
            disabled={isUpdatingStatus}
            onClick={() => handleStatusChange("OPEN")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              outletStatus === "OPEN"
                ? "bg-emerald-500 text-white shadow-xs"
                : "text-foreground-muted hover:text-foreground"
            }`}
            title="Local Abierto en PedidosYa / Rappi"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Abierto
          </button>
          <button
            type="button"
            disabled={isUpdatingStatus}
            onClick={() => handleStatusChange("BUSY")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              outletStatus === "BUSY"
                ? "bg-amber-500 text-amber-950 shadow-xs"
                : "text-foreground-muted hover:text-foreground"
            }`}
            title="Modo Ocupado / Alta Demanda"
          >
            <span className="w-2 h-2 rounded-full bg-amber-950" />
            Ocupado
          </button>
          <button
            type="button"
            disabled={isUpdatingStatus}
            onClick={() => handleStatusChange("CLOSED")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              outletStatus === "CLOSED"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-foreground-muted hover:text-foreground"
            }`}
            title="Pausar / Cerrar local en PedidosYa / Rappi"
          >
            <span className="w-2 h-2 rounded-full bg-white" />
            Cerrado
          </button>
        </div>

        )}

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

        {FEATURE_PEYA && (
        <Button
          type="button"
          variant="outline"
          onClick={handleReconcile}
          disabled={isReconciling}
          title="Trae pedidos de PedidosYa de las últimas 24h que no están en el POS"
        >
          <RotateCcw
            size={16}
            className={`mr-1.5 ${isReconciling ? "animate-spin" : ""}`}
          />
          Reconciliar PeYA
        </Button>
        )}

        <Button type="button" variant="primary" onClick={onOpenManualModal}>
          <Plus size={16} className="mr-1.5" /> Registrar Pedido Manual
        </Button>
      </div>
    </div>
  );
}
