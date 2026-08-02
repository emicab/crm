"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Loader2,
  RefreshCcw,
  ShoppingBag,
  Eye,
  Search,
  AlertCircle,
  Phone,
  MapPin,
  Truck,
  CheckCircle2,
  Clock,
  Settings,
  Package,
  XCircle,
  Printer,
  Trash2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/formatCurrency";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/formatDate";
import { playOrderChimeSound } from "@/lib/audio";

interface WebOrderItem {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  product?: {
    name: string;
    sku?: string | null;
  };
}

interface WebOrder {
  id: number;
  webOrderNumber: string;
  clientName: string;
  clientEmail?: string | null;
  clientPhone: string;
  shippingAddress?: string | null;
  deliveryType: "PICKUP" | "DELIVERY";
  paymentMethod: string;
  paymentStatus: string;
  status:
    | "PENDING_PREPARATION"
    | "READY_FOR_PICKUP"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED";
  totalAmount: string;
  notes?: string | null;
  createdAt: string;
  items: WebOrderItem[];
}

export default function PedidosWebPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<WebOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<WebOrder | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const isInitialLoadedRef = useRef(false);
  const notifiedKeysRef = useRef<Set<string>>(new Set());

  const fetchOrders = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/web-orders");
      if (!res.ok) throw new Error("Error al cargar pedidos web.");
      const data: WebOrder[] = await res.json();

      if (Array.isArray(data)) {
        if (!isInitialLoadedRef.current) {
          isInitialLoadedRef.current = true;
          data.forEach((o) => {
            notifiedKeysRef.current.add(`${o.id}-CREATED`);
            if (o.paymentStatus === "PAID") {
              notifiedKeysRef.current.add(`${o.id}-PAID`);
            }
          });
          setOrders(data);
          return;
        }

        let notifyPaid = false;
        let notifyNew = false;

        data.forEach((newO) => {
          const createdKey = `${newO.id}-CREATED`;
          const paidKey = `${newO.id}-PAID`;

          const isNewOrder = !notifiedKeysRef.current.has(createdKey);
          const isNewPaid = newO.paymentStatus === "PAID" && !notifiedKeysRef.current.has(paidKey);

          if (isNewOrder) notifiedKeysRef.current.add(createdKey);
          if (newO.paymentStatus === "PAID") notifiedKeysRef.current.add(paidKey);

          if (isNewPaid) {
            notifyPaid = true;
          } else if (isNewOrder) {
            notifyNew = true;
          }
        });

        if (notifyPaid || notifyNew) {
          playOrderChimeSound();
          if (notifyPaid) {
            toast.success("¡Pago confirmado por Mercado Pago! 🟢", { duration: 5000 });
          } else if (notifyNew) {
            toast.success("¡Nuevo pedido web recibido! 🛒", { duration: 5000 });
          }
        }

        setOrders(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(true);
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        fetchOrders(false);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const filteredOrders = orders.filter((o) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      o.clientName.toLowerCase().includes(term) ||
      o.webOrderNumber.toLowerCase().includes(term) ||
      o.clientPhone.includes(term);

    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    const matchesPaymentStatus = paymentStatusFilter === "ALL" || o.paymentStatus === paymentStatusFilter;

    return matchesSearch && matchesStatus && matchesPaymentStatus;
  });

  const handleUpdateOrderStatus = async (
    orderId: number,
    newStatus: string,
    newPaymentStatus?: string,
  ) => {
    try {
      const res = await fetch(`/api/web-orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          paymentStatus: newPaymentStatus,
        }),
      });
      if (!res.ok) throw new Error("Error al actualizar el estado del pedido.");
      const updated = await res.json();

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: updated.status,
                paymentStatus: updated.paymentStatus,
              }
            : o,
        ),
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                status: updated.status,
                paymentStatus: updated.paymentStatus,
              }
            : null,
        );
      }
      if (updated.saleId) {
        toast.success(
          "Pedido marcado como Entregado y registrado en Ventas y Movimientos de Caja.",
        );
      } else if (newStatus === "CANCELLED") {
        toast.success(
          "Pedido cancelado. El stock de los productos fue repuesto automáticamente 📦🔄",
        );
      } else {
        toast.success("Estado del pedido actualizado correctamente.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar estado.");
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map((o) => o.id)));
    }
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`¿Eliminar ${ids.length} pedido(s) seleccionado(s)? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch("/api/web-orders/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Error al eliminar pedidos.");
      const result = await res.json();
      setOrders((prev) => prev.filter((o) => !ids.includes(o.id)));
      setSelectedIds(new Set());
      if (selectedOrder && ids.includes(selectedOrder.id)) {
        setSelectedOrder(null);
      }
      toast.success(result.message || "Pedidos eliminados correctamente.");
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar pedidos.");
    }
  };

  const handleDeleteSingle = async (order: WebOrder) => {
    if (!confirm(`¿Eliminar pedido ${order.webOrderNumber} de ${order.clientName}?`)) return;
    try {
      const res = await fetch("/api/web-orders/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [order.id] }),
      });
      if (!res.ok) throw new Error("Error al eliminar pedido.");
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(order.id); return next; });
      setSelectedOrder(null);
      toast.success(`Pedido ${order.webOrderNumber} eliminado.`);
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar pedido.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_PREPARATION":
        return (
          <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
            <Clock size={12} /> En Preparación
          </span>
        );
      case "READY_FOR_PICKUP":
        return (
          <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
            <Package size={12} /> Listo para Retiro
          </span>
        );
      case "SHIPPED":
        return (
          <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
            <Truck size={12} /> En Envío
          </span>
        );
      case "DELIVERED":
        return (
          <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
            <CheckCircle2 size={12} /> Entregado
          </span>
        );
      case "CANCELLED":
        return (
          <span className="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
            <XCircle size={12} /> Cancelado
          </span>
        );
      default:
        return (
          <span className="bg-gray-100 text-gray-800 text-xs px-2.5 py-1 rounded-full font-semibold">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="text-blue-600" size={28} /> Pedidos Web
            (ClinStore)
          </h1>
          <p className="text-foreground-muted text-sm mt-1">
            Gestión y preparación de pedidos realizados por clientes desde tu
            tienda online pública.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => fetchOrders(true)}
            className="flex items-center gap-2"
          >
            <RefreshCcw size={16} /> Actualizar Pedidos
          </Button>
          <Button
            variant={autoRefresh ? "outline" : "primary"}
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center gap-2 min-w-[100px]"
          >
            {autoRefresh ? "⏸ Pausar" : "▶ Auto"}
          </Button>
          <Button
            variant="primary"
            onClick={() => router.push("/configuracion?tab=tienda_web")}
            className="flex items-center gap-2"
          >
            <Settings size={16} /> Configurar Tienda Web
          </Button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-muted p-4 sm:p-6 rounded-xl shadow space-y-4">
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <div className="relative w-full sm:w-72">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
                size={18}
              />
              <Input
                type="text"
                placeholder="Buscar cliente, teléfono, pedido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="PENDING_PREPARATION">En Preparación</option>
              <option value="READY_FOR_PICKUP">Listo para Retiro</option>
              <option value="SHIPPED">En Envío</option>
              <option value="DELIVERED">Entregado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="ALL">Todos los Pagos</option>
              <option value="PAID">Pagado</option>
              <option value="PENDING">Pendiente</option>
            </select>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-lg w-full xl:w-auto shrink-0 justify-between xl:justify-start">
              <span className="text-sm font-semibold text-red-700 dark:text-red-400 pl-2">
                {selectedIds.size} {selectedIds.size === 1 ? 'pedido seleccionado' : 'pedidos seleccionados'}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1 h-9 px-3"
                >
                  <Trash2 size={16} /> Eliminar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                  className="h-9 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 size={32} className="animate-spin text-primary" />
            <span className="ml-3 text-foreground-muted">
              Cargando pedidos web...
            </span>
          </div>
        ) : error ? (
          <div className="text-center text-destructive p-4 bg-destructive/10 rounded-md">
            <AlertCircle size={20} className="inline mr-2" />
            {error}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-foreground-muted space-y-2">
            <ShoppingBag
              size={48}
              className="mx-auto opacity-40 text-blue-500"
            />
            <p className="text-base font-semibold text-foreground">
              No hay pedidos web registrados aún
            </p>
            <p className="text-xs">
              Los pedidos realizados en ClinStore aparecerán automáticamente en
              esta pantalla.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-foreground text-sm font-semibold">
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={filteredOrders.length > 0 && selectedIds.size === filteredOrders.length}
                      onChange={toggleSelectAll}
                      className="rounded border-border accent-blue-600 cursor-pointer"
                    />
                  </th>
                  <th className="p-3">Nº Pedido</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Entrega</th>
                  <th className="p-3 text-center">Estado Pago</th>
                  <th className="p-3 text-center">Estado Pedido</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className={`hover:bg-background/50 transition-colors ${selectedIds.has(order.id) ? "bg-blue-50 dark:bg-blue-950/20" : ""}`}
                  >
                    <td className="p-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        className="rounded border-border accent-blue-600 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 font-mono font-bold text-primary">
                      {order.webOrderNumber}
                    </td>
                    <td className="p-3 text-foreground-muted">
                      {new Date(order.createdAt).toLocaleString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-foreground">
                        {order.clientName}
                      </p>
                      <p className="text-xs text-foreground-muted flex items-center gap-1">
                        <Phone size={10} /> {order.clientPhone}
                      </p>
                    </td>
                    <td className="p-3 text-foreground-muted">
                      {order.deliveryType === "DELIVERY" ? (
                        <span className="flex items-center gap-1 text-xs">
                          <Truck size={14} className="text-purple-600" /> Envío
                          a Domicilio
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs">
                          <MapPin size={14} className="text-blue-600" /> Retiro
                          en Local
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {order.paymentStatus === "PAID" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                          🟢 PAGADO ({order.paymentMethod === "MERCADO_PAGO" ? "Mercado Pago" : "Efectivo"})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/40">
                          🟡 PENDIENTE DE PAGO
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <select
                        value={order.status}
                        onChange={(e) =>
                          handleUpdateOrderStatus(order.id, e.target.value)
                        }
                        className="text-xs font-semibold p-1.5 rounded-lg border border-border bg-background cursor-pointer focus:ring-2 focus:ring-blue-500/50"
                      >
                        <option value="PENDING_PREPARATION">
                          En Preparación
                        </option>
                        <option value="READY_FOR_PICKUP">
                          Listo para Retiro
                        </option>
                        <option value="SHIPPED">En Envío</option>
                        <option value="DELIVERED">Entregado</option>
                        <option value="CANCELLED">Cancelado</option>
                      </select>
                    </td>
                    <td className="p-3 text-right font-bold text-foreground">
                      {formatCurrency(parseFloat(order.totalAmount))}
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                        className="text-primary font-medium"
                      >
                        <Eye size={16} className="mr-1" /> Ver Detalle
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalle de Pedido Web */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-muted rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg leading-tight">
                  Pedido {selectedOrder.webOrderNumber}
                </h3>
                <p className="text-xs text-blue-100">
                  {new Date(selectedOrder.createdAt).toLocaleString("es-AR")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedOrder(null)}
                className="text-white hover:bg-white/10"
              >
                <XCircle size={18} />
              </Button>
            </div>

            <div className="p-5 space-y-4 text-sm max-h-[70vh] overflow-y-auto">
              <div className="bg-background p-3 rounded-xl border border-border space-y-1">
                <p className="font-bold text-foreground">
                  {selectedOrder.clientName}
                </p>
                <p className="text-xs text-foreground-muted flex items-center gap-1">
                  <Phone size={12} /> {selectedOrder.clientPhone}
                </p>
                {selectedOrder.shippingAddress && (
                  <p className="text-xs text-foreground-muted flex items-center gap-1">
                    <MapPin size={12} /> {selectedOrder.shippingAddress}
                  </p>
                )}
              </div>

              {/* Botones de Cambio Rápido de Estado */}
              <div className="bg-background p-3 rounded-xl border border-border space-y-2">
                <label className="block text-xs font-bold text-foreground">
                  Cambiar Estado del Pedido:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateOrderStatus(
                        selectedOrder.id,
                        "READY_FOR_PICKUP",
                      )
                    }
                    className={`p-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${
                      selectedOrder.status === "READY_FOR_PICKUP"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    <Package size={14} /> Listo p/ Retiro
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateOrderStatus(selectedOrder.id, "SHIPPED")
                    }
                    className={`p-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${
                      selectedOrder.status === "SHIPPED"
                        ? "bg-purple-600 text-white border-purple-600"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    <Truck size={14} /> En Envío
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateOrderStatus(
                        selectedOrder.id,
                        "DELIVERED",
                        "PAID",
                      )
                    }
                    className={`p-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${
                      selectedOrder.status === "DELIVERED"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    <CheckCircle2 size={14} /> Entregado
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateOrderStatus(selectedOrder.id, "CANCELLED")
                    }
                    className={`p-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${
                      selectedOrder.status === "CANCELLED"
                        ? "bg-red-600 text-white border-red-600"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    <XCircle size={14} /> Cancelar
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-foreground-muted mb-2">
                  Productos Solicitados
                </h4>
                <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 flex justify-between items-center bg-background"
                    >
                      <div>
                        <p className="font-semibold text-foreground">
                          {item.product?.name || `Producto #${item.productId}`}
                        </p>
                        <p className="text-xs text-foreground-muted">
                          {item.quantity} unidades ×{" "}
                          {formatCurrency(parseFloat(item.unitPrice))}
                        </p>
                      </div>
                      <span className="font-bold text-foreground">
                        {formatCurrency(parseFloat(item.subtotal))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="font-bold text-foreground">
                  Total del Pedido:
                </span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(parseFloat(selectedOrder.totalAmount))}
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-background/50 flex justify-between gap-2">
              <Button
                variant="destructive"
                onClick={() => handleDeleteSingle(selectedOrder)}
                className="flex items-center gap-1"
              >
                <Trash2 size={14} /> Eliminar Pedido
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                  Cerrar
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    window.print();
                  }}
                  className="flex items-center gap-1"
                >
                  <Printer size={16} /> Imprimir Ticket de Empaque
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Imprimible para Empaque / Envío a Domicilio */}
      {selectedOrder && (
        <div
          id="web-order-print-ticket"
          className="hidden print:block text-black p-4 font-mono text-xs w-[80mm] mx-auto bg-white"
        >
          <style>
            {`
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #web-order-print-ticket, #web-order-print-ticket * {
                  visibility: visible !important;
                }
                #web-order-print-ticket {
                  position: fixed !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 80mm !important;
                  padding: 4mm !important;
                  font-family: monospace, sans-serif !important;
                  font-size: 11px !important;
                  color: #000 !important;
                  background: #fff !important;
                }
              }
            `}
          </style>

          <div className="text-center border-b-2 border-black pb-2 mb-2">
            <h2 className="text-base font-bold uppercase">
              TICKET DE EMPAQUE & ENVÍO
            </h2>
            <p className="text-sm font-bold mt-1">
              {selectedOrder.webOrderNumber}
            </p>
            <p className="text-[10px] text-gray-600">
              {formatDate(selectedOrder.createdAt)}
            </p>
          </div>

          <div className="border-b border-dashed border-black pb-2 mb-2 space-y-1">
            <p className="font-bold text-sm">
              CLIENTE: {selectedOrder.clientName}
            </p>
            <p>TEL: {selectedOrder.clientPhone}</p>
            <div className="mt-1 pt-1 border-t border-black">
              <p className="font-bold text-sm">
                TIPO:{" "}
                {selectedOrder.deliveryType === "DELIVERY"
                  ? "🚚 ENVÍO A DOMICILIO"
                  : "🏪 RETIRO EN LOCAL"}
              </p>
              {selectedOrder.deliveryType === "DELIVERY" && (
                <p className="font-bold text-xs uppercase bg-black text-white p-1 mt-1 text-center">
                  DIRECCIÓN:{" "}
                  {selectedOrder.shippingAddress ||
                    "Sin dirección especificada"}
                </p>
              )}
            </div>
          </div>

          <div className="border-b border-black pb-2 mb-2">
            <p className="font-bold text-xs uppercase mb-1">
              PRODUCTOS A EMPACAR:
            </p>
            <div className="space-y-1">
              {selectedOrder.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-start text-xs"
                >
                  <span>
                    [ ] {item.quantity}x{" "}
                    {item.product?.name || `Producto #${item.productId}`}
                  </span>
                  <span className="font-bold">
                    {formatCurrency(parseFloat(item.subtotal))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-right space-y-1 pt-1">
            <p className="text-sm font-bold">
              TOTAL: {formatCurrency(parseFloat(selectedOrder.totalAmount))}
            </p>
            <p className="text-[10px]">
              PAGO: {selectedOrder.paymentMethod} ({selectedOrder.paymentStatus}
              )
            </p>
          </div>

          <div className="text-center pt-3 text-[10px] border-t border-dashed border-black mt-3">
            ¡GRACIAS POR TU COMPRA!
          </div>
        </div>
      )}
    </div>
  );
}
