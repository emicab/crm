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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden text-slate-100 my-8">
        
        {/* Header */}
        <div className="bg-slate-950 px-6 py-5 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-white">Asistente de Certificados ARCA / AFIP</h2>
              <p className="text-xs text-slate-400">Configurá la facturación electrónica oficial en 3 pasos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="bg-slate-900/50 px-6 py-3 border-b border-slate-800 flex justify-between items-center text-xs">
          <div className={`flex items-center gap-2 font-medium ${step >= 1 ? 'text-blue-400' : 'text-slate-500'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}>1</span>
            <span>Generar Solicitud</span>
          </div>
          <div className="w-8 h-px bg-slate-800" />
          <div className={`flex items-center gap-2 font-medium ${step >= 2 ? 'text-blue-400' : 'text-slate-500'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}>2</span>
            <span>Tramitar en AFIP</span>
          </div>
          <div className="w-8 h-px bg-slate-800" />
          <div className={`flex items-center gap-2 font-medium ${step >= 3 ? 'text-blue-400' : 'text-slate-500'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}>3</span>
            <span>Subir Certificado</span>
          </div>
        </div>

        {/* Body Steps */}
        <div className="p-6">
          {/* PASO 1 */}
          {step === 1 && (
            <form onSubmit={handleGenerateCsr} className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-xs text-blue-200 leading-relaxed">
                <p className="font-semibold text-blue-300 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-400" /> Generación Automática Criptográfica
                </p>
                ClinPOS creará tu <strong>Clave Privada (.key)</strong> y la guardará cifrada con AES-256 en tu equipo. Al mismo tiempo, te descargará el archivo de <strong>Solicitud (.csr)</strong> que presentarás en el sitio web de AFIP.
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  CUIT del Comercio <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="20123456789 (Sin guiones)"
                  value={cuit}
                  onChange={(e) => setCuit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nombre del Comercio o Razón Social (Opcional)
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Ej: Kiosco Pepe S.R.L."
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold flex items-center gap-2 transition disabled:opacity-50 shadow-lg shadow-blue-600/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generando Criptografía...
                    </>
                  ) : (
                    <>
                      Generar Solicitud (.csr)
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* PASO 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-xs text-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-300">¡Solicitud Generada con Éxito!</p>
                  <p className="mt-0.5">
                    Se descargó el archivo <strong>{csrFilename}</strong> a tus Descargas. La clave privada se vinculó de forma cifrada a tu instalación.
                  </p>
                </div>
              </div>

              {csrPem && (
                <div className="flex justify-end">
                  <button
                    onClick={() => downloadFile(csrPem, csrFilename, 'application/x-pem-file')}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium underline"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar {csrFilename} nuevamente
                  </button>
                </div>
              )}

              <div className="border border-slate-800 rounded-xl p-4 bg-slate-950 space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileKey2 className="w-4 h-4 text-blue-400" />
                  Pasos a realizar en AFIP (2 minutos):
                </h3>

                <ol className="text-xs text-slate-300 space-y-2.5 list-decimal pl-4 leading-relaxed">
                  <li>
                    Ingresá al portal de AFIP con Clave Fiscal Nivel 3:{' '}
                    <a
                      href="https://auth.afip.gob.ar"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      Abrir afip.gob.ar <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>
                    Buscá el servicio <strong>"Administración de Certificados Digitales"</strong> y hacé clic en <strong>"Agregar Alias"</strong>.
                  </li>
                  <li>
                    Nombre del Alias: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-300">ClinPOS</code>. En <strong>Archivo Solicitud</strong>, subí el archivo <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-300">{csrFilename}</code> que descargaste recién.
                  </li>
                  <li>
                    Hacé clic en <strong>"Generar Alias"</strong> y luego en <strong>"Ver / Descargar"</strong> para guardar tu certificado (<code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300">.crt</code>).
                  </li>
                  <li>
                    <em>(Si aún no lo hiciste)</em> En <strong>"Administrador de Relaciones"</strong> delegá el servicio <strong>Facturación Electrónica</strong> al Alias ClinPOS.
                  </li>
                </ol>
              </div>

              <div className="pt-3 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Volver
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold flex items-center gap-2 transition shadow-lg shadow-blue-600/20"
                >
                  Ya descargué el .crt de AFIP
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASO 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-400" />
                  Cargar Certificado Emitido por AFIP (.crt)
                </h3>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">
                    Seleccionar archivo .crt / .pem descargado de AFIP <span className="text-red-400">*</span>
                  </label>
                  <label className="border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-900/50 hover:bg-slate-900 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition text-center group">
                    <Upload className="w-8 h-8 text-slate-500 group-hover:text-blue-400 mb-2 transition" />
                    {certFileName ? (
                      <span className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> {certFileName}
                      </span>
                    ) : (
                      <>
                        <span className="text-xs font-medium text-slate-300">Hacé clic para buscar tu archivo .crt</span>
                        <span className="text-[11px] text-slate-500 mt-1">Soporta archivos .crt, .pem o .txt</span>
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
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Punto de Venta Creado en AFIP
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={9999}
                      value={pointOfSale}
                      onChange={(e) => setPointOfSale(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Punto de venta tipo Web Services creado en AFIP (ej: 2)</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
                      <Server className="w-3.5 h-3.5 text-blue-400" /> Entorno de Emisión
                    </label>
                    <select
                      value={env}
                      onChange={(e) => setEnv(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="produccion">Producción (Comprobantes Reales)</option>
                      <option value="homologacion">Homologación (Pruebas AFIP)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Volver
                </button>
                <button
                  type="button"
                  onClick={handleFinalSave}
                  disabled={saving || !certFileContent}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center gap-2 transition disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Activar Facturación ARCA
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
