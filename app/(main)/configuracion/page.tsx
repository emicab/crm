"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Save, Building, Receipt, Percent, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import toast from 'react-hot-toast';
import { PaymentTypeEnum } from '@/types';
import { getPaymentTypeDisplay } from '@/lib/displayTexts';

export default function ConfiguracionPage() {
  const [form, setForm] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setForm(data))
      .catch(() => toast.error('Error al cargar configuración.'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Error al guardar');
      toast.success('Configuración guardada correctamente.');
    } catch {
      toast.error('Error al guardar configuración.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Estado de actualizaciones ---
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [updatePercent, setUpdatePercent] = useState(0);
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const version = '1.1.3';

  useEffect(() => {
    if (typeof window !== 'undefined' && window.updateAPI) {
      const unsubscribe = window.updateAPI.onStatus((status: any) => {
        setUpdateStatus(status.status);
        if (status.percent) setUpdatePercent(status.percent);
        if (status.version) setUpdateVersion(status.version);
        if (status.error) setUpdateError(status.error);
        if (status.status === 'checking') { setUpdateError(null); setUpdatePercent(0); }
      });
      return unsubscribe;
    }
  }, []);

  const handleCheckUpdates = useCallback(async () => {
    setUpdateStatus('checking');
    setUpdateError(null);
    setUpdatePercent(0);
    if (typeof window !== 'undefined' && window.updateAPI) {
      await window.updateAPI.check();
    } else {
      setUpdateStatus('dev-mode');
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-foreground-muted">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Configuración</h1>
        <p className="mt-1 text-foreground-muted">Ajusta los parámetros generales del sistema.</p>
      </div>

      <section className="bg-muted p-6 rounded-xl shadow space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Building size={20} className="text-primary" /> Datos del Negocio
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nombre del Negocio" value={form.businessName || ''} onChange={(e) => handleChange('businessName', e.target.value)} placeholder="Mi Negocio" />
          <Input label="CUIT" value={form.businessCuit || ''} onChange={(e) => handleChange('businessCuit', e.target.value)} placeholder="30-12345678-9" />
          <Input label="Dirección" value={form.businessAddress || ''} onChange={(e) => handleChange('businessAddress', e.target.value)} placeholder="Av. Siempre Viva 123" />
          <Input label="Teléfono" value={form.businessPhone || ''} onChange={(e) => handleChange('businessPhone', e.target.value)} placeholder="+54 11 1234-5678" />
        </div>
      </section>

      <section className="bg-muted p-6 rounded-xl shadow space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Percent size={20} className="text-primary" /> Impuestos y Pagos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="IVA (%)" type="number" step="0.01" min="0" max="100" value={form.taxRate || '0'} onChange={(e) => handleChange('taxRate', e.target.value)} />
          <Select label="Método de Pago por Defecto" value={form.defaultPaymentType || 'CASH'} onChange={(e) => handleChange('defaultPaymentType', e.target.value)}>
            {Object.values(PaymentTypeEnum).map((type) => (
              <option key={type} value={type}>{getPaymentTypeDisplay(type)}</option>
            ))}
          </Select>
        </div>
      </section>

      <section className="bg-muted p-6 rounded-xl shadow space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Percent size={20} className="text-primary" /> Descuentos por Método de Pago
        </h2>
        <p className="text-sm text-foreground-muted">Descuento aplicado automáticamente al seleccionar el método de pago en la venta.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(PaymentTypeEnum).map((type) => (
            <Input key={type} label={`${getPaymentTypeDisplay(type)} (%)`} type="number" step="0.01" min="0" max="100" value={form[`discount_${type}`] || '0'} onChange={(e) => handleChange(`discount_${type}`, e.target.value)} />
          ))}
        </div>
      </section>

      <section className="bg-muted p-6 rounded-xl shadow space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Receipt size={20} className="text-primary" /> Comprobantes
        </h2>
        <div className="space-y-4">
          <Input label="Texto al Pie del Comprobante" value={form.receiptFooter || ''} onChange={(e) => handleChange('receiptFooter', e.target.value)} placeholder="Gracias por su compra" />
          <Input label="Número de Próximo Comprobante" type="number" min="1" value={form.nextReceiptNumber || '1'} onChange={(e) => handleChange('nextReceiptNumber', e.target.value)} />
        </div>
      </section>

      <section className="bg-muted p-6 rounded-xl shadow space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <RefreshCw size={20} className="text-primary" /> Actualizaciones
        </h2>
        <p className="text-sm text-foreground-muted">Versión actual: <strong>{version}</strong></p>
        <div className="flex items-center gap-4">
          <Button onClick={handleCheckUpdates} disabled={updateStatus === 'checking' || updateStatus === 'downloading'}>
            <RefreshCw size={16} className={`mr-2 ${updateStatus === 'checking' ? 'animate-spin' : ''}`} />
            {updateStatus === 'checking' ? 'Buscando...' : updateStatus === 'downloading' ? 'Descargando...' : 'Buscar actualizaciones'}
          </Button>
          {updateStatus === 'up-to-date' && <span className="text-sm text-success">✓ Estás al día</span>}
          {updateStatus === 'available' && <span className="text-sm text-primary">Nueva versión {updateVersion} disponible — descargando...</span>}
          {updateStatus === 'downloaded' && <span className="text-sm text-success">✓ Versión {updateVersion} descargada. Reiniciá para instalar.</span>}
          {updateStatus === 'dev-mode' && <span className="text-sm text-foreground-muted">Modo desarrollo — sin actualizador</span>}
          {updateError && <span className="text-sm text-destructive">Error: {updateError}</span>}
        </div>
        {updateStatus === 'downloading' && (
          <div className="w-full bg-background rounded-full h-2 overflow-hidden">
            <div className="bg-primary h-full transition-all duration-300" style={{ width: `${updatePercent}%` }} />
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
