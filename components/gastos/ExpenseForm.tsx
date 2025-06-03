// components/gastos/ExpenseForm.tsx
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select'; // Reutilizamos Select para PaymentType
import { Loader2, AlertCircle } from 'lucide-react';
import { PaymentTypeEnum } from '@/types'; // Reutilizamos el enum
import { getPaymentTypeDisplay } from '@/lib/displayTexts'; // Reutilizamos el helper

// Lista sugerida de categorías de gastos
const GASTO_CATEGORIAS_SUGERIDAS = [
  "Compra de Mercadería", // Recordar que esto NO afecta stock automáticamente por ahora
  "Alquiler",
  "Servicios (Luz, Agua, Internet)",
  "Sueldos y Honorarios",
  "Marketing y Publicidad",
  "Impuestos y Tasas",
  "Viáticos y Movilidad",
  "Insumos de Oficina",
  "Reparaciones y Mantenimiento",
  "Gastos Bancarios",
  "Retiro de Caja",
  "Otro Gasto",
];

interface ExpenseFormData {
  expenseDate: string; // Formato YYYY-MM-DD para el input date
  description: string;
  amount: string; // Manejar como string en el form, convertir a número al enviar
  category: string;
  paymentType: PaymentTypeEnum | '';
  notes: string;
}

const initialFormData: ExpenseFormData = {
  expenseDate: new Date().toISOString().split('T')[0], // Fecha de hoy por defecto
  description: '',
  amount: '',
  category: '',
  paymentType: '',
  notes: '',
};

const ExpenseForm = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<ExpenseFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!formData.description || !formData.amount || !formData.category || !formData.paymentType) {
      setError('Por favor, completa Descripción, Monto, Categoría y Tipo de Pago.');
      setIsLoading(false);
      return;
    }
    const amountNumber = parseFloat(formData.amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      setError('El monto debe ser un número positivo.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/gastos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: amountNumber, // Enviar como número
          paymentType: formData.paymentType as PaymentTypeEnum,
          expenseDate: formData.expenseDate || undefined, // Enviar undefined si está vacío para que el backend use la fecha actual
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      setSuccessMessage('¡Gasto registrado exitosamente!');
      setFormData(initialFormData); 

      setTimeout(() => {
        router.push('/gastos');
        router.refresh();
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al registrar el gasto.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-muted p-6 sm:p-8 rounded-lg shadow space-y-6 max-w-2xl mx-auto">
      {error && (
        <div className="flex items-center bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          <AlertCircle size={18} className="mr-2" /> {error}
        </div>
      )}
      {successMessage && (
        <div className="flex items-center bg-success/10 text-success text-sm p-3 rounded-md">
          <AlertCircle size={18} className="mr-2" /> {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input 
          label="Fecha del Gasto *" 
          name="expenseDate" 
          type="date"
          value={formData.expenseDate} 
          onChange={handleChange} 
          required 
        />
        <Input 
          label="Monto del Gasto *" 
          name="amount" 
          type="number"
          step="0.01"
          min="0.01"
          value={formData.amount} 
          onChange={handleChange} 
          placeholder="Ej: 1500.50"
          required 
        />
      </div>
      
      <Input 
        label="Descripción del Gasto *" 
        name="description" 
        value={formData.description} 
        onChange={handleChange} 
        placeholder="Ej: Compra de resmas de papel, Viáticos reunión cliente X"
        required 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
            <label htmlFor="category" className="block text-sm font-medium text-foreground-muted mb-1.5">Categoría del Gasto *</label>
            <Input 
                name="category" 
                id="category"
                value={formData.category} 
                onChange={handleChange} 
                placeholder="Ej: Oficina, Marketing, Mercadería"
                list="gasto-categorias-sugeridas" // Para el datalist
                required 
            />
            <datalist id="gasto-categorias-sugeridas">
                {GASTO_CATEGORIAS_SUGERIDAS.map(cat => <option key={cat} value={cat} />)}
            </datalist>
        </div>
        <Select 
            label="Tipo de Pago *" 
            name="paymentType" 
            value={formData.paymentType} 
            onChange={handleChange} 
            required
        >
          <option value="">Selecciona cómo se pagó</option>
          {Object.values(PaymentTypeEnum).map(type => (
            <option key={type} value={type}>{getPaymentTypeDisplay(type)}</option>
          ))}
        </Select>
      </div>
      
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-foreground-muted mb-1.5">Notas Adicionales (Opcional)</label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          value={formData.notes}
          onChange={handleChange}
          className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Ej: Factura Nro 123, Pagado por Juan Pérez"
        />
      </div>

      <div className="flex justify-end pt-4">
        <Button type="button" variant="outline" onClick={() => router.push('/gastos')} className="mr-3" disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
          {isLoading ? 'Guardando...' : 'Guardar Gasto'}
        </Button>
      </div>
    </form>
  );
};

export default ExpenseForm;