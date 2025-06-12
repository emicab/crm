
import SellerForm from '@/components/vendedores/SellerForm'; 

export default function NuevoVendedorPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">Agregar Nuevo Vendedor</h1>
        <p className="mt-1 text-foreground-muted">
          Completa los datos del nuevo vendedor.
        </p>
      </div>
      
      <SellerForm /> 
    </>
  );
}