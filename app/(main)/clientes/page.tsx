
import Link from 'next/link';
import ClientTable from '@/components/clientes/ClientTable';
import Button from '@/components/ui/Button';
import { PlusCircle } from 'lucide-react';

export default function ClientesPage() {
  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Gestión de Clientes</h1>
          <p className="mt-1 text-foreground-muted">
            Visualiza, crea y administra tus clientes.
          </p>
        </div>
        <Link href="/clientes/nuevo" passHref>
          <Button variant="primary">
            <PlusCircle size={18} className="mr-2" />
            Agregar Cliente
          </Button>
        </Link>
      </div>

      <ClientTable />
    </>
  );
}