"use client";

import React, { useState } from "react";
import pkg from "../../package.json";
import { 
  Building, 
  Store, 
  ChefHat, 
  Scale, 
  Hammer, 
  ShoppingBag, 
  Sliders 
} from "lucide-react";
import toast from "react-hot-toast";

const PROFILE_OPTIONS = [
  {
    key: "kiosco",
    name: "Kiosco / Almacén",
    desc: "Optimizado para ventas de productos por unidad, fiado a clientes y control básico de caja diaria.",
    icon: Store,
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
    }
  },
  {
    key: "fiambreria",
    name: "Fiambrería / Verdulería / Carnicería",
    desc: "Incluye venta fraccionada por peso/gramos, reposición automática de stock con proveedores y control de caja diaria.",
    icon: Scale,
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
    }
  },
  {
    key: "gastronomia",
    name: "Pizzería / Rotisería / Gastronomía",
    desc: "Configura combos promocionales, notas/aclaraciones de preparación en comandas y control de egresos.",
    icon: ChefHat,
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
    }
  },
  {
    key: "ferreteria",
    name: "Ferretería / Corralón",
    desc: "Manejo de stock por código, base de proveedores, múltiples vendedores y cuentas corrientes.",
    icon: Hammer,
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
    }
  },
  {
    key: "boutique",
    name: "Boutique / Indumentaria",
    desc: "Fidelización de clientes (CRM), administración de comisiones de personal y gráficos avanzados de rendimiento.",
    icon: ShoppingBag,
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
    }
  },
  {
    key: "custom",
    name: "Ajuste Personalizado / Todo Activo",
    desc: "Habilita todas las herramientas y decidí luego qué encender o apagar en Configuración.",
    icon: Sliders,
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
    }
  }
];

export default function OnboardingModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSelectPreset = async (key: string, modulesPreset: Record<string, boolean>) => {
    setIsSubmitting(true);
    const updates: Record<string, string> = { business_profile: key };
    for (const [modId, active] of Object.entries(modulesPreset)) {
      updates[`module_${modId}`] = active ? "true" : "false";
    }

    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Error al configurar perfil inicial");
      
      toast.success("¡Configuración inicial cargada con éxito!");
      onClose();
      // Recargar para aplicar cambios en el layout completo
      window.location.reload();
    } catch {
      toast.error("No se pudo guardar la selección.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="bg-muted text-foreground rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-border">
        {/* Encabezado */}
        <div className="p-6 md:p-8 border-b border-border text-center shrink-0">
          <h2 className="text-3xl font-bold tracking-tight uppercase">
            Te damos la bienvenida a <span className="text-primary font-extrabold">ClinPOS</span>
          </h2>
          <p className="text-sm text-foreground-muted mt-2 max-w-xl mx-auto">
            Para adaptar la aplicación a las necesidades de tu comercio, seleccioná el rubro que mejor te describa.
          </p>
        </div>

        {/* Listado de Rubros (Scrollable) */}
        <div className="p-6 md:p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 bg-background/50">
          {PROFILE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                disabled={isSubmitting}
                onClick={() => handleSelectPreset(opt.key, opt.modules)}
                className="group text-left bg-white border border-border p-5 rounded-xl transition-all duration-200 hover:shadow-lg hover:border-primary hover:-translate-y-0.5 flex flex-col justify-between h-52 disabled:opacity-60 disabled:pointer-events-none"
              >
                <div>
                  <div className="bg-primary/10 text-primary p-2.5 rounded-lg w-fit group-hover:bg-primary group-hover:text-white transition-colors duration-200">
                    <Icon size={20} />
                  </div>
                  <h3 className="font-bold text-sm text-foreground mt-3 group-hover:text-primary transition-colors">
                    {opt.name}
                  </h3>
                  <p className="text-xs text-foreground-muted mt-1.5 leading-relaxed">
                    {opt.desc}
                  </p>
                </div>
                <div className="text-[10px] uppercase font-bold text-primary tracking-wider pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Comenzar →
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer simple */}
        <div className="p-4 border-t border-border bg-muted flex items-center justify-between text-xs text-foreground-muted shrink-0 px-6">
          <p>ClinPOS v{pkg.version} &copy; {new Date().getFullYear()}</p>
          <p>Los módulos se pueden volver a configurar en cualquier momento.</p>
        </div>
      </div>
    </div>
  );
}
