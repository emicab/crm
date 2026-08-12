"use client";

import React from "react";
import Input from "@/components/ui/Input";
import { Globe } from "lucide-react";

interface StorePublicInfoSectionProps {
  formData: {
    slug: string;
    businessName: string;
    description: string;
    whatsappPhone: string;
    primaryColor: string;
    businessSector: string;
  };
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
}

export function StorePublicInfoSection({
  formData,
  onChange,
}: StorePublicInfoSectionProps) {
  return (
    <div className="bg-muted p-6 rounded-xl border border-border space-y-4">
      <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Globe size={18} className="text-primary" /> Datos Públicos de la Tienda
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="Subdominio / Slug de la Tienda *"
          name="slug"
          value={formData.slug}
          onChange={onChange}
          placeholder="ej. donyeyo"
          required
        />
        <Input
          label="Nombre Comercial Público *"
          name="businessName"
          value={formData.businessName}
          onChange={onChange}
          placeholder="ej. Panadería y Confitería Don Yeyo"
          required
        />
        <div>
          <label className="block text-sm font-medium text-foreground-muted mb-1">
            Rubro Comercial del Negocio
          </label>
          <select
            name="businessSector"
            value={formData.businessSector}
            onChange={onChange}
            className="w-full p-2.5 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 font-semibold"
          >
            <option value="GASTRONOMIA">
              🍔 Gastronomía (Restaurantes, Cafés, Dark Kitchens)
            </option>
            <option value="INDUMENTARIA">
              👕 Indumentaria y Calzado (Talles y Colores)
            </option>
            <option value="MINIMARKET">🛒 Minimarket / Almacén / Kiosco</option>
            <option value="RETAIL_GENERAL">🛍️ Retail y Comercio General</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground-muted mb-1">
          Descripción Breve o Eslogan
        </label>
        <textarea
          name="description"
          rows={2}
          value={formData.description}
          onChange={onChange}
          placeholder="Los mejores panes y facturas de la ciudad. Envíos en el día."
          className="w-full p-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Teléfono para pedidos / WhatsApp"
          name="whatsappPhone"
          value={formData.whatsappPhone}
          onChange={onChange}
          placeholder="ej. 5491123456789"
        />
        <Input
          label="Color Primario de la Tienda"
          type="color"
          name="primaryColor"
          value={formData.primaryColor}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
