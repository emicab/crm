"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProductForm from '@/components/productos/ProductForm'; 
import type { Product } from '@/types';
import { Loader2, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';

const EditarProductoPage = () => {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productId) {
      const fetchProductData = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/products/${productId}`);
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Producto no encontrado o error al cargar (${response.status})`);
          }
          const data: Product = await response.json();
          setProduct({
            ...data,
            pricePurchase: data.pricePurchase ? parseFloat(String(data.pricePurchase)) : 0,
            priceSale: parseFloat(String(data.priceSale)),
          });
        } catch (err: any) {
          setError(err.message);
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchProductData();
    } else {
        setError("ID de producto no especificado.");
        setLoading(false);
    }
  }, [productId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="mt-2 text-foreground-muted">Cargando datos del producto...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center">
        <AlertCircle size={48} className="text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error al cargar el producto</h2>
        <p className="text-foreground-muted mb-4">{error}</p>
        <Button variant="outline" onClick={() => router.push('/productos')}>
          Volver a la lista de Productos
        </Button>
      </div>
    );
  }

  if (!product) {
    return <p className="text-center text-foreground-muted">No se encontraron datos para el producto.</p>;
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">Editar Producto</h1>
        <p className="mt-1 text-foreground-muted">
          Modifica los detalles del producto: <span className="font-medium text-primary">{product.name}</span>
        </p>
      </div>
      <ProductForm initialProductData={product} />
    </>
  );
};

export default EditarProductoPage;