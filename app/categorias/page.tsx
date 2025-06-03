
import Link from 'next/link';
import CategoryTable from '@/components/categorias/CategoryTable';
import Button from '@/components/ui/Button';
import { PlusCircle } from 'lucide-react';

export default function CategoriasPage() {
  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Gestión de Categorías</h1>
          <p className="mt-1 text-foreground-muted">
            Visualiza, crea y administra las categorías de tus productos.
          </p>
        </div>
        <Link href="/categorias/nuevo" passHref>
          <Button variant="primary">
            <PlusCircle size={18} className="mr-2" />
            Agregar Categoría
          </Button>
        </Link>
      </div>

      <CategoryTable />
    </>
  );
}