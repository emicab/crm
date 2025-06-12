
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SellerForm from '@/components/vendedores/SellerForm';
import type { Seller } from '@/types';
import { Loader2, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';

const EditarVendedorPage = () => {
  const router = useRouter();
  const params = useParams();
  const sellerId = params.id as string;

  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sellerId) {
      const fetchSellerData = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/vendedores/${sellerId}`);
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Vendedor no encontrado o error al cargar (${response.status})`);
          }
          const data: Seller = await response.json();
          setSeller(data);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchSellerData();
    } else {
        setError("ID de vendedor no especificado.");
        setLoading(false);
    }
  }, [sellerId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="mt-2 text-foreground-muted">Cargando datos del vendedor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center">
        <AlertCircle size={48} className="text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error al cargar el vendedor</h2>
        <p className="text-foreground-muted mb-4">{error}</p>
        <Button variant="outline" onClick={() => router.push('/vendedores')}>
          Volver a la lista de Vendedores
        </Button>
      </div>
    );
  }

  if (!seller) {
    return <p className="text-center text-foreground-muted">No se encontraron datos para el vendedor.</p>;
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">Editar Vendedor</h1>
        <p className="mt-1 text-foreground-muted">
          Modifica los detalles del vendedor: <span className="font-medium text-primary">{seller.name}</span>
        </p>
      </div>
      <SellerForm initialSellerData={seller} />
    </>
  );
};

export default EditarVendedorPage;