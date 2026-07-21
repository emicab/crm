'use client';

import React, { useState } from 'react';
import { Database, Download, Upload, Cloud, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface ConfigBackupTabProps {
  form: Record<string, string>;
  handleChange: (key: string, value: string) => void;
  handleManualSync: () => void;
  isSyncing: boolean;
}

export default function ConfigBackupTab({
  form,
  handleChange,
  handleManualSync,
  isSyncing,
}: ConfigBackupTabProps) {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleExportBackup = async () => {
    setIsBackingUp(true);
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.backupDatabase) {
        const res = await (window as any).electronAPI.backupDatabase();
        if (res.success) {
          toast.success(`Copia de seguridad exportada en: ${res.path}`);
        } else if (!res.canceled) {
          toast.error(res.error || 'Error al exportar copia de seguridad.');
        }
      } else {
        toast.error('La exportación directa de BD sólo está disponible en la app de escritorio.');
      }
    } catch {
      toast.error('Error al realizar copia de seguridad.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleImportBackup = async () => {
    if (!confirm('⚠️ ALERTA: Importar una copia de seguridad reemplazará todos los datos actuales de la base de datos. ¿Deseás continuar?')) {
      return;
    }

    setIsRestoring(true);
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.restoreDatabase) {
        const res = await (window as any).electronAPI.restoreDatabase();
        if (res.success) {
          toast.success(res.message || 'Base de datos restaurada con éxito.');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else if (!res.canceled) {
          toast.error(res.error || 'Error al restaurar base de datos.');
        }
      } else {
        toast.error('La importación directa de BD sólo está disponible en la app de escritorio.');
      }
    } catch {
      toast.error('Error al restaurar copia de seguridad.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Respaldo en Computadora */}
      <section className="bg-muted p-6 rounded-xl shadow space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Database size={20} className="text-primary" /> Copia de Seguridad en la Computadora
        </h2>
        <p className="text-sm text-foreground-muted">
          Guardá un archivo de respaldo con todas tus ventas, clientes y productos para tener una copia protegida en tu equipo o pendrive.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 bg-background border border-border rounded-xl space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Download size={16} className="text-primary" /> Descargar Copia de Seguridad
            </h3>
            <p className="text-xs text-foreground-muted">
              Crea un archivo de respaldo seguro con toda la información de tu negocio.
            </p>
            <Button onClick={handleExportBackup} disabled={isBackingUp} variant="outline" className="w-full text-xs font-bold">
              {isBackingUp ? 'Guardando Copia...' : 'Descargar Copia de Seguridad'}
            </Button>
          </div>

          <div className="p-4 bg-background border border-border rounded-xl space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Upload size={16} className="text-amber-600" /> Recuperar Copia Guardada
            </h3>
            <p className="text-xs text-foreground-muted">
              Restaura la información de tu comercio desde un archivo de respaldo previamente guardado.
            </p>
            <Button onClick={handleImportBackup} disabled={isRestoring} variant="outline" className="w-full text-xs font-bold text-amber-600 border-amber-500/30 hover:bg-amber-500/10">
              {isRestoring ? 'Restaurando...' : 'Recuperar Copia Guardada'}
            </Button>
          </div>
        </div>
      </section>

      {/* Sincronización en la Nube */}
      <section className="bg-muted p-6 rounded-xl shadow space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Cloud size={20} className="text-primary" /> Respaldo Automático en la Nube
        </h2>
        <p className="text-sm text-foreground-muted">
          Guardá una copia de tus datos en internet para mantener tu información protegida ante cualquier inconveniente con tu computadora.
        </p>

        <div className="p-4 bg-background border border-border rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-foreground">Copia en la Nube</p>
              {form.supabase_last_sync ? (
                <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                  Último respaldo exitoso: {new Date(form.supabase_last_sync).toLocaleString('es-AR')}
                </p>
              ) : (
                <p className="text-xs text-foreground-muted mt-0.5">
                  No hay registros de respaldos previos en la nube.
                </p>
              )}
            </div>

            <Button onClick={handleManualSync} disabled={isSyncing || !form.supabase_url} className="shrink-0 font-bold text-xs">
              <RefreshCw size={14} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Guardando en la Nube...' : 'Guardar en la Nube Ahora'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
