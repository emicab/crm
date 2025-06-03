
"use client";

import React, { useEffect, useState } from 'react';
import type { Category } from '@/types';
import Button from '@/components/ui/Button';
import { Edit3, Trash2, Loader2, AlertCircle } from 'lucide-react'; 
import { useRouter } from 'next/navigation'; 

const CategoryTable = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); 
  const [actionError, setActionError] = useState<string | null>(null); 

  const router = useRouter();

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    setActionError(null);
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }
      const data = await response.json();
      setCategories(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las categorías.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDelete = async (categoryId: number) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta categoría? Esta acción no se puede deshacer.')) {
      setActionError(null); 
      try {
        const response = await fetch(`/api/categories/${categoryId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          throw new Error(errorData.message || `Error al eliminar: ${response.statusText} (${response.status})`);
        }

        
        setCategories(prevCategories => prevCategories.filter(category => category.id !== categoryId));
        
      } catch (err: any) {
        console.error('Error al eliminar la categoría:', err);
        setActionError(err.message); 
        alert(`Error: ${err.message}`); 
      }
    }
  };

  const handleEdit = (categoryId: number) => {
    router.push(`/categorias/${categoryId}/editar`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="ml-2 text-foreground-muted">Cargando categorías...</p>
      </div>
    );
  }

  if (error) {
    return (
        <div className="text-center text-destructive p-4 bg-destructive/10 rounded-md">
            <AlertCircle size={20} className="inline-block mr-2" />
            {error}
        </div>
    );
  }

  return (
    <div className="bg-muted p-4 sm:p-6 rounded-lg shadow">
      {actionError && (
        <div className="mb-4 text-center text-destructive p-3 bg-destructive/10 rounded-md">
          <AlertCircle size={18} className="inline-block mr-2" />
          {actionError}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[400px] text-left">
          <thead className="border-b border-border">
            <tr>
              <th className="p-3 sm:p-4 text-sm font-semibold text-foreground">Nombre</th>
              <th className="p-3 sm:p-4 text-sm font-semibold text-foreground text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && !loading ? (
                <tr>
                    <td colSpan={2} className="text-center text-foreground-muted py-8">
                        No se encontraron categorías. Comienza agregando una nueva.
                    </td>
                </tr>
            ) : (
                categories.map((category) => (
                <tr key={category.id} className="border-b border-border last:border-b-0 hover:bg-background transition-colors">
                    <td className="p-3 sm:p-4 text-sm text-foreground font-medium">{category.name}</td>
                    <td className="p-3 sm:p-4 text-sm text-center">
                    <div className="flex justify-center items-center space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(category.id)} title="Editar">
                        <Edit3 size={16} className="text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)} title="Eliminar">
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

export default CategoryTable;