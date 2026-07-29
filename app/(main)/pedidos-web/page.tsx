"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatCurrency } from "@/lib/formatCurrency";
import toast from "react-hot-toast";

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
  const [orders, setOrders] = useState<WebOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<WebOrder | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/web-orders");
      if (!res.ok) throw new Error("Error al cargar pedidos web.");
      const data = await res.json();
      setOrders(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    const term = searchTerm.toLowerCase();
    return (
      o.clientName.toLowerCase().includes(term) ||
      o.webOrderNumber.toLowerCase().includes(term) ||
      o.clientPhone.includes(term)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_PREPARATION":
        return (
          <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
            <Clock size={12} /> En Preparación
          </span>
        );
      case "READY_FOR_PICKUP":
        return (
          <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
            <CheckCircle2 size={12} /> Listo para Retiro
          </span>
        );
      case "SHIPPED":
        return (
          <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
            <Truck size={12} /> En Envío
          </span>
        );
      case "DELIVERED":
        return (
          <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
            <CheckCircle2 size={12} /> Entregado
          </span>
        );
      case "CANCELLED":
        return (
          <span className="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded-full font-medium font-medium">
            Cancelado
          </span>
        );
      default:
        return (
          <span className="bg-gray-100 text-gray-800 text-xs px-2.5 py-1 rounded-full font-medium">
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
            onClick={fetchOrders}
            className="flex items-center gap-2"
          >
            <RefreshCcw size={16} /> Actualizar Pedidos
          </Button>
          <a
            href="/configuracion?tab=tienda_web"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-2 shadow-sm"
          >
            <Settings size={16} /> Configurar Tienda Web
          </a>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-muted p-4 sm:p-6 rounded-xl shadow space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
              size={18}
            />
            <Input
              type="text"
              placeholder="Buscar por cliente, teléfono o Nº de pedido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
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
                  <th className="p-3">Nº Pedido</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Entrega</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-background/50 transition-colors"
                  >
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
                          <Truck size={14} className="text-purple-600" /> Envo a
                          Domicilio
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs">
                          <MapPin size={14} className="text-blue-600" /> Retiro
                          en Local
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {getStatusBadge(order.status)}
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
                ✕
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

            <div className="p-4 border-t border-border bg-background/50 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                Cerrar
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  toast.success("¡Pedido marcado en preparación!");
                  setSelectedOrder(null);
                }}
              >
                Imprimir Ticket de Empaque 🖨️
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
