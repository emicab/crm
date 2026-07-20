"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Building,
  Percent,
  RefreshCw,
  Smartphone,
  ShieldCheck,
  Receipt,
  Users,
  CreditCard,
  UserPlus,
  Truck,
  TrendingDown,
  LayoutDashboard,
  Key,
  Scale,
  Database,
  Cloud,
  Lock,
} from "lucide-react";
import QRCode from "qrcode";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import toast from "react-hot-toast";
import { PaymentTypeEnum } from "@/types";
import { getPaymentTypeDisplay } from "@/lib/displayTexts";
import pkg from "@/package.json";

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
      roles: true,
    },
  },
  boutique: {
    name: "Boutique / Indumentaria",
    desc: "Fidelización de clientes, comisiones de personal y analíticas de rentabilidad.",
    modules: {
      clientes: true,
      vendedores: true,
      compras: false,
      gastos: true,
      combos_promociones: false,
      venta_fraccionada: false,
      analiticas: true,
      cuenta_corriente: false,
      roles: true,
    },
  },
};

// Detalle de módulos pluggables disponibles
const AVAILABLE_MODULES = [
  {
    id: "venta_fraccionada",
    name: "Venta Fraccionada (Peso / Granel)",
    description:
      "Permite vender productos por peso, volumen o longitud (KG, L, M) usando cantidades decimales.",
    icon: Scale,
    category: "operativos",
  },
  {
    id: "combos_promociones",
    name: "Combos y Promociones",
    description:
      "Configura promociones automáticas (2x1, descuentos por volumen) y combos empaquetados de productos.",
    icon: Percent,
    category: "operativos",
  },
  {
    id: "clientes",
    name: "Clientes (CRM)",
    description:
      "Mantené un registro detallado de tus clientes, sus datos de contacto e historial de compras.",
    icon: Users,
    category: "administrativos",
  },
  {
    id: "cuenta_corriente",
    name: "Cuenta Corriente / Fiado",
    description:
      "Gestioná saldos deudores, entregas de dinero y plazos de cobro por cliente.",
    icon: CreditCard,
    category: "administrativos",
    dependency: "clientes",
  },
  {
    id: "vendedores",
    name: "Vendedores y Comisiones",
    description:
      "Identificá qué empleado realiza cada venta para realizar controles o liquidar comisiones.",
    icon: UserPlus,
    category: "administrativos",
  },
  {
    id: "compras",
    name: "Compras y Proveedores",
    description:
      "Registrá ingresos de stock, órdenes de compra y gestioná la base de proveedores.",
    icon: Truck,
    category: "administrativos",
  },
  {
    id: "gastos",
    name: "Gastos Operativos",
    description:
      "Controlá las salidas de dinero menores e indirectas de la caja diaria.",
    icon: TrendingDown,
    category: "administrativos",
  },
  {
    id: "analiticas",
    name: "Analíticas Avanzadas",
    description:
      "Visualizá gráficos de rentabilidad, márgenes por categoría y tendencias de ventas.",
    icon: LayoutDashboard,
    category: "administrativos",
  },
  {
    id: "roles",
    name: "Roles y Permisos (Multiusuario)",
    description:
      "Restringí accesos mediante códigos PIN para Cajeros, Supervisores y Administradores.",
    icon: Key,
    category: "administrativos",
  },
];

export default function ConfiguracionPage() {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "modules" | "backup" | "arca">(
    "general",
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [testingArca, setTestingArca] = useState(false);
  const [arcaStatusResult, setArcaStatusResult] = useState<string | null>(null);

  const handleTestArca = async () => {
    setTestingArca(true);
    setArcaStatusResult(null);
    try {
      const saveRes = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!saveRes.ok) throw new Error('Error al guardar configuración temporal');

      const res = await fetch('/api/arca/status');
      const data = await res.json();
      if (data.status === 'online') {
        toast.success('Conexión con ARCA establecida con éxito.');
        setArcaStatusResult(`Online - Servidor AFIP Operativo (App: ${data.serverStatus?.AppServer || 'OK'}, Db: ${data.serverStatus?.DbServer || 'OK'}, Auth: ${data.serverStatus?.AuthServer || 'OK'})`);
      } else {
        toast.error(data.message || 'Error en la conexión.');
        setArcaStatusResult(`Offline: ${data.message || 'Error desconocido'}`);
      }
    } catch (e: any) {
      toast.error('Error al probar conexión.');
      setArcaStatusResult(`Error: ${e.message}`);
    } finally {
      setTestingArca(false);
    }
  };

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentItem, setPaymentItem] = useState<{
    key: string;
    name: string;
    price: number;
    callback?: () => void;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"mp" | "card">("mp");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handleConfirmPayment = async () => {
    if (!paymentItem) return;
    setIsProcessingPayment(true);
    
    // Simular retraso de pasarela de pago (1.5 segundos)
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    try {
      const unlockKey = paymentItem.key;
      const bodyPayload: Record<string, string> = {
        [unlockKey]: "true",
      };

      // Si es el plan seguro, también activar el storage_mode correspondiente
      if (unlockKey === "unlocked_plan_seguro") {
        bodyPayload.storage_mode = "seguro";
      }

      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      if (!res.ok) throw new Error();
      
      toast.success(`¡Pago aprobado! Desbloqueado: ${paymentItem.name}`);
      
      // Actualizar estado local del formulario
      setForm((prev) => ({
        ...prev,
        ...bodyPayload,
      }));
      
      setShowPaymentModal(false);
      
      // Ejecutar callback para continuar la acción (por ejemplo, activar el toggle o aplicar el rubro)
      if (paymentItem.callback) {
        paymentItem.callback();
      }
    } catch {
      toast.error("Error al procesar el pago ficticio.");
    } finally {
      setIsProcessingPayment(false);
      setPaymentItem(null);
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

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setForm(data))
      .catch(() => toast.error("Error al cargar configuración."))
      .finally(() => setIsLoading(false));
  }, []);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Error al guardar");
      toast.success("Configuración guardada correctamente.");
    } catch {
      toast.error("Error al guardar configuración.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Manejo del cambio de perfil de rubro ---
  const handleProfileChange = async (profileKey: string) => {
    if (["gastronomia", "boutique"].includes(profileKey)) {
      const unlockKey = `unlocked_profile_${profileKey}`;
      if (form[unlockKey] !== "true") {
        const profileNames: Record<string, string> = {
          gastronomia: "Perfil Pizzería / Gastronomía",
          boutique: "Perfil Boutique / Tienda de Ropa"
        };
        setPaymentItem({
          key: unlockKey,
          name: profileNames[profileKey],
          price: 5900,
          callback: () => {
            handleProfileChange(profileKey);
          }
        });
        setShowPaymentModal(true);
        return;
      }
    }

    const updates: Record<string, string> = { business_profile: profileKey };
    if (profileKey !== "custom" && PROFILE_PRESETS[profileKey]) {
      const preset = PROFILE_PRESETS[profileKey].modules;
      for (const [modId, active] of Object.entries(preset)) {
        updates[`module_${modId}`] = active ? "true" : "false";
      }
    }

    setForm((prev) => ({ ...prev, ...updates }));

    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Error al actualizar perfil");
      }
      toast.success("Perfil de negocio aplicado con éxito.");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || "No se pudo aplicar el perfil.");
      // Recargar datos originales
      fetch("/api/config")
        .then((res) => res.json())
        .then((data) => setForm(data));
    }
  };

  // --- Activar/Desactivar módulo individual ---
  const handleToggleModule = async (moduleId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    
    // Si queremos activar un módulo premium y no está comprado
    if (["analiticas", "cuenta_corriente", "compras"].includes(moduleId) && newVal) {
      const unlockKey = `unlocked_module_${moduleId}`;
      if (form[unlockKey] !== "true") {
        const moduleNames: Record<string, string> = {
          analiticas: "Módulo de Estadísticas y Reportes",
          cuenta_corriente: "Módulo de Cuentas Corrientes (Fiado)",
          compras: "Módulo de Gestión de Compras y Proveedores"
        };
        const modulePrices: Record<string, number> = {
          analiticas: 2900,
          cuenta_corriente: 3900,
          compras: 4500
        };
        setPaymentItem({
          key: unlockKey,
          name: moduleNames[moduleId],
          price: modulePrices[moduleId],
          callback: () => {
            handleToggleModule(moduleId, currentVal);
          }
        });
        setShowPaymentModal(true);
        return;
      }
    }

    const newValString = newVal ? "true" : "false";

    // Si desactivamos clientes, desactivamos también cuenta corriente
    const extraUpdates: Record<string, string> = {};
    if (moduleId === "clientes" && !newVal) {
      extraUpdates.module_cuenta_corriente = "false";
    }

    const bodyPayload = {
      [`module_${moduleId}`]: newValString,
      business_profile: "custom",
      ...extraUpdates,
    };

    // Actualización optimista de UI
    setForm((prev) => ({
      ...prev,
      [`module_${moduleId}`]: newValString,
      business_profile: "custom",
      ...extraUpdates,
    }));

    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Error al actualizar módulo");
      }
      toast.success(`Módulo ${newVal ? "activado" : "desactivado"} con éxito.`);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || "No se pudo actualizar el módulo.");
      // Revertir cambio
      fetch("/api/config")
        .then((res) => res.json())
        .then((data) => setForm(data));
    }
  };

  // --- Cambio de Modo de Almacenamiento ---
  const handleStorageModeChange = async (mode: string) => {
    if (mode === "seguro" && form.unlocked_plan_seguro !== "true") {
      setPaymentItem({
        key: "unlocked_plan_seguro",
        name: "Plan Seguro (Respaldo Cloud Automático)",
        price: 4900,
        callback: () => {
          handleStorageModeChange("seguro");
        }
      });
      setShowPaymentModal(true);
      return;
    }

    if (mode === "local") {
      setActiveTab("general");
    }

    handleChange("storage_mode", mode);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storage_mode: mode }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Modo de almacenamiento cambiado a: ${mode.toUpperCase()}`);
    } catch {
      toast.error("No se pudo cambiar el modo de almacenamiento.");
      fetch("/api/config")
        .then((res) => res.json())
        .then((data) => setForm(data));
    }
  };

  // --- QR para carga de stock ---
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [qrError, setQrError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const port = window.location.port;
      fetch("/api/server-info")
        .then((res) => (res.ok ? res.json() : { ip: window.location.hostname }))
        .then((info: { ip: string }) => {
          const host = info.ip;
          const url = port
            ? `http://${host}:${port}/stock`
            : `http://${host}/stock`;
          setQrUrl(url);
          QRCode.toDataURL(url, {
            width: 180,
            margin: 2,
            color: { dark: "#0f172a", light: "#ffffff" },
          })
            .then((dataUrl: string) => {
              setQrDataUrl(dataUrl);
              setQrError("");
            })
            .catch(() => setQrError("Error al generar QR"));
        })
        .catch(() => {
          const fallback = port
            ? `http://127.0.0.1:${port}/stock`
            : "http://127.0.0.1/stock";
          setQrUrl(fallback);
          QRCode.toDataURL(fallback, {
            width: 180,
            margin: 2,
            color: { dark: "#0f172a", light: "#ffffff" },
          })
            .then((dataUrl: string) => {
              setQrDataUrl(dataUrl);
            })
            .catch(() => setQrError("Error al generar QR"));
        });
    }
  }, []);

  // --- Estado de actualizaciones ---
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [updatePercent, setUpdatePercent] = useState(0);
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const version = pkg.version;

  useEffect(() => {
    if (typeof window !== "undefined" && window.updateAPI) {
      const unsubscribe = window.updateAPI.onStatus((status: any) => {
        setUpdateStatus(status.status);
        if (status.percent) setUpdatePercent(status.percent);
        if (status.version) setUpdateVersion(status.version);
        if (status.error) setUpdateError(status.error);
        if (status.status === "checking") {
          setUpdateError(null);
          setUpdatePercent(0);
        }
      });
      return unsubscribe;
    }
  }, []);

  const handleCheckUpdates = useCallback(async () => {
    setUpdateStatus("checking");
    setUpdateError(null);
    setUpdatePercent(0);
    if (typeof window !== "undefined" && window.updateAPI) {
      await window.updateAPI.check();
    } else {
      setUpdateStatus("dev-mode");
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-foreground-muted">Cargando configuración...</p>
      </div>
    );
  }

  const currentProfile = form.business_profile || "custom";
  const currentStorageMode = form.storage_mode || "local";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div id="config-header">
        <h1 className="text-3xl font-semibold text-foreground">
          Configuración
        </h1>
        <p className="mt-1 text-foreground-muted">
          Ajustá los parámetros generales del sistema o gestioná sus módulos.
        </p>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-border mb-6">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === "general"
              ? "border-primary text-primary"
              : "border-transparent text-foreground-muted hover:text-foreground"
          }`}
        >
          Ajustes Generales
        </button>
        <button
          onClick={() => setActiveTab("modules")}
          className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === "modules"
              ? "border-primary text-primary"
              : "border-transparent text-foreground-muted hover:text-foreground"
          }`}
        >
          Módulos y Rubro
        </button>
        {form.storage_mode === "seguro" && (
          <button
            onClick={() => setActiveTab("backup")}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === "backup"
                ? "border-primary text-primary"
                : "border-transparent text-foreground-muted hover:text-foreground"
            }`}
          >
            Copia de Seguridad
          </button>
        )}
        <button
          onClick={() => setActiveTab("arca")}
          className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === "arca"
              ? "border-primary text-primary"
              : "border-transparent text-foreground-muted hover:text-foreground"
          }`}
        >
          Facturación ARCA / AFIP
        </button>
      </div>

      {activeTab === "general" && (
        <div className="space-y-8">
          <section className="bg-muted p-6 rounded-xl shadow space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Building size={20} className="text-primary" /> Datos del Negocio
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nombre del Negocio"
                value={form.businessName || ""}
                onChange={(e) => handleChange("businessName", e.target.value)}
                placeholder="Mi Negocio"
              />
              <Input
                label="CUIT"
                value={form.businessCuit || ""}
                onChange={(e) => handleChange("businessCuit", e.target.value)}
                placeholder="30-12345678-9"
              />
              <Input
                label="Dirección"
                value={form.businessAddress || ""}
                onChange={(e) =>
                  handleChange("businessAddress", e.target.value)
                }
                placeholder="Av. Siempre Viva 123"
              />
              <Input
                label="Teléfono"
                value={form.businessPhone || ""}
                onChange={(e) => handleChange("businessPhone", e.target.value)}
                placeholder="+54 11 1234-5678"
              />
            </div>
          </section>

          <section className="bg-muted p-6 rounded-xl shadow space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Percent size={20} className="text-primary" /> Impuestos y Pagos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="IVA (%)"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.taxRate || "0"}
                onChange={(e) => handleChange("taxRate", e.target.value)}
              />
              <Select
                label="Método de Pago por Defecto"
                value={form.defaultPaymentType || "CASH"}
                onChange={(e) =>
                  handleChange("defaultPaymentType", e.target.value)
                }
              >
                {Object.values(PaymentTypeEnum).map((type) => (
                  <option key={type} value={type}>
                    {getPaymentTypeDisplay(type)}
                  </option>
                ))}
              </Select>
            </div>
          </section>

          <section className="bg-muted p-6 rounded-xl shadow space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Percent size={20} className="text-primary" /> Descuentos por
              Método de Pago
            </h2>
            <p className="text-sm text-foreground-muted">
              Descuento aplicado automáticamente al seleccionar el método de
              pago en la venta.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.values(PaymentTypeEnum).map((type) => (
                <Input
                  key={type}
                  label={`${getPaymentTypeDisplay(type)} (%)`}
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form[`discount_${type}`] || "0"}
                  onChange={(e) =>
                    handleChange(`discount_${type}`, e.target.value)
                  }
                />
              ))}
            </div>
          </section>

          <section className="bg-muted p-6 rounded-xl shadow space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Receipt size={20} className="text-primary" /> Comprobantes
            </h2>
            <div className="space-y-4">
              <Input
                label="Texto al Pie del Comprobante"
                value={form.receiptFooter || ""}
                onChange={(e) => handleChange("receiptFooter", e.target.value)}
                placeholder="Gracias por su compra"
              />
              <Input
                label="Número de Próximo Comprobante"
                type="number"
                min="1"
                value={form.nextReceiptNumber || "1"}
                onChange={(e) =>
                  handleChange("nextReceiptNumber", e.target.value)
                }
              />
            </div>
          </section>

          <section className="bg-muted p-6 rounded-xl shadow space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <RefreshCw size={20} className="text-primary" /> Actualizaciones
            </h2>
            <p className="text-sm text-foreground-muted">
              Versión actual: <strong>{version}</strong>
            </p>
            <div className="flex items-center gap-4">
              <Button
                onClick={handleCheckUpdates}
                disabled={
                  updateStatus === "checking" || updateStatus === "downloading"
                }
              >
                <RefreshCw
                  size={16}
                  className={`mr-2 ${updateStatus === "checking" ? "animate-spin" : ""}`}
                />
                {updateStatus === "checking"
                  ? "Buscando..."
                  : updateStatus === "downloading"
                    ? "Descargando..."
                    : "Buscar actualizaciones"}
              </Button>
              {updateStatus === "up-to-date" && (
                <span className="text-sm text-success">✓ Estás al día</span>
              )}
              {updateStatus === "available" && (
                <span className="text-sm text-primary">
                  Nueva versión {updateVersion} disponible — descargando...
                </span>
              )}
              {updateStatus === "downloaded" && (
                <span className="text-sm text-success">
                  ✓ Versión {updateVersion} descargada. Reiniciá para instalar.
                </span>
              )}
              {updateStatus === "dev-mode" && (
                <span className="text-sm text-foreground-muted">
                  Modo desarrollo — sin actualizador
                </span>
              )}
              {updateError && (
                <span className="text-sm text-destructive">
                  Error: {updateError}
                </span>
              )}
            </div>
            {updateStatus === "downloading" && (
              <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${updatePercent}%` }}
                />
              </div>
            )}
          </section>

          <section className="bg-muted p-6 rounded-xl shadow space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Smartphone size={20} className="text-primary" /> Carga de Stock
              desde Celular
            </h2>
            <p className="text-sm text-foreground-muted">
              Escaneá este código QR desde tu celular para abrir la herramienta
              de carga de stock. Asegurate de estar conectado a la misma red
              WiFi.
            </p>
            <div className="flex flex-col items-center gap-3 py-2">
              {qrError ? (
                <p className="text-destructive text-sm">{qrError}</p>
              ) : qrDataUrl ? (
                <img
                  // eslint-disable-next-line @next/next/no-img-element
                  src={qrDataUrl}
                  alt="QR para carga de stock"
                  className="rounded-lg border border-border"
                />
              ) : (
                <p className="text-sm text-foreground-muted">Generando QR...</p>
              )}
              {qrUrl && (
                <p className="text-xs text-foreground-muted/70 font-mono bg-background px-3 py-1.5 rounded border border-border break-all text-center max-w-full">
                  {qrUrl}
                </p>
              )}
            </div>
          </section>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save size={16} className="mr-2" />{" "}
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>
      )}

      {activeTab === "modules" && (
        <div className="space-y-8">
          {/* SECCIÓN 1: Perfil de Rubro */}
          <section className="bg-muted p-6 rounded-xl shadow space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Building size={20} className="text-primary" /> Rubro / Perfil de
              Negocio
            </h2>
            <p className="text-sm text-foreground-muted">
              Seleccioná tu rubro para activar automáticamente las herramientas
              recomendadas. Siempre podés personalizar la selección de módulos
              de forma manual más abajo.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {Object.entries(PROFILE_PRESETS).map(([key, preset]) => (
                <div
                  key={key}
                  onClick={() => handleProfileChange(key)}
                  className={`border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary ${
                    currentProfile === key
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-white"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-sm text-foreground">
                      {preset.name}
                    </h3>
                    {["gastronomia", "boutique"].includes(key) && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                        form[`unlocked_profile_${key}`] === "true"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {form[`unlocked_profile_${key}`] === "true" ? "Adquirido" : "Premium 🔒"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                    {preset.desc}
                  </p>
                </div>
              ))}
              <div
                onClick={() => handleProfileChange("custom")}
                className={`border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary ${
                  currentProfile === "custom"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-white"
                }`}
              >
                <h3 className="font-semibold text-sm text-foreground">
                  Ajuste Personalizado
                </h3>
                <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                  Configurá cada módulo a mano según las necesidades exactas de
                  tu negocio.
                </p>
              </div>
            </div>
          </section>

          {/* SECCIÓN 2: Plan de Almacenamiento (Backup) */}
          <section className="bg-muted p-6 rounded-xl shadow space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Database size={20} className="text-primary" /> Almacenamiento y
              Respaldo
            </h2>
            <p className="text-sm text-foreground-muted">
              Elegí dónde se guardan tus datos de venta y si querés tener copias
              de seguridad en la nube automáticas.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div
                onClick={() => handleStorageModeChange("local")}
                className={`border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary bg-white ${
                  currentStorageMode === "local"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border"
                }`}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-sm text-foreground">
                    Plan Local
                  </h3>
                  <span className="text-xs font-bold text-foreground-muted bg-muted px-1.5 py-0.5 rounded">
                    Starter
                  </span>
                </div>
                <p className="text-xs text-foreground-muted mt-1.5 leading-relaxed">
                  Todo queda en tu computadora. Máxima velocidad offline. Copias
                  de seguridad manuales.
                </p>
              </div>

              <div
                onClick={() => handleStorageModeChange("seguro")}
                className={`border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary bg-white ${
                  currentStorageMode === "seguro"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border"
                }`}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-1">
                    Plan Seguro ⭐
                  </h3>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                    form.unlocked_plan_seguro === "true"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-primary/10 text-primary"
                  }`}>
                    {form.unlocked_plan_seguro === "true" ? "Adquirido" : "Premium 🔒"}
                  </span>
                </div>
                <p className="text-xs text-foreground-muted mt-1.5 leading-relaxed">
                  Operación local + respaldos automáticos en la nube cada vez
                  que cerrás la caja.
                </p>
              </div>

              <div
                className={`border rounded-xl p-4 cursor-not-allowed transition-all opacity-60 bg-muted/30 border-border`}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-sm text-foreground-muted flex items-center gap-1">
                    Plan Empresa <Lock size={12} />
                  </h3>
                </div>
                <p className="text-xs text-foreground-muted mt-1.5 leading-relaxed">
                  Consistencia en tiempo real. Varias cajas en red, sucursales y
                  acceso remoto web/móvil. *(Próximamente)*
                </p>
              </div>
            </div>
          </section>

          {/* SECCIÓN 3: Grilla de Módulos (App Store Style) */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-3 px-1">
                Herramientas de Venta (Módulos Operativos)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {AVAILABLE_MODULES.filter(
                  (m) => m.category === "operativos",
                ).map((m) => {
                  const isActive = form[`module_${m.id}`] === "true";
                  return (
                    <div
                      key={m.id}
                      className="bg-white border border-border p-5 rounded-xl flex items-start gap-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="bg-primary/10 text-primary p-3 rounded-lg">
                        <m.icon size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-foreground">
                          {m.name}
                        </h3>
                        <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                          {m.description}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2 pt-1">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          isActive 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>
                          {isActive ? "ON" : "OFF"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleModule(m.id, isActive)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-all duration-200 ease-in-out focus:outline-none shadow-inner ${
                            isActive
                              ? "bg-emerald-500 border-emerald-600"
                              : "bg-slate-300 border-slate-400"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              isActive ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-foreground mb-3 px-1">
                Administración y Gestión (Módulos Administrativos)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {AVAILABLE_MODULES.filter(
                  (m) => m.category === "administrativos",
                ).map((m) => {
                  const isActive = form[`module_${m.id}`] === "true";

                  // Verificar dependencias
                  let dependencyBlocked = false;
                  if (m.dependency) {
                    const depActive = form[`module_${m.dependency}`] === "true";
                    if (!depActive) {
                      dependencyBlocked = true;
                    }
                  }

                  return (
                    <div
                      key={m.id}
                      className={`bg-white border p-5 rounded-xl flex items-start gap-4 hover:shadow-sm transition-shadow ${
                        dependencyBlocked
                          ? "border-border bg-muted/10 opacity-70"
                          : "border-border"
                      }`}
                    >
                      <div
                        className={`p-3 rounded-lg ${dependencyBlocked ? "bg-muted text-foreground-muted" : "bg-primary/10 text-primary"}`}
                      >
                        <m.icon size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 w-full">
                          <h3 className="font-semibold text-sm text-foreground">
                            {m.name}
                          </h3>
                          {["analiticas", "cuenta_corriente", "compras"].includes(m.id) && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                              form[`unlocked_module_${m.id}`] === "true"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-500"
                            }`}>
                              {form[`unlocked_module_${m.id}`] === "true" ? "Adquirido" : "Premium 🔒"}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                          {m.description}
                        </p>
                        {m.id === "roles" && isActive && (
                          <button
                            type="button"
                            onClick={() =>
                              router.push("/configuracion/usuarios")
                            }
                            className="mt-2 text-xs text-primary font-bold hover:underline items-center gap-1.5 cursor-pointer flex"
                          >
                            <Users size={12} /> Gestionar personal y PINs
                          </button>
                        )}
                        {dependencyBlocked && (
                          <p className="text-[10px] font-semibold text-destructive mt-1.5">
                            * Requiere activar el módulo:{" "}
                            {
                              AVAILABLE_MODULES.find(
                                (x) => x.id === m.dependency,
                              )?.name
                            }
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-2 pt-1">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          dependencyBlocked
                            ? "bg-slate-100 text-slate-400 border-slate-200"
                            : isActive 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>
                          {dependencyBlocked ? "BLOQUEADO" : isActive ? "ON" : "OFF"}
                        </span>
                        <button
                          type="button"
                          disabled={dependencyBlocked}
                          onClick={() => handleToggleModule(m.id, isActive)}
                          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-all duration-200 ease-in-out focus:outline-none shadow-inner ${
                            dependencyBlocked
                              ? "cursor-not-allowed bg-slate-200 border-slate-300 opacity-60"
                              : "cursor-pointer"
                          } ${
                            isActive && !dependencyBlocked
                              ? "bg-emerald-500 border-emerald-600"
                              : "bg-slate-300 border-slate-400"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              isActive && !dependencyBlocked
                                ? "translate-x-5"
                                : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "backup" && (
        <div className="space-y-8">
          <section className="bg-muted p-6 rounded-xl shadow space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Database size={20} className="text-primary" /> Respaldo en la Nube
            </h2>
            <p className="text-sm text-foreground-muted">
              El sistema guarda de forma automática una copia de seguridad en la nube para proteger tus datos de ventas, clientes y stock frente a fallas del equipo físico.
            </p>

            <div className="bg-white border border-border p-5 rounded-xl space-y-4 shadow-sm text-sm">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="font-semibold text-foreground">
                  Estado del Respaldo
                </span>
                {form.supabase_url ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />{" "}
                    Activo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                    <span className="h-2 w-2 rounded-full bg-red-500" />{" "}
                    Desconectado
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-foreground-muted flex justify-between">
                  <span>Última Sincronización Automática:</span>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {form.supabase_last_sync
                      ? new Date(form.supabase_last_sync).toLocaleString()
                      : "Nunca completada"}
                  </span>
                </p>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between gap-4">
                <p className="text-xs text-foreground-muted max-w-md">
                  El respaldo automático se ejecuta de forma silenciosa cada 5
                  minutos y al cerrar la caja del día.
                </p>
                <Button
                  onClick={handleManualSync}
                  disabled={isSyncing || !form.supabase_url}
                  className="shrink-0"
                >
                  <RefreshCw
                    size={16}
                    className={`mr-2 ${isSyncing ? "animate-spin" : ""}`}
                  />
                  {isSyncing ? "Guardando copia..." : "Iniciar Respaldo Manual"}
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === "arca" && (
        <div className="space-y-8">
          <section className="bg-muted p-6 rounded-xl shadow space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck size={20} className="text-primary" /> Facturación Electrónica (ARCA / AFIP)
            </h2>
            <p className="text-sm text-foreground-muted">
              Configurá la emisión de facturas electrónicas con el Web Service de ARCA.
            </p>
            
            <div className="flex items-center gap-2 py-2">
              <input
                id="arcaEnabled"
                type="checkbox"
                checked={form.arcaEnabled === 'true'}
                onChange={(e) => handleChange('arcaEnabled', e.target.checked ? 'true' : 'false')}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary bg-background"
              />
              <label htmlFor="arcaEnabled" className="text-sm font-medium text-foreground select-none cursor-pointer">
                Habilitar Facturación Electrónica
              </label>
            </div>

            {form.arcaEnabled === 'true' && (
              <div className="space-y-4 pt-2 border-t border-border/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="CUIT Emisor" value={form.arcaCuit || ''} onChange={(e) => handleChange('arcaCuit', e.target.value)} placeholder="30123456789 (sin guiones)" />
                  <Input label="Punto de Venta" type="number" value={form.arcaPointOfSale || '1'} onChange={(e) => handleChange('arcaPointOfSale', e.target.value)} placeholder="1" />
                  
                  <Select label="Entorno" value={form.arcaEnv || 'homologacion'} onChange={(e) => handleChange('arcaEnv', e.target.value)}>
                    <option value="homologacion">Homologación (Pruebas)</option>
                    <option value="produccion">Producción (Real)</option>
                  </Select>
                  
                  <Select label="Condición frente al IVA" value={form.arcaIvaCondition || 'RI'} onChange={(e) => handleChange('arcaIvaCondition', e.target.value)}>
                    <option value="RI">Responsable Inscripto</option>
                    <option value="MT">Monotributista</option>
                    <option value="EX">Exento</option>
                  </Select>

                  <Input label="Ingresos Brutos (IIBB)" value={form.arcaIibb || ''} onChange={(e) => handleChange('arcaIibb', e.target.value)} placeholder="901-123456-7" />
                  <Input label="Inicio de Actividades (AAAA-MM-DD)" value={form.arcaBusinessStartDate || ''} onChange={(e) => handleChange('arcaBusinessStartDate', e.target.value)} placeholder="2020-01-01" />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">Certificado Digital (.crt / .pem)</label>
                    <textarea
                      rows={4}
                      value={form.arcaCert || ''}
                      onChange={(e) => handleChange('arcaCert', e.target.value)}
                      placeholder="-----BEGIN CERTIFICATE-----\nMIIFzDCCBLSgAwIBAgIQ..."
                      className="w-full text-xs font-mono p-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring placeholder:text-foreground-muted/50"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">Clave Privada (.key)</label>
                    <textarea
                      rows={4}
                      value={form.arcaKey || ''}
                      onChange={(e) => handleChange('arcaKey', e.target.value)}
                      placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC..."
                      className="w-full text-xs font-mono p-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring placeholder:text-foreground-muted/50"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
                  <Button type="button" onClick={handleTestArca} disabled={testingArca} variant="secondary">
                    <RefreshCw size={16} className={`mr-2 ${testingArca ? 'animate-spin' : ''}`} />
                    {testingArca ? 'Probando...' : 'Probar conexión con ARCA'}
                  </Button>
                  {arcaStatusResult && (
                    <span className={`text-sm font-medium ${arcaStatusResult.includes('Online') ? 'text-success' : 'text-destructive'}`}>
                      {arcaStatusResult}
                    </span>
                  )}
                </div>
              </div>
            )}
          </section>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save size={16} className="mr-2" /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      )}

      {/* MODAL: Simulación de Pago */}
      {showPaymentModal && paymentItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 text-center">
            
            {/* Header / Logo de MP */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Pasarela de Pago Segura</span>
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">Simulación</span>
            </div>

            <div className="space-y-2 py-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-foreground">Activar {paymentItem.name}</h3>
              <p className="text-xs text-foreground-muted">
                Para desbloquear este módulo e integrarlo a tu comercio de forma permanente, por favor realiza el pago simulado.
              </p>
            </div>

            {/* Factura / Precio */}
            <div className="bg-slate-50 border border-border rounded-xl p-4 space-y-2 text-xs text-left">
              <div className="flex justify-between font-medium">
                <span className="text-foreground-muted">Detalle:</span>
                <span className="text-foreground">{paymentItem.name}</span>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-2 font-bold text-sm">
                <span className="text-foreground-muted">Total a Pagar:</span>
                <span className="text-primary font-mono">${paymentItem.price.toLocaleString("es-AR", { minimumFractionDigits: 2 })} ARS</span>
              </div>
            </div>

            {/* Método de Pago */}
            <div className="space-y-2.5 text-xs text-left">
              <span className="font-bold text-foreground block">Método de Pago Ficticio:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("mp")}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    paymentMethod === "mp"
                      ? "border-primary bg-primary/5 ring-1 ring-primary font-semibold text-primary"
                      : "border-border bg-white text-foreground-muted hover:border-foreground-muted"
                  }`}
                >
                  Mercado Pago (Simulado)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    paymentMethod === "card"
                      ? "border-primary bg-primary/5 ring-1 ring-primary font-semibold text-primary"
                      : "border-border bg-white text-foreground-muted hover:border-foreground-muted"
                  }`}
                >
                  Tarjeta Crédito (Simulada)
                </button>
              </div>
            </div>

            {/* Acciones */}
            <div className="pt-4 border-t border-border flex justify-end gap-2 text-xs">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentItem(null);
                }}
                disabled={isProcessingPayment}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isProcessingPayment}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {isProcessingPayment ? "Aprobando transacción..." : "Realizar Pago Simulado"}
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
