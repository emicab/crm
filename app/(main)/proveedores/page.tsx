// app/proveedores/page.tsx
import Link from 'next/link';
import SupplierTable from '@/components/proveedores/SupplierTable';
import Button from '@/components/ui/Button';
import { PlusCircle } from 'lucide-react';

export default function ProveedoresPage() {
  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Gestión de Proveedores</h1>
          <p className="mt-1 text-foreground-muted">
            Administra los proveedores y distribuidores de tu negocio.
          </p>
        </div>
        <Link href="/proveedores/nuevo" passHref>
          <Button as="a" variant="primary">
            <PlusCircle size={18} className="mr-2" />
            Agregar Proveedor
          </Button>
        </Link>
      </div>

      <SupplierTable />
    </>
  );
}