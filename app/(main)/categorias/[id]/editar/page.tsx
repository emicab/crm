
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CategoryForm from '@/components/categorias/CategoryForm'; 
import type { Category } from '@/types';
import { Loader2, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button'; 

const EditarCategoriaPage = () => {
  const router = useRouter();
  const params = useParams();
  const categoryId = params.id as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (categoryId) {
      const fetchCategoryData = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/categories/${categoryId}`);
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Categoría no encontrada o error al cargar (${response.status})`);
          }
          const data: Category = await response.json();
          setCategory(data);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchCategoryData();
    } else {
        setError("ID de categoría no especificado.");
        setLoading(false);
    }
  }, [categoryId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="mt-2 text-foreground-muted">Cargando datos de la categoría...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center">
        <AlertCircle size={48} className="text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error al cargar la categoría</h2>
        <p className="text-foreground-muted mb-4">{error}</p>
        <Button variant="outline" onClick={() => router.push('/categorias')}>
          Volver a la lista de Categorías
        </Button>
      </div>
    );
  }

  if (!category) {
    return <p className="text-center text-foreground-muted">No se encontraron datos para la categoría.</p>;
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">Editar Categoría</h1>
        <p className="mt-1 text-foreground-muted">
          Modifica el nombre de la categoría: <span className="font-medium text-primary">{category.name}</span>
        </p>
      </div>
      <CategoryForm initialCategoryData={category} />
    </>
  );
};

export default EditarCategoriaPage;