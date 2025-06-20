"use client";

import React, { useEffect, useState, useCallback } from 'react';
import type { Product, Brand, Category } from '@/types'; // Asegúrate de tener Brand y Category en tus tipos
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Edit3, Trash2, Loader2, AlertCircle, Filter, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import ConfirmationModal from '../ui/ConfirmationModal';

const ProductTable = () => {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Estados para los filtros ---
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    brandId: '',
    categoryId: '',
  });

  // Cargar las opciones para los desplegables de filtro una sola vez al montar el componente
  useEffect(() => {
    const fetchFilterOptions = async () => {
        try {
            const [brandsRes, categoriesRes] = await Promise.all([
                fetch('/api/brands'),
                fetch('/api/categories'),
            ]);
            if (!brandsRes.ok || !categoriesRes.ok) throw new Error("Error al cargar opciones de filtro.");
            
            setBrands(await brandsRes.json());
            setCategories(await categoriesRes.json());
        } catch (err: any) {
            console.error("Filtro-Error:", err);
            // Mostrar un error no crítico si solo fallan las opciones de filtro
            setError("No se pudieron cargar las opciones de filtro. La tabla principal podría funcionar.");
        }
    };
    fetchFilterOptions();
  }, []);

  // Función para obtener productos, ahora depende de los filtros
  // useCallback optimiza para que la función no se recree en cada render a menos que `filters` cambie
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.brandId) params.append('brandId', filters.brandId);
    if (filters.categoryId) params.append('categoryId', filters.categoryId);
    const queryString = params.toString();
    
    try {
      const response = await fetch(`/api/products?${queryString}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }
      const data = await response.json();
      // Asegurarse de que los precios se conviertan a número para el formateo
      setProducts(data.map((product: any) => ({
        ...product,
        pricePurchase: product.pricePurchase ? parseFloat(product.pricePurchase) : null,
        priceSale: parseFloat(product.priceSale),
      })));
    } catch (err: any) {
      setError(err.message || 'Error al cargar los productos.');
    } finally {
      setLoading(false);
    }
  }, [filters]); // La función se recalcula solo si el objeto `filters` cambia

  // Cargar productos al inicio y cada vez que se aplica un nuevo filtro
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenDeleteModal = (product: Product) => {
    setItemToDelete(product);
    setIsModalOpen(true);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ search: '', brandId: '', categoryId: '' });
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
  
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
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

      <div className="bg-muted p-4 sm:p-6 rounded-lg shadow">
        {/* --- Sección de Filtros y Búsqueda --- */}
        <div className="mb-6 p-4 border border-border rounded-md bg-background">
          <h3 className="text-lg font-medium text-foreground mb-3 flex items-center">
            <Filter size={18} className="mr-2 text-primary" /> Filtros y
            Búsqueda
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              name="search"
              placeholder="Buscar por nombre o SKU..."
              value={filters.search}
              onChange={handleFilterChange}
            />
            <Select
              name="brandId"
              value={filters.brandId}
              onChange={handleFilterChange}
              aria-label="Filtrar por Marca"
            >
              <option value="">Todas las Marcas</option>
              {brands.map((brand) => (
                <option key={brand.id} value={String(brand.id)}>
                  {brand.name}
                </option>
              ))}
            </Select>
            <Select
              name="categoryId"
              value={filters.categoryId}
              onChange={handleFilterChange}
              aria-label="Filtrar por Categoría"
            >
              <option value="">Todas las Categorías</option>
              {categories.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </Select>
            <Button
              onClick={handleClearFilters}
              variant="outline"
              className="h-10 self-end"
            >
              <X size={16} className="mr-2" />
              Limpiar Filtros
            </Button>
          </div>
        </div>
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
        <div className="overflow-x-auto">
          {/* Tabla para Escritorio (oculta en móvil) */}
          <table className="hidden md:table w-full min-w-max text-left">
            <thead className="border-b border-border">
              <tr>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground">Nombre</th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground">SKU</th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground">Marca</th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground">Categoría</th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground text-right">Precio Venta</th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground text-center">Stock</th>
                <th className="p-3 sm:p-4 text-sm font-semibold text-foreground text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!loading && products.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-foreground-muted py-8">No se encontraron productos.</td></tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="border-b border-border last:border-b-0 hover:bg-background transition-colors">
                    <td className="p-3 sm:p-4 text-sm text-foreground font-medium">{product.name}</td>
                    <td className="p-3 sm:p-4 text-sm text-foreground-muted">{product.sku || '-'}</td>
                    <td className="p-3 sm:p-4 text-sm text-foreground-muted">{product.brand.name}</td>
                    <td className="p-3 sm:p-4 text-sm text-foreground-muted">{product.category.name}</td>
                    <td className="p-3 sm:p-4 text-sm text-foreground text-right">{formatCurrency(product.priceSale)}</td>
                    <td className="p-3 sm:p-4 text-sm text-foreground font-semibold text-center">{product.quantityStock}</td>
                    <td className="p-3 sm:p-4 text-sm text-center">
                       <div className="flex items-center space-x-1">
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
           {/* Lista de Tarjetas para Móvil (oculta en escritorio) */}
          <div className="md:hidden space-y-2">
            {!loading && products.length === 0 ? (
                <div className="text-center text-foreground-muted py-8">No se encontraron productos.</div>
            ) : (
                products.map((product) => (
                    <div key={product.id} className="bg-background p-4 rounded-lg border border-border shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-foreground">{product.name}</p>
                                <p className="text-xs text-foreground-muted">SKU: {product.sku || 'N/A'}</p>
                            </div>
                            <div className="flex items-center space-x-1">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(product.id)} title="Editar" className="h-8 w-8">
                                    <Edit3 size={16} className="text-primary" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteModal(product)} title="Eliminar" className="h-8 w-8">
                                    <Trash2 size={16} className="text-destructive" />
                                </Button>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-border/60 grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-xs text-foreground-muted">Precio</p>
                                <p className="font-semibold text-foreground">{formatCurrency(product.priceSale)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-foreground-muted">Stock</p>
                                <p className="font-semibold text-foreground">{product.quantityStock}</p>
                            </div>
                            <div className="col-span-1">
                                <p className="text-xs text-foreground-muted">Marca</p>
                                <p className="font-medium text-foreground">{product.brand.name}</p>
                            </div>
                             <div className="col-span-1 text-right">
                                <p className="text-xs text-foreground-muted">Categoría</p>
                                <p className="font-medium text-foreground">{product.category.name}</p>
                            </div>
                        </div>
                    </div>
                ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductTable;