
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Brand } from '@/types';
import Button from '@/components/ui/Button';
import { Edit3, Trash2, Loader2, ImageOff, AlertCircle } from 'lucide-react'; 

const BrandTable = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null); 

  const router = useRouter(); 

  const fetchBrands = async () => { 
    setLoading(true);
    setError(null);
    setActionError(null); 
    try {
      const response = await fetch('/api/brands');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); 
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }
      const data = await response.json();
      setBrands(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las marcas.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleDelete = async (brandId: number) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta marca? Esta acción no se puede deshacer.')) {
      setActionError(null); 
      try {
        const response = await fetch(`/api/brands/${brandId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})); 
          throw new Error(errorData.message || `Error al eliminar: ${response.statusText} (${response.status})`);
        }

        
        setBrands(prevBrands => prevBrands.filter(brand => brand.id !== brandId));
        
        

      } catch (err: any) {
        console.error('Error al eliminar la marca:', err);
        setActionError(err.message || 'No se pudo eliminar la marca.');
        
        alert(`Error: ${err.message || 'No se pudo eliminar la marca.'}`);
      }
    }
  };

  const handleEdit = (brandId: number) => {
    router.push(`/marcas/${brandId}/editar`)
  };

  
  
  

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="ml-2 text-foreground-muted">Cargando marcas...</p>
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
  
  
  

  if (brands.length === 0) {
    return <div className="text-center text-foreground-muted py-8">No se encontraron marcas. Comienza agregando una nueva.</div>;
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
        <table className="w-full min-w-[600px] text-left">
          <thead className="border-b border-border">
            <tr>
              <th className="p-3 sm:p-4 text-sm font-semibold text-foreground w-16 text-center">Logo</th>
              <th className="p-3 sm:p-4 text-sm font-semibold text-foreground">Nombre</th>
              <th className="p-3 sm:p-4 text-sm font-semibold text-foreground text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => (
              <tr key={brand.id} className="border-b border-border last:border-b-0 hover:bg-background transition-colors">
                <td className="p-3 sm:p-4 text-center">
                  {brand.logoUrl ? (
                    <img 
                      src={brand.logoUrl} 
                      alt={`Logo de ${brand.name}`} 
                      className="h-10 w-10 object-contain rounded-sm inline-block" 
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        
                        const placeholder = document.createElement('div');
                        placeholder.className = "h-10 w-10 bg-slate-200 rounded-sm flex items-center justify-center text-slate-400 inline-block";
                        placeholder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>`; 
                        if (target.parentNode) {
                            target.parentNode.insertBefore(placeholder, target.nextSibling);
                        }
                      }}
                    />
                  ) : (
                    <div className="h-10 w-10 bg-slate-200 rounded-sm flex items-center justify-center text-slate-400">
                      <ImageOff size={20} />
                    </div>
                  )}
                </td>
                <td className="p-3 sm:p-4 text-sm text-foreground font-medium">{brand.name}</td>
                <td className="p-3 sm:p-4 text-sm text-center">
                  <div className="flex justify-center items-center space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(brand.id)} title="Editar">
                      <Edit3 size={16} className="text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(brand.id)} title="Eliminar">
                      <Trash2 size={16} className="text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BrandTable;