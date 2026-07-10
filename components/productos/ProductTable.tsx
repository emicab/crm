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
import { exportToCSV, parseCSV } from '@/lib/csv';

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

  const handleExportCSV = () => {
    const headers = [
      { key: 'name', label: 'Nombre' },
      { key: 'sku', label: 'SKU' },
      { key: 'description', label: 'Descripción' },
      { key: 'pricePurchase', label: 'Precio Compra' },
      { key: 'priceSale', label: 'Precio Venta' },
      { key: 'quantityStock', label: 'Stock' },
      { key: 'stockMinAlert', label: 'Alerta Stock Mínimo' },
      { key: 'brandName', label: 'Marca' },
      { key: 'categoryName', label: 'Categoría' }
    ];
    const dataToExport = products.map(p => ({
      ...p,
      brandName: p.brand?.name || '',
      categoryName: p.category?.name || '',
    }));
    exportToCSV('productos', dataToExport, headers);
    toast.success('Productos exportados a CSV con éxito.');
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const lines = parseCSV(text);
        if (lines.length < 2) {
          toast.error('El archivo CSV está vacío o no tiene formato válido.');
          return;
        }

        const headers = lines[0].map(h => h.trim().toLowerCase());
        const nameIdx = headers.indexOf('nombre');
        const skuIdx = headers.indexOf('sku');
        const descIdx = headers.indexOf('descripción');
        const pricePurchaseIdx = headers.indexOf('precio compra');
        const priceSaleIdx = headers.indexOf('precio venta');
        const stockIdx = headers.indexOf('stock');
        const stockMinIdx = headers.indexOf('alerta stock mínimo');
        const brandIdx = headers.indexOf('marca');
        const categoryIdx = headers.indexOf('categoría');

        if (nameIdx === -1 || priceSaleIdx === -1 || stockIdx === -1 || brandIdx === -1 || categoryIdx === -1) {
          toast.error('Columnas obligatorias faltantes en el CSV. Asegúrate de incluir: Nombre, Precio Venta, Stock, Marca, Categoría.');
          return;
        }

        toast.loading('Importando productos...', { id: 'import-toast' });

        const [bRes, cRes] = await Promise.all([
          fetch('/api/brands'),
          fetch('/api/categories')
        ]);
        
        let currentBrands = await bRes.ok ? await bRes.json() : [];
        let currentCategories = await cRes.ok ? await cRes.json() : [];

        let successCount = 0;
        let errorCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i];
          if (row.length <= 1) continue;

          const name = row[nameIdx]?.trim();
          if (!name) continue;

          const sku = skuIdx !== -1 ? row[skuIdx]?.trim() || null : null;
          const description = descIdx !== -1 ? row[descIdx]?.trim() || null : null;
          const pricePurchase = pricePurchaseIdx !== -1 ? row[pricePurchaseIdx]?.trim() || '' : '';
          const priceSale = parseFloat(row[priceSaleIdx]);
          const quantityStock = parseInt(row[stockIdx]) || 0;
          const stockMinAlert = stockMinIdx !== -1 ? parseInt(row[stockMinIdx]) || null : null;
          const brandName = row[brandIdx]?.trim();
          const categoryName = row[categoryIdx]?.trim();

          if (!brandName || !categoryName || isNaN(priceSale)) {
            errorCount++;
            continue;
          }

          let brand = currentBrands.find((b: any) => b.name.toLowerCase() === brandName.toLowerCase());
          if (!brand) {
            const createRes = await fetch('/api/brands', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: brandName })
            });
            if (createRes.ok) {
              brand = await createRes.json();
              currentBrands.push(brand);
            } else {
              errorCount++;
              continue;
            }
          }

          let category = currentCategories.find((c: any) => c.name.toLowerCase() === categoryName.toLowerCase());
          if (!category) {
            const createRes = await fetch('/api/categories', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: categoryName })
            });
            if (createRes.ok) {
              category = await createRes.json();
              currentCategories.push(category);
            } else {
              errorCount++;
              continue;
            }
          }

          const productData = {
            name,
            sku,
            description,
            pricePurchase,
            priceSale,
            quantityStock,
            stockMinAlert,
            brandId: brand.id,
            categoryId: category.id
          };

          const pRes = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
          });

          if (pRes.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        }

        toast.dismiss('import-toast');
        toast.success(`Importación finalizada. Creados: ${successCount}. Errores/Omitidos: ${errorCount}`);
        fetchProducts();
      } catch (err) {
        toast.dismiss('import-toast');
        toast.error('Error al procesar el archivo CSV.');
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
            <h3 className="text-lg font-medium text-foreground flex items-center">
              <Filter size={18} className="mr-2 text-primary" /> Filtros y Búsqueda
            </h3>
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleExportCSV}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Exportar CSV
              </Button>
              <label className="flex items-center justify-center h-8 px-3 text-xs font-medium rounded-md border border-input bg-background hover:bg-muted text-foreground transition-colors cursor-pointer">
                Importar CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  className="hidden"
                />
              </label>
            </div>
          </div>
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