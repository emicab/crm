"use client";

import React, { useState, useEffect } from "react";
import {
  Building,
  LayoutDashboard,
  Database,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";

import { useModules } from "@/hooks/useModules";

import ConfigGeneralTab from "@/components/configuracion/tabs/ConfigGeneralTab";
import ConfigRubroPlanTab from "@/components/configuracion/tabs/ConfigRubroPlanTab";
import ConfigBackupTab from "@/components/configuracion/tabs/ConfigBackupTab";
import ConfigArcaTab from "@/components/configuracion/tabs/ConfigArcaTab";
import ConfigPaymentModal from "@/components/configuracion/modals/ConfigPaymentModal";

// Ajustes preestablecidos por rubro de negocio
const PROFILE_PRESETS: Record<
  string,
  { name: string; desc: string; modules: Record<string, boolean> }
> = {
  kiosco: {
    name: "Kiosco / Almacén",
    desc: "Venta rápida por unidad, fiado a clientes frecuentes y control de gastos.",
    modules: {
      clientes: true,
      vendedores: false,
      compras: false,
      gastos: true,
      combos_promociones: false,
      venta_fraccionada: false,
      analiticas: false,
      cuenta_corriente: true,
      roles: false,
    },
  },
  fiambreria: {
    name: "Fiambrería / Granel",
    desc: "Carga de peso exacto (gramos), stock e inventario y cuenta corriente.",
    modules: {
      clientes: true,
      vendedores: false,
      compras: true,
      gastos: true,
      combos_promociones: false,
      venta_fraccionada: true,
      analiticas: false,
      cuenta_corriente: true,
      roles: false,
    },
  },
  gastronomia: {
    name: "Pizzería / Gastronomía",
    desc: "Venta de combos (promociones), gastos diarios y notas/comandados de cocina.",
    modules: {
      clientes: false,
      vendedores: false,
      compras: false,
      gastos: true,
      combos_promociones: true,
      venta_fraccionada: false,
      analiticas: false,
      cuenta_corriente: false,
      roles: false,
    },
  },
  ferreteria: {
    name: "Ferretería / Corralón",
    desc: "Proveedores, stock por códigos, control multi-vendedor y cobro fiado.",
    modules: {
      clientes: true,
      vendedores: true,
      compras: true,
      gastos: true,
      combos_promociones: false,
      venta_fraccionada: false,
      analiticas: false,
      cuenta_corriente: true,
      roles: false,
    },
  },
  general: {
    name: "Comercio General",
    desc: "Perfil balanceado con acceso a todas las herramientas básicas de venta y stock.",
    modules: {
      clientes: true,
      vendedores: true,
      compras: true,
      gastos: true,
      combos_promociones: true,
      venta_fraccionada: true,
      analiticas: true,
      cuenta_corriente: true,
      roles: true,
    },
  },
};

export default function ConfiguracionPage() {
  const { refresh: refreshModules } = useModules();
  const [form, setForm] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "rubro_plan" | "backup" | "arca">(
    "general",
  );
  const [isSyncing, setIsSyncing] = useState(false);

  // Modal de Pago
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentItem, setPaymentItem] = useState<{
    key: string;
    name: string;
    price: number;
    callback?: () => void;
  } | null>(null);

  const fetchConfig = () => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setForm(data))
      .catch(() => toast.error("Error al cargar configuración."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "arcaCert" | "arcaKey"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleChange(field, content);
        toast.success(
          field === "arcaCert"
            ? "Certificado cargado correctamente."
            : "Clave privada cargada correctamente."
        );
      }
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error();
      toast.success("Configuración guardada correctamente.");
      await refreshModules();
    } catch {
      toast.error("Error al guardar la configuración.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Copia de seguridad completada con éxito.");
        setForm((prev) => ({ ...prev, supabase_last_sync: data.lastSync }));
      } else {
        toast.error(data.message || "Error al sincronizar.");
      }
    } catch {
      toast.error("Error de conexión al sincronizar.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Configuración
        </h1>
        <p className="text-sm text-foreground-muted">
          Gestioná los datos de tu comercio, rubro de negocio, facturación y copias de seguridad.
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-border flex gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors shrink-0 cursor-pointer ${
            activeTab === "general"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-foreground-muted hover:text-foreground hover:border-border"
          }`}
        >
          <Building size={16} /> Datos del Comercio
        </button>

        <button
          onClick={() => setActiveTab("rubro_plan")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors shrink-0 cursor-pointer ${
            activeTab === "rubro_plan"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-foreground-muted hover:text-foreground hover:border-border"
          }`}
        >
          <LayoutDashboard size={16} /> Rubro y Plan
        </button>

        <button
          onClick={() => setActiveTab("backup")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors shrink-0 cursor-pointer ${
            activeTab === "backup"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-foreground-muted hover:text-foreground hover:border-border"
          }`}
        >
          <Database size={16} /> Copias de Seguridad
        </button>

        <button
          onClick={() => setActiveTab("arca")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors shrink-0 cursor-pointer ${
            activeTab === "arca"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-foreground-muted hover:text-foreground hover:border-border"
          }`}
        >
          <ShieldCheck size={16} /> Facturación ARCA (AFIP)
        </button>
      </div>

      {/* Content Area */}
      {activeTab === "general" && (
        <ConfigGeneralTab
          form={form}
          handleChange={handleChange}
          handleSave={handleSave}
          isSaving={isSaving}
        />
      )}

      {activeTab === "rubro_plan" && (
        <ConfigRubroPlanTab
          form={form}
          handleChange={handleChange}
          handleSave={handleSave}
          isSaving={isSaving}
          profilePresets={PROFILE_PRESETS}
        />
      )}

      {activeTab === "backup" && (
        <ConfigBackupTab
          form={form}
          handleChange={handleChange}
          handleManualSync={handleManualSync}
          isSyncing={isSyncing}
        />
      )}

      {activeTab === "arca" && (
        <ConfigArcaTab
          form={form}
          handleChange={handleChange}
          handleFileUpload={handleFileUpload}
          handleSave={handleSave}
          isSaving={isSaving}
          onRefreshConfig={fetchConfig}
        />
      )}

      {/* Modal de Simulación de Pago */}
      <ConfigPaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setPaymentItem(null);
        }}
        paymentItem={paymentItem}
        onSuccessPayload={(payload) => {
          setForm((prev) => ({ ...prev, ...payload }));
        }}
      />
    </div>
  );
}
