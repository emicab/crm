'use client';

import React, { useState } from 'react';
import { LayoutDashboard, CheckCircle2, ShieldCheck, Key, Lock, ArrowRight, ExternalLink } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';

import { useModules } from '@/hooks/useModules';

interface ConfigRubroPlanTabProps {
  form: Record<string, string>;
  handleChange: (key: string, value: string) => void;
  handleSave: () => void;
  isSaving: boolean;
  profilePresets: Record<string, { name: string; desc: string; modules: Record<string, boolean> }>;
}

export default function ConfigRubroPlanTab({
  form,
  handleChange,
  handleSave,
  isSaving,
  profilePresets,
}: ConfigRubroPlanTabProps) {
  const { refresh: refreshModules } = useModules();
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [activatingLicense, setActivatingLicense] = useState(false);

  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKeyInput.trim()) {
      toast.error('Por favor ingresá una clave de licencia.');
      return;
    }

    setActivatingLicense(true);
    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: licenseKeyInput.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || '¡Licencia activada con éxito!');
        const activePlan = data.plan || data.plan_type || 'pro';
        handleChange('license_key', licenseKeyInput.trim());
        handleChange('plan_type', activePlan);
        handleChange('app_plan', activePlan);
        handleChange('unlocked_plan_pro', activePlan === 'pro' ? 'true' : 'false');
        handleChange('storage_mode', activePlan === 'pro' ? 'seguro' : 'local');
        setLicenseKeyInput('');
        await handleSave();
        await refreshModules();
      } else {
        toast.error(data.message || 'La clave de licencia no es válida.');
      }
    } catch {
      toast.error('Error al conectar con el servidor de licencias.');
    } finally {
      setActivatingLicense(false);
    }
  };

  const currentProfileKey = form.business_profile || 'general';
  const currentPlan = form.plan_type || form.app_plan || (form.unlocked_plan_pro === 'true' ? 'pro' : 'basico');

  return (
    <div className="space-y-8">
      {/* SECCIÓN 1: Selección de Rubro */}
      <section className="bg-muted p-6 rounded-xl shadow space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <LayoutDashboard size={20} className="text-primary" /> Paso 1: Rubro de tu Comercio
          </h2>
          <p className="text-xs text-foreground-muted mt-1">
            Elegí el rubro que mejor represente tu negocio. ClinPOS activará automáticamente las herramientas diseñadas para tu día a día.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {Object.entries(profilePresets).map(([key, preset]) => {
            const isSelected = currentProfileKey === key;
            return (
              <div
                key={key}
                onClick={() => {
                  handleChange('business_profile', key);
                  // Aplicar módulos por defecto del rubro
                  Object.entries(preset.modules).forEach(([modKey, modVal]) => {
                    handleChange(`module_${modKey}`, modVal ? 'true' : 'false');
                  });
                  toast.success(`Rubro cambiado a: ${preset.name}`);
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/40 shadow-sm'
                    : 'border-border bg-background hover:border-foreground-muted'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-foreground">{preset.name}</h3>
                    {isSelected && <CheckCircle2 size={16} className="text-primary" />}
                  </div>
                  <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                    {preset.desc}
                  </p>
                </div>

                <div className="text-[11px] font-semibold text-primary pt-1 border-t border-border/40">
                  {isSelected ? '✓ Rubro Activo' : 'Seleccionar Rubro →'}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECCIÓN 2: Plan de Suscripción */}
      <section className="bg-muted p-6 rounded-xl shadow space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck size={20} className="text-primary" /> Paso 2: Plan de Suscripción ClinPOS
          </h2>
          <p className="text-xs text-foreground-muted mt-1">
            Compará y seleccioná la modalidad de servicio adecuada para tu negocio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Tarjeta Plan Básico */}
          <div className={`p-6 rounded-2xl border flex flex-col justify-between space-y-6 ${
            currentPlan === 'basico' ? 'border-primary bg-background shadow-md ring-1 ring-primary' : 'border-border bg-background/60'
          }`}>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-extrabold uppercase tracking-wider text-foreground-muted bg-muted px-2.5 py-1 rounded-lg">
                  Plan Básico
                </span>
                {currentPlan === 'basico' && (
                  <span className="text-xs font-bold text-primary flex items-center gap-1">
                    <CheckCircle2 size={14} /> Plan Actual
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-foreground">Básico & Facturación ARCA</h3>
              <p className="text-xs text-foreground-muted">
                Ideal para comercios que buscan control total de caja, productos e inventario local y facturación AFIP sin ataduras.
              </p>

              <div className="pt-2">
                <span className="text-2xl font-black text-foreground">$9.900</span>
                <span className="text-xs text-foreground-muted"> ARS / mes</span>
                <p className="text-[11px] text-primary font-semibold mt-0.5">O opción de Pago Único de $40.000 ARS</p>
              </div>

              <ul className="text-xs space-y-2 text-foreground-muted pt-3 border-t border-border/60">
                <li className="flex items-center gap-2 text-foreground font-medium">✓ Ventas y Caja Diaria</li>
                <li className="flex items-center gap-2 text-foreground font-medium">✓ Productos, Stock y Alertas</li>
                <li className="flex items-center gap-2 text-foreground font-medium">✓ Facturación Electrónica ARCA (AFIP)</li>
                <li className="flex items-center gap-2 text-foreground font-medium">✓ Gastos y Proveedores</li>
                <li className="flex items-center gap-2 text-foreground font-medium">✓ Venta Fraccionada y Combos</li>
              </ul>
            </div>

            <div className="pt-4">
              <a
                href="https://mpago.la/1V3hSPq"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl border border-border transition"
              >
                Suscribirme al Plan Básico <ExternalLink size={14} />
              </a>
            </div>
          </div>

          {/* Tarjeta Plan Pro ⭐ */}
          <div className={`p-6 rounded-2xl border flex flex-col justify-between space-y-6 relative overflow-hidden ${
            currentPlan === 'pro' ? 'border-amber-500 bg-background shadow-lg ring-2 ring-amber-500/30' : 'border-amber-400/60 bg-amber-500/5'
          }`}>
            <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-widest shadow-xs">
              Recomendado ⭐
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-wider text-amber-600 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-2.5 py-1 rounded-lg">
                  Plan Pro Nube
                </span>
                {currentPlan === 'pro' && (
                  <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Plan Activo
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-foreground">Pro & Respaldo en la Nube</h3>
              <p className="text-xs text-foreground-muted">
                Para negocios que necesitan cobro a crédito/fiado, analíticas financieras profundas y sincronización automática.
              </p>

              <div className="pt-2">
                <span className="text-2xl font-black text-foreground">$30.000</span>
                <span className="text-xs text-foreground-muted"> ARS / mes</span>
                <p className="text-[11px] text-amber-600 font-bold mt-0.5">Acceso completo a todos los módulos Pro</p>
              </div>

              <ul className="text-xs space-y-2 text-foreground-muted pt-3 border-t border-border/60">
                <li className="flex items-center gap-2 text-foreground font-semibold">✓ Todo lo del Plan Básico</li>
                <li className="flex items-center gap-2 text-foreground font-bold text-amber-600">⭐ Cuenta Corriente / Fiado</li>
                <li className="flex items-center gap-2 text-foreground font-bold text-amber-600">⭐ Respaldo Automático en Nube</li>
                <li className="flex items-center gap-2 text-foreground font-bold text-amber-600">⭐ Analíticas Avanzadas</li>
                <li className="flex items-center gap-2 text-foreground font-bold text-amber-600">⭐ Roles y Permisos por PIN</li>
              </ul>
            </div>

            <div className="pt-4">
              <a
                href="https://mpago.la/1BG9zyU"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition"
              >
                Obtener Plan Pro <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>

        {/* Formulario de Activación de Licencia */}
        <div className="mt-6 p-5 bg-background border border-border rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <Key size={18} className="text-primary" />
            <h3 className="text-sm font-bold text-foreground">Activar Clave de Licencia</h3>
          </div>
          <p className="text-xs text-foreground-muted">
            Si ya contrataste o compraste tu licencia, ingresá tu clave a continuación para activar tu plan correspondiente.
          </p>

          <form onSubmit={handleActivateLicense} className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="flex-1">
              <Input
                placeholder="Ej: CRM-PRO-ABCD-1234-EF56"
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={activatingLicense} className="shrink-0 font-bold">
              {activatingLicense ? 'Verificando...' : 'Activar Licencia'}
            </Button>
          </form>
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Guardando...' : 'Guardar Cambios de Rubro'}
        </Button>
      </div>
    </div>
  );
}
