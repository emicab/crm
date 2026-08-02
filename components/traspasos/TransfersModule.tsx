"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Loader2,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  Ban,
  Inbox,
  Send,
} from "lucide-react";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import type { StockTransfer } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  SENT: "Enviado",
  COMPLETED: "Completado",
  REJECTED: "Rechazado",
  CANCELLED: "Cancelado",
};

export function TransfersModule() {
  const [deviceBranchId, setDeviceBranchId] = useState<number | null>(null);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"entrantes" | "salientes">("entrantes");
  const [receivedMap, setReceivedMap] = useState<Record<string, number>>({});
  const [acting, setActing] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [resDev, resTr] = await Promise.all([
        fetch("/api/branches/device"),
        fetch("/api/stock-transfers"),
      ]);
      if (resDev.ok) {
        const d = await resDev.json();
        setDeviceBranchId(Number(d.deviceBranchId) || null);
      }
      if (resTr.ok) {
        const data = await resTr.json();
        setTransfers(data);
      }
    } catch {
      toast.error("Error al cargar los traspasos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const incoming = useMemo(
    () => transfers.filter((t) => t.targetBranchId === deviceBranchId),
    [transfers, deviceBranchId],
  );
  const outgoing = useMemo(
    () => transfers.filter((t) => t.sourceBranchId === deviceBranchId),
    [transfers, deviceBranchId],
  );

  const setReceived = (transferId: number, productId: number, val: number, max: number) => {
    const key = `${transferId}-${productId}`;
    setReceivedMap((prev) => ({ ...prev, [key]: Math.max(0, Math.min(val, max)) }));
  };

  const respond = async (transfer: StockTransfer, action: "accept" | "reject") => {
    setActing(transfer.id);
    try {
      const items = transfer.items.map((it) => ({
        productId: it.productId,
        quantityReceived:
          action === "accept"
            ? receivedMap[`${transfer.id}-${it.productId}`] ?? it.quantity
            : 0,
      }));
      const res = await fetch(`/api/stock-transfers/${transfer.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, items }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "No se pudo procesar el traspaso.");
      toast.success(
        action === "accept"
          ? "Traspaso aceptado. El stock ingresó a tu local."
          : "Traspaso rechazado. Se repuso el stock al origen.",
      );
      await load();
    } catch (err: any) {
      toast.error(err.message || "Error al procesar el traspaso.");
    } finally {
      setActing(null);
    }
  };

  const cancel = async (transfer: StockTransfer) => {
    setActing(transfer.id);
    try {
      const res = await fetch(`/api/stock-transfers/${transfer.id}/cancel`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "No se pudo cancelar el traspaso.");
      toast.success("Traspaso cancelado. Se repuso el stock al origen.");
      await load();
    } catch (err: any) {
      toast.error(err.message || "Error al cancelar el traspaso.");
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-border pb-4">
        <button
          onClick={() => setTab("entrantes")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors cursor-pointer ${
            tab === "entrantes"
              ? "bg-primary/10 text-primary font-semibold"
              : "text-foreground-muted hover:text-foreground hover:bg-muted"
          }`}
        >
          <Inbox size={16} /> Entrantes
          {incoming.filter((t) => t.status === "SENT").length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full">
              {incoming.filter((t) => t.status === "SENT").length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("salientes")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors cursor-pointer ${
            tab === "salientes"
              ? "bg-primary/10 text-primary font-semibold"
              : "text-foreground-muted hover:text-foreground hover:bg-muted"
          }`}
        >
          <Send size={16} /> Salientes
        </button>
      </div>

      {!deviceBranchId ? (
        <div className="p-6 text-center border-2 border-dashed border-border rounded-2xl bg-muted/30 text-foreground-muted text-sm">
          Tu equipo no tiene un local asignado. Definilo en Configuración ➔
          Locales y Sucursales para usar traspasos.
        </div>
      ) : (
        <>
          {tab === "entrantes" && (
            <IncomingList
              transfers={incoming}
              receivedMap={receivedMap}
              setReceived={setReceived}
              respond={respond}
              acting={acting}
            />
          )}
          {tab === "salientes" && (
            <OutgoingList
              transfers={outgoing}
              cancel={cancel}
              acting={acting}
            />
          )}
        </>
      )}
    </div>
  );
}

function IncomingList({
  transfers,
  receivedMap,
  setReceived,
  respond,
  acting,
}: {
  transfers: StockTransfer[];
  receivedMap: Record<string, number>;
  setReceived: (transferId: number, productId: number, val: number, max: number) => void;
  respond: (t: StockTransfer, action: "accept" | "reject") => void;
  acting: number | null;
}) {
  const pending = transfers.filter((t) => t.status === "SENT");
  const rest = transfers.filter((t) => t.status !== "SENT");

  if (transfers.length === 0) {
    return (
      <EmptyState
        icon={<Inbox size={32} />}
        text="No recibiste traspasos todavía."
      />
    );
  }

  return (
    <div className="space-y-4">
      {pending.map((t) => (
        <TransferCard
          key={t.id}
          transfer={t}
          title="Enviado por"
          actor={t.sourceBranch?.name || `Local #${t.sourceBranchId}`}
        >
          <div className="space-y-2">
            {t.items.map((it) => {
              const max = it.quantity;
              const value = receivedMap[`${t.id}-${it.productId}`] ?? it.quantity;
              return (
                <div
                  key={`${t.id}-${it.productId}`}
                  className="flex items-center justify-between gap-3 bg-muted/40 border border-border rounded-xl p-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {it.productName || `Producto #${it.productId}`}
                    </p>
                    <p className="text-[11px] text-foreground-muted">
                      Enviado: {it.quantity} u.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-[11px] text-foreground-muted font-medium">
                      Recibido:
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={max}
                      value={value}
                      onChange={(e) =>
                        setReceived(t.id, it.productId, parseInt(e.target.value) || 0, max)
                      }
                      className="w-16 p-1.5 text-center text-xs font-bold rounded-lg border border-border bg-background text-foreground"
                    />
                  </div>
                </div>
              );
            })}
            {t.notes && (
              <p className="text-[11px] text-foreground-muted italic">
                Nota: {t.notes}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="destructive"
              onClick={() => respond(t, "reject")}
              disabled={acting === t.id}
            >
              <XCircle size={16} className="mr-2" />
              Rechazar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => respond(t, "accept")}
              disabled={acting === t.id}
            >
              {acting === t.id ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <CheckCircle2 size={16} className="mr-2" />
              )}
              Aceptar Recepción
            </Button>
          </div>
        </TransferCard>
      ))}

      {rest.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-foreground-muted pt-4">
            Historial
          </h3>
          {rest.map((t) => (
            <TransferCard
              key={t.id}
              transfer={t}
              title="Enviado por"
              actor={t.sourceBranch?.name || `Local #${t.sourceBranchId}`}
            >
              <SummaryItems items={t.items} />
            </TransferCard>
          ))}
        </div>
      )}
    </div>
  );
}

function OutgoingList({
  transfers,
  cancel,
  acting,
}: {
  transfers: StockTransfer[];
  cancel: (t: StockTransfer) => void;
  acting: number | null;
}) {
  if (transfers.length === 0) {
    return (
      <EmptyState
        icon={<Send size={32} />}
        text="Todavía no enviaste traspasos."
      />
    );
  }

  return (
    <div className="space-y-4">
      {transfers.map((t) => (
        <TransferCard
          key={t.id}
          transfer={t}
          title="Para"
          actor={t.targetBranch?.name || `Local #${t.targetBranchId}`}
        >
          <SummaryItems items={t.items} />

          {t.status === "SENT" && (
            <div className="flex justify-end pt-3 border-t border-border">
              <Button
                type="button"
                variant="destructive"
                onClick={() => cancel(t)}
                disabled={acting === t.id}
              >
                {acting === t.id ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                  <Ban size={16} className="mr-2" />
                )}
                Cancelar Envío
              </Button>
            </div>
          )}
        </TransferCard>
      ))}
    </div>
  );
}

function TransferCard({
  transfer,
  title,
  actor,
  children,
}: {
  transfer: StockTransfer;
  title: string;
  actor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-border rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center">
            <ArrowRightLeft size={18} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              Traspaso #{transfer.id}
            </p>
            <p className="text-[11px] text-foreground-muted">
              {title}: <strong>{actor}</strong>
            </p>
          </div>
        </div>
        <StatusBadge status={transfer.status} />
      </div>
      {children}
    </div>
  );
}

function SummaryItems({ items }: { items: StockTransfer["items"] }) {
  return (
    <div className="space-y-1.5">
      {items.map((it) => (
        <div
          key={`${it.transferId}-${it.productId}`}
          className="flex items-center justify-between bg-muted/40 border border-border rounded-xl p-2.5"
        >
          <p className="text-xs font-bold text-foreground truncate">
            {it.productName || `Producto #${it.productId}`}
          </p>
          <div className="flex items-center gap-3 shrink-0 text-[11px]">
            <span className="text-foreground-muted">
              Enviado: <strong>{it.quantity}</strong>
            </span>
            {it.receivedQuantity !== null && it.receivedQuantity !== undefined && (
              <span className="text-emerald-600">
                Recibido: <strong>{it.receivedQuantity}</strong>
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    SENT: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    COMPLETED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    REJECTED: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    CANCELLED: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border-zinc-500/30",
  };
  return (
    <span
      className={`px-2.5 py-1 text-[11px] font-bold rounded-full border ${colors[status] || "bg-muted text-foreground-muted border-border"}`}
    >
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="p-10 text-center border-2 border-dashed border-border rounded-2xl bg-muted/30 text-foreground-muted space-y-2">
      <div className="flex justify-center text-foreground-muted">{icon}</div>
      <p className="text-sm font-semibold">{text}</p>
      <p className="text-[11px]">
        Los traspasos se sincronizan entre locales automáticamente.
      </p>
    </div>
  );
}
