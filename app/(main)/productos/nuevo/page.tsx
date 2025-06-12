import ProductForm from '@/components/productos/ProductForm'; 
export default function NuevoProductoPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">Agregar Nuevo Producto</h1>
        <p className="mt-1 text-foreground-muted">
          Completa los detalles del nuevo producto para añadirlo al inventario.
        </p>
      </div>
      
      <ProductForm /> 
      
    </>
  );
}