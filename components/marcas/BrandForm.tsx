
"use client";

import React, { useState, useEffect } from 'react'; 
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Brand } from '@/types'; 

interface BrandFormData {
  name: string;
  logoUrl: string;
}


interface BrandFormProps {
  initialBrandData?: Brand | null; 
}

const BrandForm: React.FC<BrandFormProps> = ({ initialBrandData }) => {
  const router = useRouter();
  const [formData, setFormData] = useState<BrandFormData>({
    name: '',
    logoUrl: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  
  useEffect(() => {
    if (initialBrandData) {
      setFormData({
        name: initialBrandData.name || '',
        logoUrl: initialBrandData.logoUrl || '',
      });
    }
  }, [initialBrandData]); 

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    if (!formData.name.trim()) {
      setError('El nombre de la marca es obligatorio.');
      setIsLoading(false);
      return;
    }

    const method = initialBrandData ? 'PUT' : 'POST';
    const apiUrl = initialBrandData 
      ? `/api/brands/${initialBrandData.id}` 
      : '/api/brands';

    try {
      const response = await fetch(apiUrl, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          logoUrl: formData.logoUrl || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      setSuccessMessage(initialBrandData ? '¡Marca actualizada exitosamente!' : '¡Marca creada exitosamente!');
      
      if (!initialBrandData) { 
        setFormData({ name: '', logoUrl: '' });
      }

      setTimeout(() => {
        router.push('/marcas'); 
        router.refresh(); 
      }, 1500);

    } catch (err: any) {
      setError(err.message || `Ocurrió un error al ${initialBrandData ? 'actualizar' : 'crear'} la marca.`);
    } finally {
      setIsLoading(false);
    }
  };

  const pageTitle = initialBrandData ? 'Guardar Cambios' : 'Guardar Marca';

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
        label="Nombre de la Marca *" 
        name="name" 
        value={formData.name} 
        onChange={handleChange} 
        placeholder="Ej: Samsung, Apple, Genérica"
        required 
      />
      
      <Input 
        label="URL del Logo (Opcional)" 
        name="logoUrl" 
        type="url"
        value={formData.logoUrl} 
        onChange={handleChange} 
        placeholder="Ej: https://ejemplo.com/logo.png"
      />

      <div className="flex justify-end pt-4">
        <Button type="button" variant="outline" onClick={() => router.push('/marcas')} className="mr-3" disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
          {isLoading ? (initialBrandData ? 'Actualizando...' : 'Guardando...') : pageTitle}
        </Button>
      </div>
    </form>
  );
};

export default BrandForm;