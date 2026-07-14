"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { Product, Brand, Category, Supplier } from '@/types';
import Button from '@/components/ui/Button';
import { Edit3, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import ConfirmationModal from '../ui/ConfirmationModal';
import { formatCurrency } from '@/lib/formatCurrency';
import Pagination from '@/components/ui/Pagination';
import { useProductCSV } from '@/hooks/useProductCSV';
import BatchSupplierModal from './BatchSupplierModal';
import ProductMobileCard from './ProductMobileCard';
import ProductFilters from './ProductFilters';
import SelectedBar from './SelectedBar';

const ProductTable = () => {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBatchSupplierModalOpen, setIsBatchSupplierModalOpen] = useState(false);
  const [batchSupplierId, setBatchSupplierId] = useState('');
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    brandId: '',
    categoryId: '',
    supplierId: '',
  });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const { handleExportCSV, handleImportCSV } = useProductCSV(() => fetchProducts(page));

  useEffect(() => {
    const fetchFilterOptions = async () => {
        try {
            const [brandsRes, categoriesRes, suppliersRes] = await Promise.all([
                fetch('/api/brands'),
                fetch('/api/categories'),
                fetch('/api/proveedores'),
            ]);
            if (!brandsRes.ok || !categoriesRes.ok || !suppliersRes.ok) throw new Error("Error al cargar opciones de filtro.");

            setBrands(await brandsRes.json());
            setCategories(await categoriesRes.json());
            setSuppliers(await suppliersRes.json());
        } catch (err: any) {
            console.error("Filtro-Error:", err);
            setError("No se pudieron cargar las opciones de filtro. La tabla principal podría funcionar.");
        }
    };
    fetchFilterOptions();
  }, []);

  const fetchProducts = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.brandId) params.append('brandId', filters.brandId);
    if (filters.categoryId) params.append('categoryId', filters.categoryId);
    if (filters.supplierId) params.append('supplierId', filters.supplierId);
    params.append('page', String(pageNum));
    params.append('limit', '20');
    const queryString = params.toString();

    try {
      const response = await fetch(`/api/products?${queryString}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }
      const result = await response.json();
      const items = Array.isArray(result) ? result : result.data;
      setProducts(items.map((product: any) => ({
        ...product,
        pricePurchase: product.pricePurchase ? parseFloat(product.pricePurchase) : null,
        priceSale: parseFloat(product.priceSale),
      })));
      if (!Array.isArray(result)) {
        setTotalPages(result.pagination.totalPages);
        setTotalProducts(result.pagination.total);
        setPage(result.pagination.page);
      } else {
        setTotalPages(1);
        setTotalProducts(items.length);
        setPage(1);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar los productos.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProducts(1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, fetchProducts]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchProducts(newPage);
  };

  const handleOpenDeleteModal = (product: Product) => {
    setItemToDelete(product);
    setIsModalOpen(true);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ search: '', brandId: '', categoryId: '', supplierId: '' });
    setPage(1);
  };

  const handleToggleSelect = (productId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  };

  const handleBatchSupplier = async () => {
    if (!batchSupplierId) {
      toast.error('Seleccioná un proveedor.');
      return;
    }
    setIsSavingBatch(true);
    try {
      const res = await fetch('/api/products/batch-supplier', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: Array.from(selectedIds),
          supplierId: parseInt(batchSupplierId),
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al actualizar proveedor.');
      }
      toast.success(`Proveedor asignado a ${selectedIds.size} producto(s).`);
      setSelectedIds(new Set());
      setIsBatchSupplierModalOpen(false);
      setBatchSupplierId('');
      fetchProducts(page);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setIsSavingBatch(false);
    }
  };

  const handleEdit = (productId: number) => {
    router.push(`/productos/${productId}/editar`);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/products/${itemToDelete.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Error al eliminar el producto.");
      }
      setProducts((prev) => prev.filter((p) => p.id !== itemToDelete.id));
      toast.success(`Producto "${itemToDelete.name}" eliminado.`);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Ocurrió un error inesperado.";
      toast.error(errorMessage);
    } finally {
      setIsModalOpen(false);
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  return (
    <>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Producto"
        confirmText="Sí, Eliminar"
        isLoading={isDeleting}
      >
        ¿Estás seguro de que quieres eliminar el producto{" "}
        <strong className="text-foreground">&quot;{itemToDelete?.name}&quot;</strong>?
        Esta acción no se puede deshacer.
      </ConfirmationModal>

      <BatchSupplierModal
        isOpen={isBatchSupplierModalOpen}
        selectedCount={selectedIds.size}
        supplierId={batchSupplierId}
        suppliers={suppliers}
        isSaving={isSavingBatch}
        onSupplierChange={setBatchSupplierId}
        onSave={handleBatchSupplier}
        onClose={() => {
          setIsBatchSupplierModalOpen(false);
          setBatchSupplierId('');
        }}
      />

      <div className="bg-muted p-4 sm:p-6 rounded-lg shadow">
        <ProductFilters
          filters={filters}
          brands={brands}
          categories={categories}
          suppliers={suppliers}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
          onExportCSV={() => handleExportCSV(products)}
          onImportCSV={handleImportCSV}
        />
        {error && (
          <div className="text-center text-destructive p-4 bg-destructive/10 rounded-md my-4">
            <AlertCircle size={20} className="inline-block mr-2" />
            {error}
          </div>
        )}
        {loading && (
          <div className="text-center py-4">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        )}
        <SelectedBar
          count={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          onAssignSupplier={() => setIsBatchSupplierModalOpen(true)}
        />
        <div className="overflow-x-auto">
          <table className="hidden md:table w-full text-left">
            <thead className="border-b border-border">
              <tr>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground w-10">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selectedIds.size === products.length}
                    onChange={handleSelectAll}
                    className="rounded border-border"
                  />
                </th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground max-w-[240px]">Nombre</th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground w-[90px]">SKU</th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground w-[110px]">Marca</th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground max-w-[140px]">Categoría</th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground max-w-[130px]">Proveedor</th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground text-right">Precio Compra</th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground text-right">Precio Venta</th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground text-center w-[70px]">Stock</th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground text-center w-[90px]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!loading && products.length === 0 ? (
                <tr><td colSpan={10} className="text-center text-foreground-muted py-8">No se encontraron productos.</td></tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="border-b border-border last:border-b-0 hover:bg-background transition-colors">
                    <td className="p-3 sm:p-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => handleToggleSelect(product.id)}
                        className="rounded border-border"
                      />
                    </td>
                    <td className="p-3 sm:p-4 text-sm text-foreground font-medium max-w-[240px]"><div className="truncate">{product.name}</div></td>
                    <td className="p-3 sm:p-4 text-sm text-foreground-muted w-[90px]"><div className="truncate">{product.sku || '-'}</div></td>
                    <td className="p-3 sm:p-4 text-sm text-foreground-muted w-[110px]"><div className="truncate">{product.brand.name}</div></td>
                    <td className="p-3 sm:p-4 text-sm text-foreground-muted max-w-[140px]"><div className="truncate">{product.category.name}</div></td>
                    <td className="p-3 sm:p-4 text-sm text-foreground-muted max-w-[130px]"><div className="truncate">{product.supplier?.name || '-'}</div></td>
                    <td className="p-3 sm:p-4 text-sm text-foreground text-right">{formatCurrency(product.pricePurchase ?? 0)}</td>
                    <td className="p-3 sm:p-4 text-sm text-foreground text-right">{formatCurrency(product.priceSale)}</td>
                    <td className="p-3 sm:p-4 text-sm text-foreground font-semibold text-center">{product.quantityStock}{product.unitType === 'WEIGHT' ? ' kg' : product.unitType === 'VOLUME' ? ' L' : ''}</td>
                    <td className="p-3 sm:p-4 text-sm text-center w-[90px] whitespace-nowrap">
                       <div className="flex items-center justify-center space-x-1">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(product.id)} title="Editar" className="h-8 w-8">
                                    <Edit3 size={16} className="text-primary" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteModal(product)} title="Eliminar" className="h-8 w-8">
                                    <Trash2 size={16} className="text-destructive" />
                                </Button>
                            </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="md:hidden space-y-2">
            {!loading && products.length === 0 ? (
                <div className="text-center text-foreground-muted py-8">No se encontraron productos.</div>
            ) : (
                products.map((product) => (
                  <ProductMobileCard
                    key={product.id}
                    product={product}
                    onEdit={handleEdit}
                    onOpenDelete={handleOpenDeleteModal}
                  />
                ))
            )}
          </div>
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalProducts}
          itemLabel="productos"
          onPageChange={handlePageChange}
        />
      </div>
    </>
  );
};

export default ProductTable;
