"use client";

import React, { useState } from "react";
import { RefreshCcw, Send, CheckCircle, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { FEATURE_PEYA } from "@/lib/featureFlags";

export function CatalogSyncButton() {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!FEATURE_PEYA) {
    return null;
  }

  const handleSync = async () => {
    try {
      setLoading(true);
      setStatusMsg(null);
      setErrorMsg(null);

      const res = await fetch("/api/integrations/catalog-sync", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al sincronizar catálogo");
      }

      setStatusMsg(data.message || "Catálogo sincronizado exitosamente");
    } catch (err: any) {
      setErrorMsg(err.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        onClick={handleSync}
        disabled={loading}
        className="text-xs font-bold border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
        title="Enviar catálogo público a la API de PedidosYa"
      >
        {loading ? (
          <RefreshCcw size={14} className="animate-spin mr-1.5" />
        ) : (
          <Send size={14} className="mr-1.5" />
        )}
        {loading ? "Sincronizando..." : "Publicar en PedidosYa"}
      </Button>

      {statusMsg && (
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
          <CheckCircle size={12} /> {statusMsg}
        </span>
      )}

      {errorMsg && (
        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
          <AlertCircle size={12} /> {errorMsg}
        </span>
      )}
    </div>
  );
}
