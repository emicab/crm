"use client";

import React, { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Loader2, Globe, ShoppingBag, CreditCard, ExternalLink, CheckCircle2, ShieldCheck, Smartphone, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

export default function ConfigTiendaWebTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    slug: "",
    businessName: "",
    description: "",
    logoUrl: "",
    bannerUrl: "",
    primaryColor: "#2563eb",
    isWebActive: false,
    mpAccessToken: "",
    mpPublicKey: "",
    mpFeePercent: 0,
    whatsappPhone: "",
    minStockBuffer: 0,
    allowPickup: true,
    allowDelivery: true,
    deliveryFee: 0,
    minDeliveryAmount: 0,
  });

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/store-config");
      if (res.ok) {
        const data = await res.json();
        setFormData({
          slug: data.slug || "",
          businessName: data.businessName || "",
          description: data.description || "",
          logoUrl: data.logoUrl || "",
          bannerUrl: data.bannerUrl || "",
          primaryColor: data.primaryColor || "#2563eb",
          isWebActive: Boolean(data.isWebActive),
          mpAccessToken: data.mpAccessToken || "",
          mpPublicKey: data.mpPublicKey || "",
          mpFeePercent: parseFloat(data.mpFeePercent) || 0,
          whatsappPhone: data.whatsappPhone || "",
          minStockBuffer: parseFloat(data.minStockBuffer) || 0,
          allowPickup: data.allowPickup !== undefined ? Boolean(data.allowPickup) : true,
          allowDelivery: data.allowDelivery !== undefined ? Boolean(data.allowDelivery) : true,
          deliveryFee: parseFloat(data.deliveryFee) || 0,
          minDeliveryAmount: parseFloat(data.minDeliveryAmount) || 0,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar la configuración de la tienda web.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.slug.trim()) {
      toast.error("Ingresá un subdominio/slug válido para la tienda.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/store-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Error al guardar la configuración.");
      }

      toast.success("¡Configuración de ClinStore guardada con éxito!");
      fetchConfig();
    } catch (err: any) {
      toast.error(err.message || "Ocurrió un error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const storeUrl = formData.slug ? `https://${formData.slug.toLowerCase()}.clinstore.app` : "";

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 size={32} className="animate-spin text-primary" />
        <span className="ml-3 text-foreground-muted">Cargando datos de ClinStore...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShoppingBag size={28} />
            <h2 className="text-2xl font-bold">Módulo ClinStore E-Commerce</h2>
          </div>
          <p className="text-blue-100 text-sm max-w-xl">
            Publicá tu catálogo de productos, precios y stock en tiempo real en tu tienda online propia conectada a ClinPOS.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20">
          <span className="text-xs font-semibold">Estado de la tienda:</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="isWebActive"
              checked={formData.isWebActive}
              onChange={handleChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-white/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
          <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${formData.isWebActive ? "bg-emerald-500 text-white" : "bg-white/20 text-white"}`}>
            {formData.isWebActive ? "Activa" : "Inactiva"}
          </span>
        </div>
      </div>

      {/* URL de la tienda */}
      {formData.slug && (
        <div className="bg-muted p-4 rounded-xl border border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 truncate">
            <Globe className="text-primary shrink-0" size={20} />
            <span className="text-sm font-semibold text-foreground truncate">Tu enlace público:</span>
            <a
              href={storeUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-600 hover:underline font-mono truncate flex items-center gap-1"
            >
              {storeUrl} <ExternalLink size={14} />
            </a>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(storeUrl);
              toast.success("Enlace copiado al portapapeles");
            }}
          >
            Copiar Enlace
          </Button>
        </div>
      )}

      {/* Configuración Básica */}
      <div className="bg-muted p-6 rounded-xl border border-border space-y-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Globe size={18} className="text-primary" /> Datos Públicos de la Tienda
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Subdominio / Slug de la Tienda *"
            name="slug"
            value={formData.slug}
            onChange={handleChange}
            placeholder="ej. donyeyo"
            required
          />
          <Input
            label="Nombre Comercial Público *"
            name="businessName"
            value={formData.businessName}
            onChange={handleChange}
            placeholder="ej. Panadería y Confitería Don Yeyo"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground-muted mb-1">Descripción Breve o Eslogan</label>
          <textarea
            name="description"
            rows={2}
            value={formData.description}
            onChange={handleChange}
            placeholder="Los mejores panes y facturas de la ciudad. Envíos en el día."
            className="w-full p-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Teléfono para pedidos / WhatsApp"
            name="whatsappPhone"
            value={formData.whatsappPhone}
            onChange={handleChange}
            placeholder="ej. 5491123456789"
          />
          <Input
            label="Color Primario de la Tienda"
            type="color"
            name="primaryColor"
            value={formData.primaryColor}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Vinculación Mercado Pago */}
      <div className="bg-muted p-6 rounded-xl border border-border space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <CreditCard size={18} className="text-blue-600" /> Cobros Online con Mercado Pago
          </h3>
          <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold">
            Integración Directa
          </span>
        </div>
        <p className="text-xs text-foreground-muted">
          Los pagos ingresarán de forma instantánea a tu propia cuenta de Mercado Pago cuando tus clientes compren en ClinStore.
        </p>

        {/* OAuth Button */}
        <div className="p-4 bg-background border border-blue-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Vinculación Oficial 1-Clic (OAuth 2.0)</p>
              <p className="text-xs text-foreground-muted">Conectá tu cuenta de Mercado Pago con 1 clic sin copiar claves secretas.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/api/mercadopago/connect"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
            >
              Conectar Mercado Pago (OAuth 2.0) 🔗
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <Input
            label="Access Token de Producción (Opcional)"
            name="mpAccessToken"
            value={formData.mpAccessToken}
            onChange={handleChange}
            placeholder="APP_USR-..."
            type="password"
          />
          <Input
            label="Public Key (Opcional)"
            name="mpPublicKey"
            value={formData.mpPublicKey}
            onChange={handleChange}
            placeholder="APP_USR-..."
          />
          <Input
            label="Comisión Estimada Mercado Pago (%)"
            name="mpFeePercent"
            type="number"
            step="0.01"
            value={String(formData.mpFeePercent)}
            onChange={handleChange}
            placeholder="ej. 6.49"
          />
        </div>
        <p className="text-xs text-foreground-muted italic">
          💡 La comisión estimada (ej. 6.49% en el acto o 3.99% a 14 días) te permite visualizar la deducción retenida por MP al evaluar tus ventas netas del día.
        </p>
      </div>

      {/* Reglas de Stock y Envíos */}
      <div className="bg-muted p-6 rounded-xl border border-border space-y-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Smartphone size={18} className="text-emerald-600" /> Stock de Seguridad y Envíos
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Buffer de Stock de Seguridad"
            type="number"
            name="minStockBuffer"
            value={String(formData.minStockBuffer)}
            onChange={handleChange}
            placeholder="0"
          />
          <Input
            label="Costo de Envío ($)"
            type="number"
            name="deliveryFee"
            value={String(formData.deliveryFee)}
            onChange={handleChange}
            placeholder="0"
          />
          <Input
            label="Pedido Mínimo Envío ($)"
            type="number"
            name="minDeliveryAmount"
            value={String(formData.minDeliveryAmount)}
            onChange={handleChange}
            placeholder="0"
          />
          <div className="flex flex-col justify-end space-y-2">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                name="allowPickup"
                checked={formData.allowPickup}
                onChange={handleChange}
                className="rounded border-border"
              />
              Permitir Retiro en Local
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                name="allowDelivery"
                checked={formData.allowDelivery}
                onChange={handleChange}
                className="rounded border-border"
              />
              Permitir Envío a Domicilio
            </label>
          </div>
        </div>
      </div>

      {/* Botón Guardar */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={fetchConfig} disabled={saving}>
          <RefreshCw size={16} className="mr-2" /> Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle2 size={16} className="mr-2" />}
          {saving ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>
    </form>
  );
}
