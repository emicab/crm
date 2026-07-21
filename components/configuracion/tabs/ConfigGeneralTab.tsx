'use client';

import React from 'react';
import { Building, Percent, CreditCard, Save } from 'lucide-react';
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

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save size={16} className="mr-2" /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </div>
  );
}
