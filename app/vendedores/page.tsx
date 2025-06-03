
import Link from 'next/link';
import SellerTable from '@/components/vendedores/SellerTable';
import Button from '@/components/ui/Button';
import { PlusCircle } from 'lucide-react';

export default function VendedoresPage() {
  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Gestión de Vendedores</h1>
          <p className="mt-1 text-foreground-muted">
            Administra el personal de ventas de tu negocio.
          </p>
        </div>
        <Link href="/vendedores/nuevo" passHref>
          <Button variant="primary">
            <PlusCircle size={18} className="mr-2" />
            Agregar Vendedor
          </Button>
        </Link>
      </div>

      <SellerTable />
    </>
  );
}