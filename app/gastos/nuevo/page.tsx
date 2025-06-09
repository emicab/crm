// app/gastos/nuevo/page.tsx
import ExpenseForm from '@/components/gastos/ExpenseForm'; // Crearemos este componente

export default function NuevoGastoPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">Nuevo Gasto</h1>
        <p className="mt-1 text-foreground-muted">
          Completa los detalles del nuevo egreso o gasto.
        </p>
      </div>
      
      <ExpenseForm /> 
    </>
  );
}