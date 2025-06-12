// app/compras/nuevo/page.tsx
import PurchaseForm from '@/components/compras/PurchaseForm';

export default function NuevaCompraPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">Registrar Nueva Compra</h1>
        <p className="mt-1 text-foreground-muted">
          Registra la entrada de mercadería y actualiza tu stock.
        </p>
      </div>
      
      <PurchaseForm /> 
    </>
  );
}