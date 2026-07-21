"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Sparkles, CheckCircle, X } from "lucide-react";
import Button from "./Button";

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({
  isOpen,
  onClose,
  featureName = "esta funcionalidad",
}) => {
  const router = useRouter();

  if (!isOpen) return null;

  const handleGoToPlan = () => {
    onClose();
    router.push("/configuracion");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 relative text-left animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-foreground-muted hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-inner">
            <Sparkles size={24} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Plan Pro ⭐
            </span>
            <h3 className="text-lg font-bold text-foreground mt-0.5">
              Función del Plan Pro
            </h3>
          </div>
        </div>

        <p className="text-xs text-foreground-muted leading-relaxed">
          Para acceder a <strong className="text-foreground font-semibold">{featureName}</strong> necesitás contar con una suscripción al <strong className="text-primary font-bold">Plan Pro</strong>.
        </p>

        <div className="bg-muted/30 border border-border/80 rounded-xl p-4 space-y-2.5">
          <p className="text-xs font-bold text-foreground">El Plan Pro incluye:</p>
          <ul className="text-xs text-foreground-muted space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-500 shrink-0" />
              <span><strong>Cuenta Corriente / Fiado</strong> (Gestión de deudas)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-500 shrink-0" />
              <span><strong>Analíticas Avanzadas</strong> (Rentabilidad)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-500 shrink-0" />
              <span><strong>Roles y Permisos con PIN</strong> (Multiusuario)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-500 shrink-0" />
              <span><strong>Respaldo Automático en la Nube</strong></span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            type="button"
            onClick={async () => {
              try {
                const res = await fetch("/api/mp/checkout", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ itemType: "pro_mensual" }),
                });
                const data = await res.json();
                if (data.init_point) {
                  window.open(data.init_point, "_blank");
                }
              } catch {
                /* fallback */
              }
              handleGoToPlan();
            }}
            className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 shadow-sm cursor-pointer"
          >
            💳 Suscribirme al Plan Pro ($30.000/mes MP)
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoToPlan}
              className="w-full justify-center text-xs h-9 cursor-pointer"
            >
              Ver Planes y Licencias
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="w-auto justify-center text-xs h-9 cursor-pointer"
            >
              Volver
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProUpgradeModal;
