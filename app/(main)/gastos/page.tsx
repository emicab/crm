// app/gastos/page.tsx
import Link from 'next/link';
import ExpenseTable from '@/components/gastos/ExpenseTable'; // Crearemos este componente
import Button from '@/components/ui/Button';
import { PlusCircle } from 'lucide-react';

export default function GastosPage() {
  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Registro de Gastos</h1>
          <p className="mt-1 text-foreground-muted">
            Lleva un control de todos los egresos y gastos de tu negocio.
          </p>
        </div>
        <Link href="/gastos/nuevo" passHref>
          <Button variant="primary">
            <PlusCircle size={18} className="mr-2" />
            Agregar Gasto
          </Button>
        </Link>
      </div>

      <ExpenseTable />
    </>
  );
}