'use client';

import React from 'react';
import { CheckCircle2, Download, FileKey2, ExternalLink, ArrowLeft, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';

interface ArcaStep2AfipGuideProps {
  csrFilename: string;
  csrPem: string | null;
  onDownloadAgain: (content: string, filename: string, type: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function ArcaStep2AfipGuide({
  csrFilename,
  csrPem,
  onDownloadAgain,
  onBack,
  onNext,
}: ArcaStep2AfipGuideProps) {
  return (
    <div className="space-y-5">
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 text-sm text-foreground flex items-start gap-3.5">
        <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-base text-emerald-700 dark:text-emerald-300">¡Solicitud Creada con Éxito!</p>
          <p className="mt-1 text-sm text-foreground-muted leading-relaxed">
            Se guardó el archivo <strong>{csrFilename}</strong> en tu carpeta de Descargas. ClinPOS dejó registrada la clave de tu comercio en este equipo.
          </p>
        </div>
      </div>

      {csrPem && (
        <div className="flex justify-end">
          <button
            onClick={() => onDownloadAgain(csrPem, csrFilename, 'application/x-pem-file')}
            className="text-sm text-primary hover:underline flex items-center gap-1.5 font-bold cursor-pointer"
          >
            <Download className="w-4 h-4" /> Descargar {csrFilename} nuevamente
          </button>
        </div>
      )}

      <div className="border border-border/80 rounded-xl p-5 bg-muted/30 space-y-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <FileKey2 className="w-5 h-5 text-primary" />
          Pasos a realizar en AFIP (2 minutos):
        </h3>

        <ol className="text-sm text-foreground-muted space-y-3 list-decimal pl-5 leading-relaxed">
          <li>
            Ingresá al portal de AFIP con Clave Fiscal Nivel 3:{' '}
            <a
              href="https://auth.afip.gob.ar"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1 font-bold ml-1"
            >
              Abrir afip.gob.ar <ExternalLink className="w-4 h-4" />
            </a>
          </li>
          <li>
            Buscá el servicio <strong>"Administración de Certificados Digitales"</strong> y hacé clic en <strong>"Agregar Alias"</strong>.
          </li>
          <li>
            Nombre del Alias: <code className="bg-muted px-2 py-0.5 rounded text-primary font-bold">ClinPOS</code>. En <strong>Archivo Solicitud</strong>, subí el archivo <code className="bg-muted px-2 py-0.5 rounded text-primary font-bold">{csrFilename}</code> que descargaste recién.
          </li>
          <li>
            Hacé clic en <strong>"Generar Alias"</strong> y luego en <strong>"Ver / Descargar"</strong> para guardar tu certificado (<code className="bg-muted px-2 py-0.5 rounded text-emerald-600 font-bold">.crt</code>).
          </li>
          <li>
            <em>(Si aún no lo hiciste)</em> En <strong>"Administrador de Relaciones"</strong> delegá el servicio <strong>Facturación Electrónica</strong> al Alias ClinPOS.
          </li>
        </ol>
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
          onClick={onNext}
          className="text-sm px-6 py-2.5 font-bold"
        >
          Ya descargué el .crt de AFIP
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
