// app/gastos/[id]/editar/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ExpenseForm from '@/components/gastos/ExpenseForm';
import type { Expense } from '@/types';
import { Loader2, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';

const EditarGastoPage = () => {
  const router = useRouter();
  const params = useParams();
  const expenseId = params.id as string;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (expenseId) {
      const fetchExpenseData = async () => {
        try {
          const response = await fetch(`/api/gastos/${expenseId}`);
          if (!response.ok) throw new Error('Gasto no encontrado o error al cargar.');
          
          const data = await response.json();
          // Convertir monto a número para el formulario
          setExpense({ ...data, amount: parseFloat(data.amount) });
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Error desconocido.');
        } finally {
          setLoading(false);
        }
      };
      fetchExpenseData();
    }
  }, [expenseId]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
  if (error) return (
    <div className="text-center p-8">
        <AlertCircle size={48} className="text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error</h2>
        <p className="text-foreground-muted mb-4">{error}</p>
        <Button variant="outline" onClick={() => router.push('/gastos')}>Volver al Historial</Button>
    </div>
  );

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">Editar Gasto</h1>
        <p className="mt-1 text-foreground-muted">
          Modifica los detalles del gasto: <span className="font-medium text-primary">{expense?.description}</span>
        </p>
      </div>
      <ExpenseForm initialExpenseData={expense} />
    </>
  );
};

export default EditarGastoPage;