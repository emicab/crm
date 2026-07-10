import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Wallet } from 'lucide-react';

const typeDisplay: Record<string, string> = {
  SALE: 'Venta',
  EXPENSE: 'Gasto',
  WITHDRAWAL: 'Retiro',
  DEPOSIT: 'Depósito',
  ADJUSTMENT: 'Ajuste',
};

const paymentTypeDisplay: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  OTHER: 'Otro',
};

const formatCurrency = (amount: unknown) => {
  if (amount === null || amount === undefined) return '-';
  if (typeof amount === 'object' && amount !== null && 'toNumber' in amount && typeof (amount as { toNumber: () => number }).toNumber === 'function') {
    const num = (amount as { toNumber: () => number }).toNumber();
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(num);
  }
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (isNaN(num)) return '-';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(num);
};

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleString('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export default async function CajaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const register = await prisma.cashRegister.findUnique({
    where: { id: parseInt(id) },
    include: { movements: { orderBy: { createdAt: 'asc' } }, seller: { select: { id: true, name: true } } },
  });

  if (!register) notFound();

  const salesMovements = register.movements.filter(m => m.type === 'SALE');
  const expensesMovements = register.movements.filter(m => m.type === 'EXPENSE');
  const adjustments = register.movements.filter(m => m.type === 'WITHDRAWAL' || m.type === 'DEPOSIT' || m.type === 'ADJUSTMENT');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/caja" className="inline-flex items-center text-sm text-primary hover:underline">
        <ArrowLeft size={16} className="mr-1" /> Volver a Caja
      </Link>

      <div className="flex items-center gap-3">
        <Wallet size={28} className="text-primary" />
        <h1 className="text-3xl font-semibold text-foreground">
          Cierre de Caja #{register.id}
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-muted p-4 rounded-xl">
          <p className="text-xs text-foreground-muted mb-1">Saldo Inicial</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(register.initialBalance)}</p>
        </div>
        <div className="bg-muted p-4 rounded-xl">
          <p className="text-xs text-foreground-muted mb-1">Saldo Esperado</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(register.expectedBalance)}</p>
        </div>
        <div className="bg-muted p-4 rounded-xl">
          <p className="text-xs text-foreground-muted mb-1">Saldo Real</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(register.actualBalance)}</p>
        </div>
        <div className={`bg-muted p-4 rounded-xl ${register.difference && Number(register.difference) !== 0 ? 'ring-2 ring-destructive' : ''}`}>
          <p className="text-xs text-foreground-muted mb-1">Diferencia</p>
          <p className={`text-xl font-bold ${register.difference && Number(register.difference) !== 0 ? 'text-destructive' : 'text-success'}`}>
            {formatCurrency(register.difference)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-foreground-muted">
        <p>Apertura: <span className="text-foreground font-medium">{formatDate(register.openDate)}</span></p>
        <p>Cierre: <span className="text-foreground font-medium">{register.closeDate ? formatDate(register.closeDate) : '-'}</span></p>
        {register.seller && <p>Vendedor: <span className="text-foreground font-medium">{register.seller.name}</span></p>}
        {register.notes && <p className="md:col-span-2">Notas: <span className="text-foreground">{register.notes}</span></p>}
      </div>

      {register.movements.length > 0 && (
        <div className="bg-muted p-6 rounded-xl shadow">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Todos los Movimientos ({register.movements.length})
          </h2>
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-background">
                <tr>
                  <th className="p-3 text-foreground-muted">Tipo</th>
                  <th className="p-3 text-foreground-muted">Medio de Pago</th>
                  <th className="p-3 text-foreground-muted text-right">Monto</th>
                  <th className="p-3 text-foreground-muted">Descripción</th>
                  <th className="p-3 text-foreground-muted">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {register.movements.map((m) => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.type === 'SALE' ? 'bg-success/20 text-success' :
                        m.type === 'EXPENSE' ? 'bg-destructive/20 text-destructive' :
                        'bg-primary/20 text-primary'
                      }`}>{typeDisplay[m.type] || m.type}</span>
                    </td>
                    <td className="p-3 text-foreground">{paymentTypeDisplay[m.paymentType || ''] || m.paymentType || '-'}</td>
                    <td className={`p-3 text-right font-medium ${Number(m.amount) >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(m.amount)}
                    </td>
                    <td className="p-3 text-foreground-muted">{m.description || '-'}</td>
                    <td className="p-3 text-foreground-muted">{formatDate(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-background p-4 rounded-lg">
              <p className="text-xs text-foreground-muted mb-1">Total Ventas ({salesMovements.length})</p>
              <p className="text-lg font-bold text-success">
                {formatCurrency(salesMovements.reduce((sum, m) => sum + Number(m.amount), 0))}
              </p>
            </div>
            <div className="bg-background p-4 rounded-lg">
              <p className="text-xs text-foreground-muted mb-1">Total Gastos ({expensesMovements.length})</p>
              <p className="text-lg font-bold text-destructive">
                {formatCurrency(expensesMovements.reduce((sum, m) => sum + Number(m.amount), 0))}
              </p>
            </div>
            <div className="bg-background p-4 rounded-lg">
              <p className="text-xs text-foreground-muted mb-1">Ajustes ({adjustments.length})</p>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(adjustments.reduce((sum, m) => sum + Number(m.amount), 0))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
