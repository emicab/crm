'use client';

import React from 'react';
import { ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface ArcaStep1GenerateProps {
  cuit: string;
  setCuit: (val: string) => void;
  businessName: string;
  setBusinessName: (val: string) => void;
  loading: boolean;
  onGenerate: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function ArcaStep1Generate({
  cuit,
  setCuit,
  businessName,
  setBusinessName,
  loading,
  onGenerate,
  onClose,
}: ArcaStep1GenerateProps) {
  return (
    <form onSubmit={onGenerate} className="space-y-5">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-sm text-foreground leading-relaxed">
        <p className="font-bold text-base text-primary mb-1.5 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" /> Configuración Automática y Segura
        </p>
        ClinPOS preparará la solicitud de tu comercio y descargará el archivo listo a tu computadora. Luego te guiaremos paso a paso para activarlo en AFIP sin complicaciones.
      </div>

      <div className="space-y-4">
        <Input
          label="CUIT del Comercio *"
          placeholder="Ej: 20123456789 (Sin guiones)"
          value={cuit}
          onChange={(e) => setCuit(e.target.value)}
          required
        />

        <Input
          label="Nombre del Comercio o Razón Social (Opcional)"
          placeholder="Ej: Kiosco Pepe S.R.L."
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
        />
      </div>

      <div className="pt-5 flex justify-end gap-3 border-t border-border/50">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="text-sm px-5 py-2.5"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="text-sm px-6 py-2.5 font-bold"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Preparando Solicitud...
            </>
          ) : (
            <>
              Crear Solicitud de Facturación
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
