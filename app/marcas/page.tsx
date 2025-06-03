
import Link from 'next/link';
import BrandTable from '@/components/marcas/BrandTable';
import Button from '@/components/ui/Button';
import { PlusCircle } from 'lucide-react';

export default function MarcasPage() {
  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Gestión de Marcas</h1>
          <p className="mt-1 text-foreground-muted">
            Visualiza, crea y administra las marcas de tus productos.
          </p>
        </div>
        <Link href="/marcas/nuevo" passHref>
          <Button variant="primary">
            <PlusCircle size={18} className="mr-2" />
            Agregar Marca
          </Button>
        </Link>
      </div>

      <BrandTable />
    </>
  );
}