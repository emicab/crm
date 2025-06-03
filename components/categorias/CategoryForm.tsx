
"use client";

import React, { useState, useEffect } from 'react'; 
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Category } from '@/types'; 

interface CategoryFormData {
  name: string;
  
}

interface CategoryFormProps {
  initialCategoryData?: Category | null;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ initialCategoryData }) => {
  const router = useRouter();
  const [formData, setFormData] = useState<CategoryFormData>({ name: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialCategoryData) {
      setFormData({
        name: initialCategoryData.name || '',
      });
    }
  }, [initialCategoryData]);

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
      setError('El nombre de la categoría es obligatorio.');
      setIsLoading(false);
      return;
    }

    const method = initialCategoryData ? 'PUT' : 'POST';
    const apiUrl = initialCategoryData 
      ? `/api/categories/${initialCategoryData.id}` 
      : '/api/categories';

    try {
      const response = await fetch(apiUrl, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      setSuccessMessage(initialCategoryData ? '¡Categoría actualizada exitosamente!' : '¡Categoría creada exitosamente!');
      
      if (!initialCategoryData) {
        setFormData({ name: '' }); 
      }

      setTimeout(() => {
        router.push('/categorias');
        router.refresh(); 
      }, 1500);

    } catch (err: any) {
      setError(err.message || `Ocurrió un error al ${initialCategoryData ? 'actualizar' : 'crear'} la categoría.`);
    } finally {
      setIsLoading(false);
    }
  };

  const pageTitle = initialCategoryData ? 'Guardar Cambios' : 'Guardar Categoría';

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
        label="Nombre de la Categoría *" 
        name="name" 
        value={formData.name} 
        onChange={handleChange} 
        placeholder="Ej: Cargadores, Fundas"
        required 
      />
      
      <div className="flex justify-end pt-4">
        <Button type="button" variant="outline" onClick={() => router.push('/categorias')} className="mr-3" disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
          {isLoading ? (initialCategoryData ? 'Actualizando...' : 'Guardando...') : pageTitle}
        </Button>
      </div>
    </form>
  );
};

export default CategoryForm;