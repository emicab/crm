"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, RefreshCcw, Eye, Search, AlertCircle, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";

interface ConsignmentItem {
  id: number;
  productId: number;
  quantityGiven: number;
  quantitySold: number;
  quantityReturned: number;
  priceAtGiven: string;
  product?: {
    name: string;
  };
}

interface Consignment {
  id: number;
  clientId: number;
  status: "DELIVERED" | "SETTLED" | "CANCELLED";
  notes?: string;
  createdAt: string;
  client: {
    firstName: string;
    lastName?: string;
  };
  items: ConsignmentItem[];
}

export default function ConsignacionesPage() {
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchConsignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/consignaciones");
      if (!res.ok) {
        throw new Error("Error al cargar las consignaciones.");
      }
      const data = await res.json();
      setConsignments(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsignments();
  }, []);

  const handleCancel = async (id: number) => {
    if (!confirm("¿Seguro que deseas cancelar esta consignación? El stock no vendido reingresará al inventario.")) return;

    try {
      const res = await fetch(`/api/consignaciones/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Error al cancelar consignación.");
      }
      toast.success("Consignación cancelada y stock devuelto.");
      fetchConsignments();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = consignments.filter((c) => {
    const clientName = `${c.client?.firstName || ""} ${c.client?.lastName || ""}`.toLowerCase();
    const notes = (c.notes || "").toLowerCase();
    const term = searchTerm.toLowerCase();
    return clientName.includes(term) || notes.includes(term) || c.id.toString().includes(term);
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-medium">En Consignación</span>;
      case "SETTLED":
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-medium">Saldada</span>;
      case "CANCELLED":
        return <span className="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded-full font-medium">Cancelada</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-xs px-2.5 py-1 rounded-full font-medium">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <RefreshCcw className="text-primary" size={28} /> Consignaciones
          </h1>
          <p className="text-foreground-muted text-sm mt-1">
            Gestión de productos entregados a clientes o revendedores a consignación.
          </p>
        </div>
        <Link href="/consignaciones/nueva">
          <Button variant="primary" className="flex items-center gap-2">
            <Plus size={18} /> Nueva Consignación
          </Button>
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="bg-muted p-4 sm:p-6 rounded-xl shadow space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" size={18} />
            <Input
              type="text"
              placeholder="Buscar por cliente o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 size={32} className="animate-spin text-primary" />
            <span className="ml-3 text-foreground-muted">Cargando consignaciones...</span>
          </div>
        ) : error ? (
          <div className="text-center text-destructive p-4 bg-destructive/10 rounded-md">
            <AlertCircle size={20} className="inline mr-2" />
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-foreground-muted">
            {searchTerm ? `No se encontraron consignaciones para "${searchTerm}".` : "No hay consignaciones registradas."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-foreground text-sm font-semibold">
                  <th className="p-3">ID</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Ítems Entregados</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filtered.map((c) => {
                  const totalItems = c.items.reduce((acc, item) => acc + item.quantityGiven, 0);
                  return (
                    <tr key={c.id} className="hover:bg-background/50 transition-colors">
                      <td className="p-3 font-semibold text-primary">#{c.id}</td>
                      <td className="p-3 text-foreground-muted">
                        {new Date(c.createdAt).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </td>
                      <td className="p-3 font-medium text-foreground">
                        {c.client ? `${c.client.firstName} ${c.client.lastName || ""}` : "Cliente Eliminado"}
                      </td>
                      <td className="p-3 text-foreground-muted">{totalItems} unidades ({c.items.length} productos)</td>
                      <td className="p-3 text-center">{getStatusBadge(c.status)}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link href={`/consignaciones/${c.id}`}>
                            <Button variant="ghost" size="icon" title="Ver / Rendir consignación">
                              <Eye size={16} className="text-primary" />
                            </Button>
                          </Link>
                          {c.status === "DELIVERED" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCancel(c.id)}
                              title="Cancelar consignación"
                            >
                              <Trash2 size={16} className="text-destructive" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
