'use client';

import React from 'react';
import { FileCheck2, Upload, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

interface ArcaStep3UploadCertProps {
  certFileName: string;
  certFileContent: string;
  pointOfSale: number;
  setPointOfSale: (val: number) => void;
  env: 'homologacion' | 'produccion';
  setEnv: (val: 'homologacion' | 'produccion') => void;
  saving: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBack: () => void;
  onSave: () => void;
}

export default function ArcaStep3UploadCert({
  certFileName,
  certFileContent,
  pointOfSale,
  setPointOfSale,
  env,
  setEnv,
  saving,
  onFileUpload,
  onBack,
  onSave,
}: ArcaStep3UploadCertProps) {
  return (
    <div className="space-y-5">
      <div className="bg-muted/30 border border-border/80 rounded-xl p-5 space-y-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Cargar Certificado Emitido por AFIP (.crt)
        </h3>

        <div>
          <label className="block text-sm font-bold text-foreground mb-2">
            Seleccionar archivo .crt / .pem descargado de AFIP <span className="text-red-500">*</span>
          </label>
          <label className="border-2 border-dashed border-border hover:border-primary bg-background hover:bg-muted/50 rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition text-center group">
            <Upload className="w-9 h-9 text-foreground-muted group-hover:text-primary mb-2.5 transition" />
            {certFileName ? (
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> {certFileName}
              </span>
            ) : (
              <>
                <span className="text-sm font-bold text-foreground">Hacé clic para buscar tu archivo .crt</span>
                <span className="text-xs text-foreground-muted mt-1">Soporta archivos .crt, .pem o .txt</span>
              </>
            )}
            <input
              type="file"
              accept=".crt,.pem,.txt"
              onChange={onFileUpload}
              className="hidden"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <Input
            label="Punto de Venta Creado en AFIP"
            type="number"
            min={1}
            max={9999}
            value={pointOfSale.toString()}
            onChange={(e) => setPointOfSale(parseInt(e.target.value) || 1)}
            placeholder="Ej: 2"
          />

          {process.env.NODE_ENV !== 'production' && (
            <Select
              label="Entorno de Emisión"
              value={env}
              onChange={(e) => setEnv(e.target.value as any)}
            >
              <option value="produccion">Producción (Comprobantes Reales)</option>
              <option value="homologacion">Homologación (Pruebas AFIP)</option>
            </Select>
          )}
        </div>
      </div>

      <div className="pt-5 flex justify-between border-t border-border/50">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="text-sm px-5 py-2.5"
        >
          <ArrowLeft className="w-5 h-5 mr-1.5" /> Volver
        </Button>
        <Button
          type="button"
          onClick={onSave}
          disabled={saving || !certFileContent}
          className="text-sm px-6 py-2.5 font-bold"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Guardando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2" /> Activar Facturación ARCA
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
