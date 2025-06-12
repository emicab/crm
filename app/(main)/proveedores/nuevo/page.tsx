// app/proveedores/nuevo/page.tsx
import SupplierForm from '@/components/proveedores/SupplierForm';

export default function NuevoProveedorPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">Agregar Nuevo Proveedor</h1>
        <p className="mt-1 text-foreground-muted">
          Completa los datos del nuevo proveedor.
        </p>
      </div>
      
      <SupplierForm /> 
    </>
  );
}