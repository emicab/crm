"use client";

import React, { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import { FEATURE_PEYA, FEATURE_RAPPI } from "@/lib/featureFlags";

export function DeliveryAppsConfigSection() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    peyaEnabled: false,
    peyaConnected: false,
    peyaChainId: "",
    peyaVendorId: "",
    peyaEnv: "SANDBOX",
    peyaAutoAccept: false,

    rappiEnabled: false,
    rappiApiKey: "",
    rappiStoreId: "",
    rappiAutoAccept: false,
    rappiWebhookSecret: "",
  });
  const [storeConfigId, setStoreConfigId] = useState<number | null>(null);
  const [connectingPeya, setConnectingPeya] = useState(false);
  const [peyaWebhookUrl, setPeyaWebhookUrl] = useState("");
  const [peyaWebhookToken, setPeyaWebhookToken] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch("/api/store-config")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.config) {
          setFormData((prev) => ({
            ...prev,
            peyaEnabled: Boolean(data.config.peyaEnabled),
            peyaConnected: Boolean(data.config.peyaConnected),
            peyaChainId: data.config.peyaChainId || "",
            peyaVendorId: data.config.peyaVendorId || "",
            peyaEnv: data.config.peyaEnv || "SANDBOX",
            peyaAutoAccept: Boolean(data.config.peyaAutoAccept),

            rappiEnabled: Boolean(data.config.rappiEnabled),
            rappiApiKey: data.config.rappiApiKey || "",
            rappiStoreId: data.config.rappiStoreId || "",
            rappiAutoAccept: Boolean(data.config.rappiAutoAccept),
            rappiWebhookSecret: data.config.rappiWebhookSecret || "",
          }));
          setStoreConfigId(data.config.id);
        }
      })
      .catch((err) => console.error("Error cargando configuración:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch("/api/store-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Error al guardar la configuración");
      toast.success("Configuración de PedidosYa y Rappi guardada.");
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleConnectPeya = async () => {
    if (!storeConfigId || !formData.peyaChainId || !formData.peyaVendorId) {
      toast.error("Por favor completa el Chain ID y Vendor ID antes de conectar.");
      return;
    }

    try {
      setConnectingPeya(true);
      const res = await fetch("/api/integrations/peya/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeConfigId,
          chainId: formData.peyaChainId,
          vendorId: formData.peyaVendorId,
          peyaEnv: formData.peyaEnv,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo vincular la tienda");

      setFormData((prev) => ({ ...prev, peyaConnected: true }));
      setPeyaWebhookUrl(data.webhookUrl || "");
      setPeyaWebhookToken(data.webhookSecret || "");
      toast.success("¡Tienda vinculada con éxito con PedidosYa!");
    } catch (err: any) {
      toast.error(err.message || "Error al conectar con PedidosYa");
    } finally {
      setConnectingPeya(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado al portapapeles`);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  // Sin credenciales todavía: ocultar toda la sección de delivery.
  if (!FEATURE_PEYA && !FEATURE_RAPPI) {
    return null;
  }

  if (loading) {
    return <div className="p-4 text-xs text-foreground-muted">Cargando integraciones...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Seccion PedidosYa */}
      {FEATURE_PEYA && (
      <div className="p-5 bg-background border border-border rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-600" />
            <h3 className="font-bold text-sm text-foreground">PedidosYa Partner API v2</h3>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
            <input
              type="checkbox"
              name="peyaEnabled"
              checked={formData.peyaEnabled}
              onChange={handleChange}
              className="w-4 h-4 rounded text-rose-600"
            />
            Habilitar PedidosYa
          </label>
        </div>

        {formData.peyaEnabled && (
          <div className="space-y-4 pt-2 border-t border-border text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">Entorno API:</label>
                <select
                  name="peyaEnv"
                  value={formData.peyaEnv}
                  onChange={handleChange}
                  className="w-full p-2 rounded-xl border border-border bg-muted text-foreground font-semibold"
                >
                  <option value="SANDBOX">Sandbox (Pruebas - sandbox.partner.deliveryhero.io)</option>
                  <option value="PRODUCTION">Producción (Live - pedidosya.partner.deliveryhero.io)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Auto-Aceptar Pedidos:</label>
                <label className="flex items-center gap-2 pt-2 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    name="peyaAutoAccept"
                    checked={formData.peyaAutoAccept}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-rose-600"
                  />
                  Aceptar automáticamente al recibir webhook
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Chain ID (ID de Cadena)"
                name="peyaChainId"
                value={formData.peyaChainId}
                onChange={handleChange}
                placeholder="UUID de la marca"
              />
              <Input
                label="Vendor ID (ID de Sucursal)"
                name="peyaVendorId"
                value={formData.peyaVendorId}
                onChange={handleChange}
                placeholder="UUID o ID del local"
              />
            </div>

            <div className="p-4 bg-muted/60 border border-border rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold block text-sm">Estado de Conexión:</span>
                <span className={`text-xs font-semibold ${formData.peyaConnected ? "text-emerald-600" : "text-rose-500"}`}>
                  {formData.peyaConnected ? "🟢 Conectado con PedidosYa" : "🔴 No Vinculado"}
                </span>
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={handleConnectPeya}
                disabled={connectingPeya}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {connectingPeya ? "Conectando..." : "🔗 Conectar con PedidosYa"}
              </Button>
            </div>

            {(formData.peyaConnected || peyaWebhookUrl) && (
              <div className="p-3 bg-background rounded-xl border border-border space-y-2">
                <p className="font-bold text-foreground">
                  📋 Último paso: configurar el webhook en PedidosYa
                </p>
                <p className="text-[11px] text-foreground-muted">
                  Ingresá a tu cuenta de PedidosYa (Vendor Portal) y pegá estos datos en la
                  configuración del webhook. Los pedidos empezarán a llegar automáticamente.
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 block p-2 bg-muted rounded border border-border font-mono text-[11px] select-all break-all">
                      {peyaWebhookUrl || "https://clinstore.vercel.app/api/webhooks/peya"}
                    </code>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(peyaWebhookUrl || "https://clinstore.vercel.app/api/webhooks/peya", "URL")
                      }
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-muted border border-border hover:bg-border cursor-pointer"
                    >
                      Copiar
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 block p-2 bg-muted rounded border border-border font-mono text-[11px] select-all break-all">
                      {peyaWebhookToken || "••••••••••••••••"}
                    </code>
                    <button
                      type="button"
                      onClick={() => peyaWebhookToken && copyToClipboard(peyaWebhookToken, "Token")}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-muted border border-border hover:bg-border cursor-pointer"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-foreground-muted">
                  El token se genera automáticamente al conectar. PeYA debe enviarlo en{" "}
                  <code className="font-mono">Authorization: Bearer &lt;token&gt;</code>.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Seccion Rappi */}
      {FEATURE_RAPPI && (
      <div className="p-5 bg-background border border-border rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <h3 className="font-bold text-sm text-foreground">Rappi Integrations API</h3>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
            <input
              type="checkbox"
              name="rappiEnabled"
              checked={formData.rappiEnabled}
              onChange={handleChange}
              className="w-4 h-4 rounded text-amber-500"
            />
            Habilitar Rappi
          </label>
        </div>

        {formData.rappiEnabled && (
          <div className="space-y-4 pt-2 border-t border-border text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="API Key de Tienda"
                type="password"
                name="rappiApiKey"
                value={formData.rappiApiKey}
                onChange={handleChange}
                placeholder="••••••••••••••••"
              />
              <Input
                label="Store ID (ID de Local)"
                name="rappiStoreId"
                value={formData.rappiStoreId}
                onChange={handleChange}
                placeholder="Ej. store_12345"
              />
            </div>

            <div className="p-3 bg-muted rounded-xl text-[11px] text-foreground-muted space-y-1">
              <p className="font-bold text-foreground">📌 URL de Webhook para Rappi:</p>
              <code className="block p-2 bg-background rounded border border-border font-mono select-all">
                https://tu-dominio.com/api/integrations/rappi/webhook
              </code>
              <p className="pt-1">
                Configurá el mismo token en Rappi. Cada notificación debe llegar con{" "}
                <code className="font-mono">Authorization: Bearer &lt;token&gt;</code>.
              </p>
            </div>

            <div>
              <Input
                label="Webhook Secret (token estático)"
                type="password"
                name="rappiWebhookSecret"
                value={formData.rappiWebhookSecret}
                onChange={handleChange}
                placeholder="Token que Rappi incluye en Authorization"
              />
            </div>
          </div>
        )}
      </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Guardando..." : "Guardar Credenciales de Integración"}
        </Button>
      </div>
    </form>
  );
}
