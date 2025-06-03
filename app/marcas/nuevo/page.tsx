
import BrandForm from '@/components/marcas/BrandForm';

export default function NuevaMarcaPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">Agregar Nueva Marca</h1>
        <p className="mt-1 text-foreground-muted">
          Completa los detalles de la nueva marca.
        </p>
      </div>
      
      <BrandForm /> 
    </>
  );
}