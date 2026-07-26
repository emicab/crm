import React from 'react';
import DiscountCodeTable from '@/components/marketing/DiscountCodeTable';
import { Ticket } from 'lucide-react';

export default function DiscountCodesPage() {
  return (
    <>
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 text-primary rounded-xl">
          <Ticket size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Códigos de Descuento</h1>
          <p className="mt-1 text-foreground-muted">
            Crea y administra códigos promocionales para aplicar descuentos en las ventas.
          </p>
        </div>
      </div>

      <DiscountCodeTable />
    </>
  );
}
