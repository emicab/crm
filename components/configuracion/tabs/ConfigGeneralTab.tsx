'use client';

import React from 'react';
import { Building, Percent, CreditCard, Save, Mail } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PaymentTypeEnum } from '@/types';
import { getPaymentTypeDisplay } from '@/lib/displayTexts';

interface ConfigGeneralTabProps {
  form: Record<string, string>;
  handleChange: (key: string, value: string) => void;
  handleSave: () => void;
  isSaving: boolean;
}

export default function ConfigGeneralTab({
  form,
  handleChange,
  handleSave,
  isSaving,
}: ConfigGeneralTabProps) {
  return (
    <div className="space-y-8">
      {/* Datos de la empresa */}
      <section className="bg-muted p-6 rounded-xl shadow space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Building size={20} className="text-primary" /> Datos del Comercio
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nombre o Razón Social"
            value={form.businessName || ''}
            onChange={(e) => handleChange('businessName', e.target.value)}
            placeholder="Mi Comercio S.R.L."
          />
          <Input
            label="CUIT"
            value={form.businessCuit || ''}
            onChange={(e) => handleChange('businessCuit', e.target.value)}
            placeholder="20-12345678-9"
          />
          <Input
            label="Dirección"
            value={form.businessAddress || ''}
            onChange={(e) => handleChange('businessAddress', e.target.value)}
            placeholder="Av. Corrientes 1234, CABA"
          />
          <Input
            label="Teléfono"
            value={form.businessPhone || ''}
            onChange={(e) => handleChange('businessPhone', e.target.value)}
            placeholder="+54 11 1234-5678"
          />
        </div>
      </section>

      {/* Reportes por Email */}
      <section className="bg-muted p-6 rounded-xl shadow space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Mail size={20} className="text-primary" /> Reportes por Correo
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Email Receptor de Reportes Diarios"
            type="email"
            value={form.dailyReportEmail || ''}
            onChange={(e) => handleChange('dailyReportEmail', e.target.value)}
            placeholder="dueño@miempresa.com"
          />
        </div>
      </section>

      {/* Inteligencia Artificial (Gemini) */}
      <section className="bg-muted p-6 rounded-xl shadow space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M12 3v18" />
            <path d="m3 12 18 0" />
            <path d="M7 7l10 10" />
            <path d="M17 7 7 17" />
          </svg>
          Inteligencia Artificial (Reportes Inteligentes)
        </h2>
        <div className="grid grid-cols-1 gap-4">
          <Input
            label="API Key de Google Gemini"
            type="password"
            value={form.geminiApiKey || ''}
            onChange={(e) => handleChange('geminiApiKey', e.target.value)}
            placeholder="AIzaSyA..."
          />
          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 space-y-2 mt-2">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
              ¿Cómo obtener tu clave gratuita?
            </p>
            <ol className="list-decimal list-inside text-xs text-blue-800 dark:text-blue-400 space-y-1">
              <li>Ingresá a <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="font-bold underline">Google AI Studio</a> e iniciá sesión con tu cuenta de Google.</li>
              <li>Hacé clic en el botón azul <strong>"Create API key"</strong> (Crear clave de API).</li>
              <li>Copiá el código largo generado (empieza con AIza...).</li>
              <li>Pegalo en el casillero de arriba y dale a "Guardar Configuración".</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Tasa e imprimibles */}
      <section className="bg-muted p-6 rounded-xl shadow space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Percent size={20} className="text-primary" /> Impuestos y Tickets
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Tasa de IVA general (%)"
            type="number"
            value={form.taxRate || '21'}
            onChange={(e) => handleChange('taxRate', e.target.value)}
            placeholder="21"
          />
          <Select
            label="Medio de Pago por Defecto en Caja"
            value={form.defaultPaymentType || 'CASH'}
            onChange={(e) => handleChange('defaultPaymentType', e.target.value)}
          >
            {Object.values(PaymentTypeEnum).map((pt) => (
              <option key={pt} value={pt}>
                {getPaymentTypeDisplay(pt)}
              </option>
            ))}
          </Select>
          <div className="md:col-span-2">
            <Input
              label="Pie de página del Ticket"
              value={form.receiptFooter || ''}
              onChange={(e) => handleChange('receiptFooter', e.target.value)}
              placeholder="¡Gracias por su compra! Vuelva pronto."
            />
          </div>
        </div>
      </section>

      {/* Descuentos y Recargos */}
      <section className="bg-muted p-6 rounded-xl shadow space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CreditCard size={20} className="text-primary" /> Descuentos o Recargos por Método de Pago
        </h2>
        <p className="text-xs text-foreground-muted">
          Usá números positivos para descuentos (ej. 10 = 10% off) y negativos para recargos (ej. -10 = 10% recargo).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <Input
            label="Efectivo (% desc/rec)"
            type="number"
            step="0.1"
            value={form.discount_CASH || '0'}
            onChange={(e) => handleChange('discount_CASH', e.target.value)}
          />
          <Input
            label="Transferencia (% desc/rec)"
            type="number"
            step="0.1"
            value={form.discount_TRANSFER || '10'}
            onChange={(e) => handleChange('discount_TRANSFER', e.target.value)}
          />
          <Input
            label="Tarjeta (% desc/rec)"
            type="number"
            step="0.1"
            value={form.discount_CARD || '0'}
            onChange={(e) => handleChange('discount_CARD', e.target.value)}
          />
          <Input
            label="Otros (% desc/rec)"
            type="number"
            step="0.1"
            value={form.discount_OTHER || '0'}
            onChange={(e) => handleChange('discount_OTHER', e.target.value)}
          />
        </div>
      </section>

      <div className="bg-background rounded-xl p-6 border border-border shadow-sm">
        <h2 className="text-xl font-semibold mb-6 text-foreground flex items-center">
          <Mail className="mr-3 text-primary" size={24} />
          Envío de Emails (SMTP)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-2">
              Servidor SMTP
            </label>
            <input
              type="text"
              name="smtpHost"
              placeholder="ej. smtp.gmail.com"
              value={form.smtpHost || ''}
              onChange={(e) => handleChange('smtpHost', e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-2">
              Puerto SMTP
            </label>
            <input
              type="text"
              name="smtpPort"
              placeholder="ej. 587 o 465"
              value={form.smtpPort || ''}
              onChange={(e) => handleChange('smtpPort', e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-2">
              Usuario SMTP (Email)
            </label>
            <input
              type="email"
              name="smtpUser"
              placeholder="tu-correo@gmail.com"
              value={form.smtpUser || ''}
              onChange={(e) => handleChange('smtpUser', e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-2">
              Contraseña SMTP
            </label>
            <input
              type="password"
              name="smtpPass"
              placeholder="Contraseña o App Password"
              value={form.smtpPass || ''}
              onChange={(e) => handleChange('smtpPass', e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground-muted mb-2">
              Nombre de Remitente
            </label>
            <input
              type="text"
              name="smtpFromName"
              placeholder="Ej. Mi Negocio - Ventas"
              value={form.smtpFromName || ''}
              onChange={(e) => handleChange('smtpFromName', e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save size={16} className="mr-2" /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </div>
  );
}
