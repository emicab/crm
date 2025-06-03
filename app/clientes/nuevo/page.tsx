
import ClientForm from '@/components/clientes/ClientForm';

export default function NuevoClientePage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">Agregar Nuevo Cliente</h1>
        <p className="mt-1 text-foreground-muted">
          Completa los datos del nuevo cliente.
        </p>
      </div>
      
      <ClientForm /> 
    </>
  );
}