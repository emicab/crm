'use client';

import React, { useState } from 'react';
import {
  X,
  Wand2,
  FileKey2,
  Download,
  ExternalLink,
  CheckCircle2,
  Building2,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Upload,
  FileCheck2,
  Server,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

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
        <div className="bg-muted/40 px-6 py-4 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-foreground">Asistente de Certificados ARCA / AFIP</h2>
              <p className="text-xs text-foreground-muted">Configurá la facturación electrónica oficial en 3 pasos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-foreground-muted hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="bg-muted/20 px-6 py-3 border-b border-border flex justify-between items-center text-xs">
          <div className={`flex items-center gap-2 font-semibold ${step >= 1 ? 'text-primary' : 'text-foreground-muted'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground-muted'}`}>1</span>
            <span>Generar Solicitud</span>
          </div>
          <div className="w-8 h-px bg-border" />
          <div className={`flex items-center gap-2 font-semibold ${step >= 2 ? 'text-primary' : 'text-foreground-muted'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground-muted'}`}>2</span>
            <span>Tramitar en AFIP</span>
          </div>
          <div className="w-8 h-px bg-border" />
          <div className={`flex items-center gap-2 font-semibold ${step >= 3 ? 'text-primary' : 'text-foreground-muted'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground-muted'}`}>3</span>
            <span>Subir Certificado</span>
          </div>
        </div>

        {/* Body Steps */}
        <div className="p-6">
          {/* PASO 1 */}
          {step === 1 && (
            <form onSubmit={handleGenerateCsr} className="space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-xs text-foreground leading-relaxed">
                <p className="font-bold text-primary mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Configuración Automática y Segura
                </p>
                ClinPOS preparará la solicitud de tu comercio y descargará el archivo listo a tu computadora. Luego te guiaremos paso a paso para activarlo en AFIP sin complicaciones.
              </div>

              <div className="space-y-3">
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

              <div className="pt-4 flex justify-end gap-3 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                      Preparando Solicitud...
                    </>
                  ) : (
                    <>
                      Crear Solicitud de Facturación
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* PASO 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-xs text-foreground flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-700 dark:text-emerald-300">¡Solicitud Creada con Éxito!</p>
                  <p className="mt-0.5 text-foreground-muted">
                    Se guardó el archivo <strong>{csrFilename}</strong> en tu carpeta de Descargas. ClinPOS dejó registrada la clave de tu comercio en este equipo.
                  </p>
                </div>
              </div>

              {csrPem && (
                <div className="flex justify-end">
                  <button
                    onClick={() => downloadFile(csrPem, csrFilename, 'application/x-pem-file')}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar {csrFilename} nuevamente
                  </button>
                </div>
              )}

              <div className="border border-border/80 rounded-xl p-4 bg-muted/30 space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FileKey2 className="w-4 h-4 text-primary" />
                  Pasos a realizar en AFIP (2 minutos):
                </h3>

                <ol className="text-xs text-foreground-muted space-y-2.5 list-decimal pl-4 leading-relaxed">
                  <li>
                    Ingresá al portal de AFIP con Clave Fiscal Nivel 3:{' '}
                    <a
                      href="https://auth.afip.gob.ar"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1 font-bold"
                    >
                      Abrir afip.gob.ar <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>
                    Buscá el servicio <strong>"Administración de Certificados Digitales"</strong> y hacé clic en <strong>"Agregar Alias"</strong>.
                  </li>
                  <li>
                    Nombre del Alias: <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-bold">ClinPOS</code>. En <strong>Archivo Solicitud</strong>, subí el archivo <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-bold">{csrFilename}</code> que descargaste recién.
                  </li>
                  <li>
                    Hacé clic en <strong>"Generar Alias"</strong> y luego en <strong>"Ver / Descargar"</strong> para guardar tu certificado (<code className="bg-muted px-1.5 py-0.5 rounded text-emerald-600 font-bold">.crt</code>).
                  </li>
                  <li>
                    <em>(Si aún no lo hiciste)</em> En <strong>"Administrador de Relaciones"</strong> delegá el servicio <strong>Facturación Electrónica</strong> al Alias ClinPOS.
                  </li>
                </ol>
              </div>

              <div className="pt-4 flex justify-between border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Volver
                </Button>
                <Button
                  type="button"
                  onClick={() => setStep(3)}
                >
                  Ya descargué el .crt de AFIP
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* PASO 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-muted/30 border border-border/80 rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Cargar Certificado Emitido por AFIP (.crt)
                </h3>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-2">
                    Seleccionar archivo .crt / .pem descargado de AFIP <span className="text-red-500">*</span>
                  </label>
                  <label className="border-2 border-dashed border-border hover:border-primary bg-background hover:bg-muted/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition text-center group">
                    <Upload className="w-8 h-8 text-foreground-muted group-hover:text-primary mb-2 transition" />
                    {certFileName ? (
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> {certFileName}
                      </span>
                    ) : (
                      <>
                        <span className="text-xs font-medium text-foreground">Hacé clic para buscar tu archivo .crt</span>
                        <span className="text-[11px] text-foreground-muted mt-1">Soporta archivos .crt, .pem o .txt</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept=".crt,.pem,.txt"
                      onChange={handleCertFileUpload}
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

                  <Select
                    label="Entorno de Emisión"
                    value={env}
                    onChange={(e) => setEnv(e.target.value as any)}
                  >
                    <option value="produccion">Producción (Comprobantes Reales)</option>
                    <option value="homologacion">Homologación (Pruebas AFIP)</option>
                  </Select>
                </div>
              </div>

              <div className="pt-4 flex justify-between border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Volver
                </Button>
                <Button
                  type="button"
                  onClick={handleFinalSave}
                  disabled={saving || !certFileContent}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> Activar Facturación ARCA
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
