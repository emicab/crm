
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation'; 
import BrandForm from '@/components/marcas/BrandForm'; 
import type { Brand } from '@/types';
import { Loader2, AlertCircle } from 'lucide-react';

const EditarMarcaPage = () => {
  const router = useRouter();
  const params = useParams(); 
  const brandId = params.id as string; 

  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (brandId) {
      const fetchBrandData = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/brands/${brandId}`);
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Marca no encontrada o error al cargar (${response.status})`);
          }
          const data: Brand = await response.json();
          setBrand(data);
        } catch (err: any) {
          setError(err.message);
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchBrandData();
    } else {
        
        setError("ID de marca no especificado.");
        setLoading(false);
    }
  }, [brandId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="mt-2 text-foreground-muted">Cargando datos de la marca...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center">
        <AlertCircle size={48} className="text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error al cargar la marca</h2>
        <p className="text-foreground-muted mb-4">{error}</p>
        <Button variant="outline" onClick={() => router.push('/marcas')}>
          Volver a la lista de Marcas
        </Button>
      </div>
    );
  }

  if (!brand) {
    
    return <p className="text-center text-foreground-muted">No se encontraron datos para la marca.</p>;
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">Editar Marca</h1>
        <p className="mt-1 text-foreground-muted">
          Modifica los detalles de la marca: <span className="font-medium text-primary">{brand.name}</span>
        </p>
      </div>
      
      <BrandForm initialBrandData={brand} />
    </>
  );
};

export default EditarMarcaPage;