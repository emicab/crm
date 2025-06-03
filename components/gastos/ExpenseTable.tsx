// components/gastos/ExpenseTable.tsx
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import type { Expense } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input'; // Para filtros
import { Edit3, Trash2, Loader2, AlertCircle, Filter } from 'lucide-react';
import { getPaymentTypeDisplay } from '@/lib/displayTexts'; // Reutilizamos esto

const ExpenseTable = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para filtros
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    let queryString = '?';
    if (filterCategory) queryString += `category=${encodeURIComponent(filterCategory)}&`;
    if (filterStartDate) queryString += `startDate=${encodeURIComponent(filterStartDate)}&`;
    if (filterEndDate) queryString += `endDate=${encodeURIComponent(filterEndDate)}&`;
    
    // Eliminar el último '&' o '?' si no hay parámetros
    if (queryString === '?' || queryString.endsWith('&')) {
        queryString = queryString.slice(0, -1);
    }
    if (queryString === '?') queryString = '';


    try {
      const response = await fetch(`/api/gastos${queryString}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }
      const data = await response.json();
      // Convertir amount a número
      setExpenses(data.map((exp: any) => ({
        ...exp,
        amount: parseFloat(exp.amount),
      })));
    } catch (err: any) {
      setError(err.message || 'Error al cargar los gastos.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterStartDate, filterEndDate]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleApplyFilters = () => {
    fetchExpenses();
  };

  const handleClearFilters = () => {
    setFilterCategory('');
    setFilterStartDate('');
    setFilterEndDate('');
    // El useEffect en fetchExpenses se disparará si este fuera el único trigger,
    // pero como queremos un fetch inmediato al limpiar, llamamos directamente.
    // Para evitar doble fetch, podríamos hacer fetchExpenses dependiente solo del botón.
    // Por ahora, esta llamada directa es más simple.
    // Si fetchExpenses no estuviera en useCallback y no dependiera de los filtros,
    // simplemente llamar fetchExpenses() aquí sería suficiente.
    // Para que funcione con el useCallback actual, debemos pasarle los filtros vacíos temporalmente
    // o refactorizar fetchExpenses para que no dependa de los estados de filtro.
    // Manera simple por ahora (disparará el useEffect si los valores cambian):
    // setFilterCategory(''); setFilterStartDate(''); setFilterEndDate('');
    // Llamada directa para asegurar:
    // Forzamos el re-fetch con filtros vacíos, pero el useCallback ya lo haría si los estados cambian.
    // Para que esto funcione bien con useCallback, la función no debería depender de los estados de filtro, sino recibirlos como args.
    // Alternativa:
    const originalFetch = async () => { // Copia de fetchExpenses sin useCallback para este caso
        setLoading(true); setError(null);
        try {
            const response = await fetch('/api/gastos'); // Sin filtros
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            const data = await response.json();
            setExpenses(data.map((exp: any) => ({ ...exp, amount: parseFloat(exp.amount)})));
        } catch (err:any) { setError(err.message); } finally { setLoading(false); }
    }
    originalFetch();
  };


  const handleDelete = async (expenseId: number) => {
    alert(`Eliminar gasto con ID: ${expenseId} (funcionalidad pendiente - API no implementada)`);
  };

  const handleEdit = (expenseId: number) => {
    alert(`Editar gasto con ID: ${expenseId} (funcionalidad pendiente - API no implementada)`);
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };


  if (loading && expenses.length === 0) { // Mostrar loading solo si no hay datos previos
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="ml-2 text-foreground-muted">Cargando gastos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive p-4 bg-destructive/10 rounded-md my-4">
        <AlertCircle size={20} className="inline-block mr-2" />
        {error}
      </div>
    );
  }

  return (
    <div className="bg-muted p-4 sm:p-6 rounded-lg shadow">
      {/* Sección de Filtros */}
      <div className="mb-6 p-4 border border-border rounded-md bg-background">
        <h3 className="text-lg font-medium text-foreground mb-3 flex items-center">
            <Filter size={18} className="mr-2 text-primary" /> Filtros
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input 
            label="Categoría"
            placeholder="Buscar por categoría..."
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          />
          <Input 
            label="Fecha Desde"
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
          />
          <Input 
            label="Fecha Hasta"
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
          />
          <div className="flex items-end space-x-2">
            <Button onClick={handleApplyFilters} variant="secondary" className="w-full sm:w-auto">Aplicar</Button>
            <Button onClick={handleClearFilters} variant="outline" className="w-full sm:w-auto">Limpiar</Button>
          </div>
        </div>
      </div>
      
      {loading && <div className="text-center py-4"><Loader2 size={24} className="animate-spin text-primary" /></div>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left">
          <thead className="border-b border-border">
            <tr>
              <th className="p-3 text-sm font-semibold text-foreground">Fecha</th>
              <th className="p-3 text-sm font-semibold text-foreground">Descripción</th>
              <th className="p-3 text-sm font-semibold text-foreground">Categoría</th>
              <th className="p-3 text-sm font-semibold text-foreground text-right">Monto</th>
              <th className="p-3 text-sm font-semibold text-foreground">Tipo Pago</th>
              <th className="p-3 text-sm font-semibold text-foreground text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} className="text-center text-foreground-muted py-8">
                  No hay gastos registrados para los filtros seleccionados.
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr key={expense.id} className="border-b border-border last:border-b-0 hover:bg-background transition-colors">
                  <td className="p-3 text-sm text-foreground-muted">{formatDate(expense.expenseDate)}</td>
                  <td className="p-3 text-sm text-foreground font-medium">{expense.description}</td>
                  <td className="p-3 text-sm text-foreground-muted">{expense.category}</td>
                  <td className="p-3 text-sm text-foreground font-semibold text-right">{formatCurrency(expense.amount)}</td>
                  <td className="p-3 text-sm text-foreground-muted">{getPaymentTypeDisplay(expense.paymentType)}</td>
                  <td className="p-3 text-sm text-center">
                    <div className="flex justify-center items-center space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(expense.id)} title="Editar">
                        <Edit3 size={16} className="text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id)} title="Eliminar">
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExpenseTable;