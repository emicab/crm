// app/compras/page.tsx
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { PlusCircle } from 'lucide-react';
import PurchaseHistoryTable from '@/components/compras/PurchaseHistoryTable';
// import PurchaseHistoryTable from '@/components/compras/PurchaseHistoryTable'; // Lo crearemos después

export default function HistorialComprasPage() {
  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Historial de Compras</h1>
          <p className="mt-1 text-foreground-muted">
            Consulta todas las compras de mercadería registradas.
          </p>
        </div>
        <Link href="/compras/nueva" passHref>
          <Button variant="primary">
            <PlusCircle size={18} className="mr-2" />
            Registrar Nueva Compra
          </Button>
        </Link>
      </div>
      <PurchaseHistoryTable/>      
    </>
  );
}