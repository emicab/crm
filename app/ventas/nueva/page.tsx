
import SaleForm from '@/components/ventas/SaleForm'; 

export default function NuevaVentaPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">Registrar Nueva Venta</h1>
        <p className="mt-1 text-foreground-muted">
          Completa los detalles para registrar una nueva transacción de venta.
        </p>
      </div>
      
      <SaleForm /> 
    </>
  );
}