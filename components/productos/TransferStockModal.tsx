"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Loader2,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  Trash2,
  Package,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import type { Branch, Product } from "@/types";

interface TransferStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  initialItems?: TransferItem[];
  onTransferCompleted?: () => void;
}

export interface TransferItem {
  product: Product;
  quantity: number;
}

export function TransferStockModal({
  isOpen,
  onClose,
  products,
  initialItems,
  onTransferCompleted,
}: TransferStockModalProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deviceBranchId, setDeviceBranchId] = useState<number | "">("");

  const [sourceBranchId, setSourceBranchId] = useState<number | "">("");
  const [targetBranchId, setTargetBranchId] = useState<number | "">("");
  const [notes, setNotes] = useState("");

  // Buscador y lista de productos para el remito
  const [searchQuery, setSearchQuery] = useState("");
  const [transferList, setTransferList] = useState<TransferItem[]>([]);

  const initialItemsRef = useRef(initialItems);
  initialItemsRef.current = initialItems;

  useEffect(() => {
    if (isOpen) {
      fetchBranches();
      const init = initialItemsRef.current;
      setTransferList(
        init && init.length > 0 ? init.map((i) => ({ ...i })) : [],
      );
    }
  }, [isOpen]);

  const fetchBranches = async () => {
    try {
      const [res, resDev] = await Promise.all([
        fetch("/api/branches"),
        fetch("/api/branches/device"),
      ]);

      let branchData: Branch[] = [];
      if (res.ok) {
        branchData = await res.json();
        setBranches(branchData);
      } else {
        toast.error("Error al cargar sucursales.");
      }

      let devId: number | "" = "";
      if (resDev.ok) {
        const devData = await resDev.json();
        const parsed = Number(devData.deviceBranchId);
        if (!isNaN(parsed) && parsed > 0) {
          devId = parsed;
        }
      }

      setDeviceBranchId(devId);
      setSourceBranchId(devId);

      // Destino por defecto: primera sucursal distinta de la propia
      if (devId) {
        const defaultTarget = branchData.find((b) => b.id !== devId);
        setTargetBranchId(defaultTarget ? defaultTarget.id : "");
      } else {
        setTargetBranchId("");
      }
    } catch {
      toast.error("Error al cargar sucursales.");
      setDeviceBranchId("");
      setSourceBranchId("");
      setTargetBranchId("");
    }
  };

  // Filtrado de productos para el buscador
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)),
      )
      .slice(0, 8); // Máximo 8 sugerencias
  }, [searchQuery, products]);

  const handleAddProduct = (product: Product) => {
    setTransferList((prev) => {
      const exists = prev.find((item) => item.product.id === product.id);
      if (exists) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setSearchQuery("");
  };

  const handleUpdateQuantity = (productId: number, qty: number) => {
    if (qty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setTransferList((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: qty } : item,
      ),
    );
  };

  const handleRemoveItem = (productId: number) => {
    setTransferList((prev) =>
      prev.filter((item) => item.product.id !== productId),
    );
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!deviceBranchId || !sourceBranchId) {
      toast.error(
        "Tu equipo no tiene un local asignado. Definilo en Configuración ➔ Locales y Sucursales.",
      );
      return;
    }

    if (!targetBranchId) {
      toast.error("Seleccioná la sucursal de destino.");
      return;
    }

    if (sourceBranchId === targetBranchId) {
      toast.error("El origen y el destino deben ser distintos.");
      return;
    }

    if (sourceBranchId !== deviceBranchId) {
      toast.error("Solo podés enviar stock desde tu propio local.");
      return;
    }

    if (transferList.length === 0) {
      toast.error("Agregá al menos un producto a la lista de traspaso.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        sourceBranchId: Number(sourceBranchId),
        targetBranchId: Number(targetBranchId),
        notes,
        items: transferList.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
        })),
      };

      const res = await fetch("/api/stock-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Error al realizar la transferencia.");
      }

      toast.success(
        `¡Remito de traspaso enviado con éxito (${transferList.length} productos)!`,
      );
      setTransferList([]);
      setNotes("");
      onTransferCompleted?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error al realizar la transferencia.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalUnits = transferList.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl border border-border space-y-5 relative max-h-[90vh] flex flex-col justify-between">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-border pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center font-bold">
              <ArrowRightLeft size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                Remito de Traspaso Multi-Producto
              </h3>
              <p className="text-xs text-foreground-muted">
                Buscá y agregá múltiples productos para transferir entre locales
                en una sola transacción
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-foreground-muted hover:text-foreground p-1 rounded-xl cursor-pointer"
          >
            ✕
          </button>
        </div>

        {!deviceBranchId || branches.length < 2 ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle size={20} className="shrink-0" />
            <span>
              {!deviceBranchId
                ? "Tu equipo no tiene un local asignado. Definilo en Configuración ➔ Locales y Sucursales para poder realizar traspasos."
                : "Necesitás registrar al menos 2 sucursales en Configuración ➔ Sucursales para realizar transferencias."}
            </span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 flex-1 overflow-y-auto pr-1"
          >
            {/* Selector de Sucursales Origen / Destino */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted p-3.5 rounded-2xl border border-border">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  📍 Sucursal Origen *
                </label>
                <select
                  value={sourceBranchId}
                  disabled
                  className="w-full p-2.5 rounded-xl border border-border bg-muted text-foreground text-xs font-semibold opacity-70"
                >
                  {branches
                    .filter((b) => b.id === Number(deviceBranchId))
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.isMain ? "(Principal)" : ""}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-foreground-muted mt-1">
                  Solo podés enviar stock de tu propio local.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  ➡️ Sucursal Destino *
                </label>
                <select
                  value={targetBranchId}
                  onChange={(e) => setTargetBranchId(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-semibold"
                >
                  {branches.map((b) => (
                    <option
                      key={b.id}
                      value={b.id}
                      disabled={b.id === Number(sourceBranchId)}
                    >
                      {b.name} {b.isMain ? "(Principal)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Buscador de Productos con Autocompletado */}
            <div className="relative space-y-1">
              <label className="block text-xs font-bold text-foreground">
                🔍 Buscar Producto para Agregar al Remito
              </label>
              <div className="relative">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Escribí nombre o código SKU..."
                  className="pl-9"
                />
                <Search
                  size={16}
                  className="absolute left-3 top-3 text-foreground-muted"
                />
              </div>

              {/* Menú de Resultados Sugeridos */}
              {filteredProducts.length > 0 && (
                <div className="absolute left-0 right-0 z-30 mt-1 bg-white border border-border rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-border">
                  {filteredProducts.map((p) => {
                    const sourceStock =
                      p.branchStocks?.find(
                        (bs) => bs.branchId === Number(sourceBranchId),
                      )?.quantityStock ?? p.quantityStock;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddProduct(p)}
                        className="w-full p-3 text-left hover:bg-muted/80 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <div className="truncate">
                          <p className="text-xs font-bold text-foreground truncate">
                            {p.name}
                          </p>
                          <p className="text-[11px] text-foreground-muted">
                            SKU: {p.sku || "-"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-bold text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800">
                            Stock Origen: {sourceStock} u.
                          </span>
                          <Plus size={16} className="text-primary shrink-0" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Lista de Ítems Agregados al Remito */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span className="flex items-center gap-1.5">
                  <Package size={16} className="text-primary" /> Productos en el
                  Remito ({transferList.length})
                </span>
                <span className="text-foreground-muted">
                  Total a Transferir:{" "}
                  <strong className="text-primary">{totalUnits} u.</strong>
                </span>
              </div>

              {transferList.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-border rounded-2xl bg-muted/30 text-foreground-muted space-y-1">
                  <p className="text-xs font-semibold">
                    No hay productos agregados al remito.
                  </p>
                  <p className="text-[11px]">
                    Usá el buscador de arriba para agregar ítems a transferir.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border border border-border rounded-2xl bg-white max-h-48 overflow-y-auto">
                  {transferList.map((item) => (
                    <div
                      key={item.product.id}
                      className="p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {item.product.name}
                        </p>
                        <p className="text-[11px] text-foreground-muted">
                          SKU: {item.product.sku || "-"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <label className="text-[11px] text-foreground-muted font-medium">
                          Cant:
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateQuantity(
                              item.product.id,
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="w-16 p-1.5 text-center text-xs font-bold rounded-lg border border-border bg-background text-foreground"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.product.id)}
                          className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Quitar ítem"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Observaciones del Remito */}
            <Input
              label="Observaciones del Remito (Opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ej. Remito #104 — Envío en camioneta"
            />

            {/* Pie con Botones */}
            <div className="flex justify-end gap-2 pt-3 border-t border-border shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={submitting || transferList.length === 0}
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                  <CheckCircle2 size={16} className="mr-2" />
                )}
                {submitting
                  ? "Transfiriendo..."
                  : `Confirmar Remito (${transferList.length} ítems)`}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
