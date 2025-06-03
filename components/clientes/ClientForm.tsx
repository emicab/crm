
"use client";

import React, { useState, useEffect } from 'react'; 
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Client } from '@/types'; 

interface ClientFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

interface ClientFormProps {
  initialClientData?: Client | null; 
}

const ClientForm: React.FC<ClientFormProps> = ({ initialClientData }) => {
  const router = useRouter();
  const [formData, setFormData] = useState<ClientFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialClientData) {
      setFormData({
        firstName: initialClientData.firstName || '',
        lastName: initialClientData.lastName || '',
        email: initialClientData.email || '',
        phone: initialClientData.phone || '',
        address: initialClientData.address || '',
        notes: initialClientData.notes || '',
      });
    }
  }, [initialClientData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

    if (!formData.firstName.trim()) {
      setError('El nombre del cliente es obligatorio.');
      setIsLoading(false);
      return;
    }

    const method = initialClientData ? 'PUT' : 'POST';
    const apiUrl = initialClientData 
      ? `/api/clients/${initialClientData.id}` 
      : '/api/clients';

    
    const dataToSend = {
        firstName: formData.firstName,
        lastName: formData.lastName.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null,
    };

    try {
      const response = await fetch(apiUrl, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      setSuccessMessage(initialClientData ? '¡Cliente actualizado exitosamente!' : '¡Cliente creado exitosamente!');
      
      if (!initialClientData) { 
        setFormData({ firstName: '', lastName: '', email: '', phone: '', address: '', notes: '' });
      }

      setTimeout(() => {
        router.push('/clientes');
        router.refresh();
      }, 1500);

    } catch (err: any) {
      setError(err.message || `Ocurrió un error al ${initialClientData ? 'actualizar' : 'crear'} el cliente.`);
    } finally {
      setIsLoading(false);
    }
  };

  const submitButtonText = initialClientData ? 'Actualizar Cliente' : 'Guardar Cliente';
  const loadingButtonText = initialClientData ? 'Actualizando...' : 'Guardando...';

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
        <Input label="Nombre(s) *" name="firstName" value={formData.firstName} onChange={handleChange} required />
        <Input label="Apellido(s) (Opcional)" name="lastName" value={formData.lastName} onChange={handleChange} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input label="Correo Electrónico (Opcional)" name="email" type="email" value={formData.email} onChange={handleChange} />
        <Input label="Teléfono (Opcional)" name="phone" type="tel" value={formData.phone} onChange={handleChange} />
      </div>
      
      <Input label="Dirección (Opcional)" name="address" value={formData.address} onChange={handleChange} />
      
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-foreground-muted mb-1.5">Notas Adicionales (Opcional)</label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          value={formData.notes}
          onChange={handleChange}
          className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="flex justify-end pt-4">
        <Button type="button" variant="outline" onClick={() => router.push('/clientes')} className="mr-3" disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
          {isLoading ? loadingButtonText : submitButtonText}
        </Button>
      </div>
    </form>
  );
};

export default ClientForm;