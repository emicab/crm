// components/vendedores/SellerForm.tsx
"use client";

import React, { useState, useEffect } from 'react'; // Importar useEffect
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Seller } from '@/types'; // Importar el tipo Seller

interface SellerFormData {
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
}

interface SellerFormProps {
  initialSellerData?: Seller | null; // Prop opcional para datos iniciales
}

const SellerForm: React.FC<SellerFormProps> = ({ initialSellerData }) => {
  const router = useRouter();
  const [formData, setFormData] = useState<SellerFormData>({
    name: '',
    email: '',
    phone: '',
    isActive: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialSellerData) {
      setFormData({
        name: initialSellerData.name || '',
        email: initialSellerData.email || '',
        phone: initialSellerData.phone || '',
        isActive: initialSellerData.isActive !== undefined ? initialSellerData.isActive : true,
      });
    }
  }, [initialSellerData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!formData.name.trim()) {
      setError('El nombre del vendedor es obligatorio.');
      setIsLoading(false);
      return;
    }

    const method = initialSellerData ? 'PUT' : 'POST';
    const apiUrl = initialSellerData 
      ? `/api/vendedores/${initialSellerData.id}` 
      : '/api/vendedores';

    try {
      const response = await fetch(apiUrl, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          isActive: formData.isActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      setSuccessMessage(initialSellerData ? '¡Vendedor actualizado exitosamente!' : '¡Vendedor creado exitosamente!');
      
      if (!initialSellerData) {
        setFormData({ name: '', email: '', phone: '', isActive: true });
      }

      setTimeout(() => {
        router.push('/vendedores');
        router.refresh();
      }, 1500);

    } catch (err: any) {
      setError(err.message || `Ocurrió un error al ${initialSellerData ? 'actualizar' : 'crear'} el vendedor.`);
    } finally {
      setIsLoading(false);
    }
  };

  const submitButtonText = initialSellerData ? 'Actualizar Vendedor' : 'Guardar Vendedor';
  const loadingButtonText = initialSellerData ? 'Actualizando...' : 'Guardando...';

  return (
    <form onSubmit={handleSubmit} className="bg-muted p-6 sm:p-8 rounded-lg shadow space-y-6 max-w-lg mx-auto">
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

      <Input 
        label="Nombre Completo *" 
        name="name" 
        value={formData.name} 
        onChange={handleChange} 
        required 
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input 
            label="Correo Electrónico (Opcional)" 
            name="email" 
            type="email" 
            value={formData.email} 
            onChange={handleChange} 
        />
        <Input 
            label="Teléfono (Opcional)" 
            name="phone" 
            type="tel" 
            value={formData.phone} 
            onChange={handleChange} 
        />
      </div>
      
      <div className="flex items-center space-x-2 pt-2">
        <input
          type="checkbox"
          id="isActive"
          name="isActive"
          checked={formData.isActive}
          onChange={handleChange}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />
        <label htmlFor="isActive" className="text-sm font-medium text-foreground">
          Vendedor Activo
        </label>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="button" variant="outline" onClick={() => router.push('/vendedores')} className="mr-3" disabled={isLoading}>
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

export default SellerForm;