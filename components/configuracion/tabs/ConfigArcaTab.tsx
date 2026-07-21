'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Wand2,
  FileText,
  CheckCircle2,
  Upload,
  EyeOff,
  Eye,
  Lock,
  RefreshCw,
  Save,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import ArcaWizardModal from '@/components/configuracion/ArcaWizardModal';
import toast from 'react-hot-toast';

interface ConfigArcaTabProps {
  form: Record<string, string>;
  handleChange: (key: string, value: string) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, field: 'arcaCert' | 'arcaKey') => void;
  handleSave: () => void;
  isSaving: boolean;
  onRefreshConfig: () => void;
}

export default function ConfigArcaTab({
  form,
  handleChange,
  handleFileUpload,
  handleSave,
  isSaving,
  onRefreshConfig,
}: ConfigArcaTabProps) {
  const [showArcaWizard, setShowArcaWizard] = useState(false);
  const [showCertText, setShowCertText] = useState(false);
  const [showKeyText, setShowKeyText] = useState(false);
  const [testingArca, setTestingArca] = useState(false);
  const [arcaStatusResult, setArcaStatusResult] = useState<string | null>(null);

  const handleTestArca = async () => {
    setTestingArca(true);
    setArcaStatusResult(null);
    try {
      const saveRes = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!saveRes.ok) throw new Error('Error al guardar configuración temporal');

      const res = await fetch('/api/arca/status');
      const data = await res.json();
      if (data.status === 'online') {
        toast.success('Conexión con ARCA establecida con éxito.');
        setArcaStatusResult(
          `Online - Servidor AFIP Operativo (App: ${data.serverStatus?.AppServer || 'OK'}, Db: ${data.serverStatus?.DbServer || 'OK'}, Auth: ${data.serverStatus?.AuthServer || 'OK'})`
        );
      } else {
        toast.error(data.message || 'Error en la conexión.');
        setArcaStatusResult(`Offline: ${data.message || 'Error desconocido'}`);
      }
    } catch (e: any) {
      toast.error('Error al probar conexión.');
      setArcaStatusResult(`Error: ${e.message}`);
    } finally {
      setTestingArca(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="bg-muted p-6 rounded-xl shadow space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck size={20} className="text-primary" /> Facturación Electrónica (ARCA / AFIP)
        </h2>
        <p className="text-sm text-foreground-muted">
          Configurá la emisión de facturas electrónicas con el Web Service de ARCA.
        </p>

        {/* Banner Asistente Guiado */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-primary/20 text-primary rounded-lg shrink-0">
              <Wand2 size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">¿Querés activar la Facturación Electrónica sin complicaciones?</h3>
              <p className="text-xs text-foreground-muted mt-0.5">
                Usá nuestro <strong>Asistente Guiado</strong> para habilitar las facturas de AFIP/ARCA paso a paso sin necesidad de conocimientos técnicos.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => setShowArcaWizard(true)}
            className="shrink-0 flex items-center justify-center gap-2 cursor-pointer shadow-md font-bold"
          >
            <Wand2 size={16} /> Abrir Asistente ARCA
          </Button>
        </div>

        <ArcaWizardModal
          isOpen={showArcaWizard}
          onClose={() => setShowArcaWizard(false)}
          initialCuit={form.arcaCuit || form.businessCuit || ''}
          onSuccess={onRefreshConfig}
        />

        <div className="flex items-center gap-2 py-2">
          <input
            id="arcaEnabled"
            type="checkbox"
            checked={form.arcaEnabled === 'true'}
            onChange={(e) => handleChange('arcaEnabled', e.target.checked ? 'true' : 'false')}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary bg-background"
          />
          <label htmlFor="arcaEnabled" className="text-sm font-medium text-foreground select-none cursor-pointer">
            Habilitar Facturación Electrónica
          </label>
        </div>

        {form.arcaEnabled === 'true' && (
          <div className="space-y-4 pt-2 border-t border-border/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="CUIT Emisor"
                value={form.arcaCuit || ''}
                onChange={(e) => handleChange('arcaCuit', e.target.value)}
                placeholder="30123456789 (sin guiones)"
              />
              <Input
                label="Punto de Venta"
                type="number"
                value={form.arcaPointOfSale || '1'}
                onChange={(e) => handleChange('arcaPointOfSale', e.target.value)}
                placeholder="1"
              />

              <Select
                label="Entorno"
                value={form.arcaEnv || 'homologacion'}
                onChange={(e) => handleChange('arcaEnv', e.target.value)}
              >
                <option value="homologacion">Homologación (Pruebas)</option>
                <option value="produccion">Producción (Real)</option>
              </Select>

              <Select
                label="Condición frente al IVA"
                value={form.arcaIvaCondition || 'RI'}
                onChange={(e) => handleChange('arcaIvaCondition', e.target.value)}
              >
                <option value="RI">Responsable Inscripto</option>
                <option value="MT">Monotributista</option>
                <option value="EX">Exento</option>
              </Select>

              <Input
                label="Ingresos Brutos (IIBB)"
                value={form.arcaIibb || ''}
                onChange={(e) => handleChange('arcaIibb', e.target.value)}
                placeholder="901-123456-7"
              />
              <Input
                label="Inicio de Actividades (AAAA-MM-DD)"
                value={form.arcaBusinessStartDate || ''}
                onChange={(e) => handleChange('arcaBusinessStartDate', e.target.value)}
                placeholder="2020-01-01"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 pt-2">
              {/* CERTIFICADO DIGITAL */}
              <div className="flex flex-col gap-2 p-4 bg-background border border-border/80 rounded-xl shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                      <FileText size={18} />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Certificado Digital ARCA (.crt / .pem)
                      </label>
                      {form.arcaCert ? (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-0.5">
                          <CheckCircle2 size={13} /> Certificado cargado y resguardado
                        </span>
                      ) : (
                        <span className="text-[11px] text-foreground-muted block mt-0.5">
                          No se ha subido ningún certificado digital.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg transition-colors">
                      <Upload size={14} />
                      {form.arcaCert ? 'Reemplazar (.crt)' : 'Subir Archivo (.crt/.pem)'}
                      <input
                        type="file"
                        accept=".crt,.pem,.txt"
                        onChange={(e) => handleFileUpload(e, 'arcaCert')}
                        className="hidden"
                      />
                    </label>
                    {form.arcaCert && (
                      <button
                        type="button"
                        onClick={() => setShowCertText(!showCertText)}
                        className="p-1.5 text-foreground-muted hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                        title={showCertText ? 'Ocultar contenido' : 'Ver / Editar texto'}
                      >
                        {showCertText ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    )}
                  </div>
                </div>

                {form.arcaCert && !showCertText && (
                  <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-lg border border-border/40 text-xs font-mono text-foreground-muted mt-1">
                    <span className="truncate max-w-[280px] sm:max-w-md">•••••••••••••••••••••••••••••••••••••••••••• (Certificado Protegido)</span>
                    <button
                      type="button"
                      onClick={() => handleChange('arcaCert', '')}
                      className="text-destructive hover:underline text-[11px] font-sans font-semibold cursor-pointer shrink-0 ml-2"
                    >
                      Eliminar
                    </button>
                  </div>
                )}

                {(showCertText || !form.arcaCert) && (
                  <textarea
                    rows={3}
                    value={form.arcaCert || ''}
                    onChange={(e) => handleChange('arcaCert', e.target.value)}
                    placeholder="-----BEGIN CERTIFICATE-----\nMIIFzDCCBLSgAwIBAgIQ..."
                    className="w-full text-xs font-mono p-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring placeholder:text-foreground-muted/50 mt-1"
                  />
                )}
              </div>

              {/* CLAVE PRIVADA */}
              <div className="flex flex-col gap-2 p-4 bg-background border border-border/80 rounded-xl shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg shrink-0">
                      <Lock size={18} />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Clave Privada ARCA (.key)
                      </label>
                      {form.arcaKey ? (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-0.5">
                          <CheckCircle2 size={13} /> Clave privada cargada y resguardada
                        </span>
                      ) : (
                        <span className="text-[11px] text-foreground-muted block mt-0.5">
                          No se ha subido la clave privada aún.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 text-xs font-bold rounded-lg transition-colors">
                      <Upload size={14} />
                      {form.arcaKey ? 'Reemplazar (.key)' : 'Subir Archivo (.key)'}
                      <input
                        type="file"
                        accept=".key,.pem,.txt"
                        onChange={(e) => handleFileUpload(e, 'arcaKey')}
                        className="hidden"
                      />
                    </label>
                    {form.arcaKey && (
                      <button
                        type="button"
                        onClick={() => setShowKeyText(!showKeyText)}
                        className="p-1.5 text-foreground-muted hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                        title={showKeyText ? 'Ocultar clave' : 'Ver / Editar texto'}
                      >
                        {showKeyText ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    )}
                  </div>
                </div>

                {form.arcaKey && !showKeyText && (
                  <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-lg border border-border/40 text-xs font-mono text-foreground-muted mt-1">
                    <span className="truncate max-w-[280px] sm:max-w-md">•••••••••••••••••••••••••••••••••••••••••••• (Clave Privada Protegida por Seguridad)</span>
                    <button
                      type="button"
                      onClick={() => handleChange('arcaKey', '')}
                      className="text-destructive hover:underline text-[11px] font-sans font-semibold cursor-pointer shrink-0 ml-2"
                    >
                      Eliminar
                    </button>
                  </div>
                )}

                {(showKeyText || !form.arcaKey) && (
                  <textarea
                    rows={3}
                    value={form.arcaKey || ''}
                    onChange={(e) => handleChange('arcaKey', e.target.value)}
                    placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC..."
                    className="w-full text-xs font-mono p-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring placeholder:text-foreground-muted/50 mt-1"
                  />
                )}
              </div>
            </div>

            {/* Test de Conexión AFIP */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestArca}
                disabled={testingArca || !form.arcaCuit}
              >
                <RefreshCw size={14} className={`mr-2 ${testingArca ? 'animate-spin' : ''}`} />
                {testingArca ? 'Probando Servidores AFIP...' : 'Probar Conexión ARCA'}
              </Button>

              {arcaStatusResult && (
                <span
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg ${
                    arcaStatusResult.startsWith('Online')
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : 'bg-destructive/10 text-destructive border border-destructive/20'
                  }`}
                >
                  {arcaStatusResult}
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save size={16} className="mr-2" /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </div>
  );
}
