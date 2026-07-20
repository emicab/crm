"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, 
  Search, 
  ArrowUpRight, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  DollarSign 
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";

interface Account {
  id: number;
  clientId: number;
  balance: string;
  client: {
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  };
}

export default function CuentaCorrientePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/cuenta-corriente");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAccounts(data);
    } catch {
      toast.error("Error al cargar las cuentas corrientes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const filteredAccounts = accounts.filter(acc => {
    const fullName = `${acc.client.firstName} ${acc.client.lastName || ""}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  // Calcular estadísticas generales
  const totalDebt = accounts.reduce((sum, acc) => {
    const bal = parseFloat(acc.balance);
    return bal > 0 ? sum + bal : sum;
  }, 0);

  const debtorCount = accounts.filter(acc => parseFloat(acc.balance) > 0).length;
  const creditCount = accounts.filter(acc => parseFloat(acc.balance) < 0).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Cuenta Corriente / Fiado</h1>
          <p className="text-sm text-foreground-muted">Seguimiento de saldos deudores y registro de entregas de clientes.</p>
        </div>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-border p-6 rounded-2xl shadow-sm flex items-center gap-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-destructive/5 rounded-bl-full" />
          <div className="bg-destructive/10 text-destructive p-3.5 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Total Deuda Activa</p>
            <p className="text-2xl font-bold text-foreground mt-1">${totalDebt.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="bg-white border border-border p-6 rounded-2xl shadow-sm flex items-center gap-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full" />
          <div className="bg-primary/10 text-primary p-3.5 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Clientes Deudores</p>
            <p className="text-2xl font-bold text-foreground mt-1">{debtorCount} {debtorCount === 1 ? 'cliente' : 'clientes'}</p>
          </div>
        </div>

        <div className="bg-white border border-border p-6 rounded-2xl shadow-sm flex items-center gap-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-success/5 rounded-bl-full" />
          <div className="bg-success/10 text-success p-3.5 rounded-xl">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Saldos a Favor</p>
            <p className="text-2xl font-bold text-foreground mt-1">{creditCount} {creditCount === 1 ? 'cliente' : 'clientes'}</p>
          </div>
        </div>
      </div>

      {/* Buscador e Historial */}
      <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 self-start">
            <span className="inline-block w-1.5 h-5 bg-primary rounded-full align-middle" />
            Cuentas Activas
          </h2>
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-foreground-muted">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-foreground-muted text-sm">Cargando deudas...</div>
        ) : filteredAccounts.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-border rounded-xl">
            <Users size={32} className="mx-auto text-foreground-muted/40 mb-3" />
            <p className="font-semibold text-foreground">No hay cuentas corrientes activas</p>
            <p className="text-xs text-foreground-muted mt-1 max-w-xs mx-auto">
              {searchTerm ? "No se encontraron clientes que coincidan con la búsqueda." : "Los saldos se generarán cuando realices una venta 'en cuenta corriente' o registres un pago."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted text-foreground-muted font-medium text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Cliente</th>
                  <th className="px-6 py-3 text-left">Contacto</th>
                  <th className="px-6 py-3 text-right">Saldo</th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white text-foreground">
                {filteredAccounts.map((acc) => {
                  const balance = parseFloat(acc.balance);
                  const isDebt = balance > 0;
                  return (
                    <tr key={acc.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">
                        {acc.client.firstName} {acc.client.lastName || ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-foreground-muted">
                        <div className="text-sm">{acc.client.phone || "-"}</div>
                        <div className="text-xs text-foreground-muted/80">{acc.client.email || ""}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-bold">
                        <span className={isDebt ? "text-destructive" : "text-success"}>
                          {isDebt ? `Debe $${balance.toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : `A favor $${Math.abs(balance).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link href={`/cuenta-corriente/${acc.clientId}`}>
                          <Button variant="ghost" size="sm">
                            Ver Ficha <ChevronRight size={14} className="ml-1" />
                          </Button>
                        </Link>
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
