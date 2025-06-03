
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Sale, Seller as SellerType } from '@/types'; 
import { Loader2, AlertCircle, ArrowLeft, UserPlus, Eye } from 'lucide-react'; 
import Button from '@/components/ui/Button';
import Link from 'next/link';

const SellerSalesHistoryPage = () => {
  const router = useRouter();
  const params = useParams();
  const sellerId = params.id as string;

  const [seller, setSeller] = useState<SellerType | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sellerId) {
      const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
          
          const sellerRes = await fetch(`/api/vendedores/${sellerId}`);
          if (!sellerRes.ok) {
            throw new Error('Vendedor no encontrado o error al cargar sus datos.');
          }
          const sellerData: SellerType = await sellerRes.json();
          setSeller(sellerData);

          
          const salesRes = await fetch(`/api/ventas?sellerId=${sellerId}`);
          if (!salesRes.ok) {
            const errorData = await salesRes.json().catch(() => ({}));
            throw new Error(errorData.message || 'Error al cargar el historial de ventas del vendedor.');
          }
          let salesData: any[] = await salesRes.json();
          
          const typedSales: Sale[] = salesData.map(sale => ({
            ...sale,
            totalAmount: parseFloat(String(sale.totalAmount)),
            saleDate: sale.saleDate,
            createdAt: sale.createdAt,
            updatedAt: sale.updatedAt,
            client: sale.client ? {
              ...sale.client,
              createdAt: sale.client.createdAt,
              updatedAt: sale.client.updatedAt,
            } : null,
            seller: sale.seller ? { 
              ...sale.seller,
              createdAt: sale.seller.createdAt,
              updatedAt: sale.seller.updatedAt,
            } : null,
            items: sale.items.map((item: any) => ({
              ...item,
              priceAtSale: parseFloat(String(item.priceAtSale)),
              product: item.product ? {
                ...item.product,
                pricePurchase: item.product.pricePurchase !== null ? parseFloat(String(item.product.pricePurchase)) : null,
                priceSale: parseFloat(String(item.product.priceSale)),
                quantityStock: parseInt(String(item.product.quantityStock)),
                stockMinAlert: item.product.stockMinAlert !== null ? parseInt(String(item.product.stockMinAlert)) : null,
                createdAt: item.product.createdAt,
                updatedAt: item.product.updatedAt,
              } : null,
            })),
          }));
          setSales(typedSales);

        } catch (err: any) {
          setError(err.message);
          console.error("Error fetching seller sales history:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    } else {
      setError("ID de vendedor no especificado.");
      setLoading(false);
    }
  }, [sellerId]);

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '-';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Fecha no disponible';
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="mt-2 text-foreground-muted">Cargando historial del vendedor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center">
        <AlertCircle size={48} className="text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error</h2>
        <p className="text-foreground-muted mb-4">{error}</p>
        <Button variant="outline" onClick={() => router.push('/vendedores')}>
          Volver a Vendedores
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-4">
          <ArrowLeft size={16} className="mr-2" />
          Volver
        </Button>
        {seller && (
          <div className="flex items-center space-x-3">
            <UserPlus size={40} className="text-primary" />
            <div>
              <h1 className="text-3xl font-semibold text-foreground">
                Historial de Ventas: {seller.name}
              </h1>
              {seller.email && <p className="text-sm text-foreground-muted">{seller.email}</p>}
            </div>
          </div>
        )}
      </div>

      {sales.length === 0 && !loading ? (
        <p className="text-center text-foreground-muted py-8">Este vendedor no tiene ventas registradas.</p>
      ) : (
        <div className="bg-muted p-4 sm:p-6 rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left"> 
              <thead className="border-b border-border">
                <tr>
                  <th className="p-3 text-sm font-semibold text-foreground">ID Venta</th>
                  <th className="p-3 text-sm font-semibold text-foreground">Fecha</th>
                  <th className="p-3 text-sm font-semibold text-foreground">Cliente</th>
                  <th className="p-3 text-sm font-semibold text-foreground text-right">Monto Total</th>
                  <th className="p-3 text-sm font-semibold text-foreground">Tipo Pago</th>
                  <th className="p-3 text-sm font-semibold text-foreground text-center">Nº Ítems</th>
                  <th className="p-3 text-sm font-semibold text-foreground">Cód. Desc.</th>
                  <th className="p-3 text-sm font-semibold text-foreground text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-b border-border last:border-b-0 hover:bg-background transition-colors">
                    <td className="p-3 text-sm text-foreground font-medium">
                        <Link href={`/ventas/${sale.id}`} className="text-primary hover:underline">
                            #{sale.id}
                        </Link>
                    </td>
                    <td className="p-3 text-sm text-foreground-muted">{formatDate(sale.saleDate)}</td>
                    <td className="p-3 text-sm text-foreground-muted">
                      {sale.client ? `${sale.client.firstName} ${sale.client.lastName || ''}`.trim() : 'N/A'}
                    </td>
                    <td className="p-3 text-sm text-foreground font-semibold text-right">{formatCurrency(sale.totalAmount)}</td>
                    <td className="p-3 text-sm text-foreground-muted">{sale.paymentType}</td>
                    <td className="p-3 text-sm text-foreground-muted text-center">{sale.items.length}</td>
                    <td className="p-3 text-sm text-foreground-muted">{sale.discountCodeApplied || '-'}</td>
                    <td className="p-3 text-sm text-center">
                      <Link href={`/ventas/${sale.id}`} passHref>
                        <Button variant="ghost" size="icon" title="Ver detalles de la venta">
                          <Eye size={16} className="text-primary" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default SellerSalesHistoryPage;