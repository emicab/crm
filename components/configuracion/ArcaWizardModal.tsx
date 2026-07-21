'use client';

import React, { useState } from 'react';
import { X, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ArcaWizardStepper from './arca-wizard/ArcaWizardStepper';
import ArcaStep1Generate from './arca-wizard/ArcaStep1Generate';
import ArcaStep2AfipGuide from './arca-wizard/ArcaStep2AfipGuide';
import ArcaStep3UploadCert from './arca-wizard/ArcaStep3UploadCert';

interface ArcaWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCuit?: string;
  onSuccess: () => void;
}

export default function ArcaWizardModal({
  isOpen,
  onClose,
  initialCuit = '',
  onSuccess,
}: ArcaWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [cuit, setCuit] = useState(initialCuit);
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [csrPem, setCsrPem] = useState<string | null>(null);
  const [csrFilename, setCsrFilename] = useState<string>('solicitud_afip.csr');

  // Step 3 State
  const [certFileContent, setCertFileContent] = useState<string>('');
  const [certFileName, setCertFileName] = useState<string>('');
  const [pointOfSale, setPointOfSale] = useState<number>(2);
  const [env, setEnv] = useState<'homologacion' | 'produccion'>('produccion');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  // Paso 1: Generar la clave .key y el .csr
  const handleGenerateCsr = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCuit = cuit.replace(/\D/g, '');

    if (cleanCuit.length !== 11) {
      toast.error('Por favor ingresá un CUIT válido de 11 dígitos.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/arca/generate-csr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuit: cleanCuit, businessName }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al generar la solicitud.');
      }

      setCsrPem(data.csrPem);
      setCsrFilename(data.filename);

      // Trigger automatic file download of .csr
      downloadFile(data.csrPem, data.filename, 'application/x-pem-file');

      toast.success('¡Clave privada guardada encriptada y solicitud .csr descargada!');
      setStep(2);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error al generar el certificado.');
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Manejar lectura del archivo .crt en el Paso 3
  const handleCertFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCertFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCertFileContent(text);
      toast.success(`Certificado ${file.name} cargado correctamente.`);
    };
    reader.readAsText(file);
  };

  // Paso 3: Guardar configuración final de ARCA
  const handleFinalSave = async () => {
    if (!certFileContent) {
      toast.error('Por favor subí el archivo del certificado (.crt) que descargaste de AFIP.');
      return;
    }

    setSaving(true);
    try {
      const cleanCuit = cuit.replace(/\D/g, '');

      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arcaEnabled: true,
          arcaCuit: cleanCuit,
          arcaPointOfSale: pointOfSale.toString(),
          arcaEnv: env,
          arcaCert: certFileContent,
        }),
      });

      if (!res.ok) {
        throw new Error('Error al guardar la configuración de ARCA.');
      }

      toast.success('¡Facturación ARCA configurada y lista para emitir comprobantes!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-background border border-border rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden text-foreground my-8">
        
        {/* Header */}
        <div className="bg-muted/40 px-6 py-5 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
              <Wand2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg sm:text-xl text-foreground">Asistente de Certificados ARCA / AFIP</h2>
              <p className="text-sm text-foreground-muted">Configurá la facturación electrónica oficial en 3 pasos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-foreground-muted hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Stepper Bar */}
        <ArcaWizardStepper step={step} />

        {/* Body Steps */}
        <div className="p-6 sm:p-8">
          {step === 1 && (
            <ArcaStep1Generate
              cuit={cuit}
              setCuit={setCuit}
              businessName={businessName}
              setBusinessName={setBusinessName}
              loading={loading}
              onGenerate={handleGenerateCsr}
              onClose={onClose}
            />
          )}

          {step === 2 && (
            <ArcaStep2AfipGuide
              csrFilename={csrFilename}
              csrPem={csrPem}
              onDownloadAgain={downloadFile}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <ArcaStep3UploadCert
              certFileName={certFileName}
              certFileContent={certFileContent}
              pointOfSale={pointOfSale}
              setPointOfSale={setPointOfSale}
              env={env}
              setEnv={setEnv}
              saving={saving}
              onFileUpload={handleCertFileUpload}
              onBack={() => setStep(2)}
              onSave={handleFinalSave}
            />
          )}
        </div>

      </div>
    </div>
  );
}
