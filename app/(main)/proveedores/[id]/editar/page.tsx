"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SupplierForm from '@/components/proveedores/SupplierForm';
import type { Supplier } from '@/types';
import { Loader2 } from 'lucide-react';

const EditarProveedorPage = () => {
  const params = useParams();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (supplierId) {
      const fetchSupplierData = async () => {
        try {
          const response = await fetch(`/api/proveedores/${supplierId}`);
          if (!response.ok) {
            throw new Error('Proveedor no encontrado o error al cargar.');
          }
          setSupplier(await response.json());
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Error desconocido.');
        } finally {
          setLoading(false);
        }
      };
      fetchSupplierData();
    }
  }, [supplierId]);

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-primary" /></div>;
  if (error) return <div className="text-center text-destructive p-4 bg-destructive/10 rounded-md">{error}</div>;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">Editar Proveedor</h1>
        <p className="mt-1 text-foreground-muted">
          Modifica los detalles de: <span className="font-medium text-primary">{supplier?.name}</span>
        </p>
      </div>
      <SupplierForm initialSupplierData={supplier} />
    </>
  );
};

export default EditarProveedorPage;