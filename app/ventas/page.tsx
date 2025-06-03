
import Link from 'next/link';
import SalesHistoryTable from '@/components/ventas/SalesHistoryTable'; 
import Button from '@/components/ui/Button';
import { PlusCircle } from 'lucide-react';

export default function HistorialVentasPage() {
  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Historial de Ventas</h1>
          <p className="mt-1 text-foreground-muted">
            Consulta todas las transacciones de venta registradas.
          </p>
        </div>
        <Link href="/ventas/nueva" passHref>
          <Button variant="primary">
            <PlusCircle size={18} className="mr-2" />
            Registrar Nueva Venta
          </Button>
        </Link>
      </div>

      <SalesHistoryTable />
    </>
  );
}