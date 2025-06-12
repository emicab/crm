
import Link from 'next/link';
import ProductTable from '@/components/productos/ProductTable'; 
import Button from '@/components/ui/Button'; 
import { PlusCircle } from 'lucide-react'; 

export default function ProductosPage() {
  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Gestión de Productos</h1>
          <p className="mt-1 text-foreground-muted">
            Visualiza, crea y administra tus productos.
          </p>
        </div>
        <Link href="/productos/nuevo">
          <Button variant="primary">
            <PlusCircle size={18} className="mr-2" />
            Agregar Producto
          </Button>
        </Link>
      </div>

      <ProductTable />
    </>
  );
}