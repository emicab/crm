"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { Product, Brand, Category, Supplier } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Edit3, Trash2, Loader2, AlertCircle, Filter, X, Users, ChevronLeft, ChevronRight } from 'lucide-react';
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

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBatchSupplierModalOpen, setIsBatchSupplierModalOpen] = useState(false);
  const [batchSupplierId, setBatchSupplierId] = useState('');
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  // --- Estados para los filtros ---
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

  // Cargar las opciones para los desplegables de filtro una sola vez al montar el componente
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
            // Mostrar un error no crítico si solo fallan las opciones de filtro
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
      // Paginated response: { data, pagination }
      // Non-paginated: array (backward compat)
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

  // Debounce search field changes; fire instantly for selects (brand, category, supplier)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProducts(1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters]);

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
      { key: 'categoryName', label: 'Categoría' },
      { key: 'supplierName', label: 'Proveedor' },
    ];
    const dataToExport = products.map(p => ({
      ...p,
      brandName: p.brand?.name || '',
      categoryName: p.category?.name || '',
      supplierName: p.supplier?.name || '',
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

        const rawHeaders = lines[0].map(h => h.trim());
        const headers = rawHeaders.map(h => h.toLowerCase().replace(/[^a-záéíóúñ]/g, ''));

        const findCol = (aliases: string[]): number => {
          for (const a of aliases) {
            const clean = a.toLowerCase().replace(/[^a-záéíóúñ]/g, '');
            const idx = headers.indexOf(clean);
            if (idx !== -1) return idx;
          }
          return -1;
        };

        const nameIdx = findCol(['nombre', 'descripcion', 'producto', 'descripción']);
        const skuIdx = findCol(['sku', 'codigo', 'código', 'code']);
        const descIdx = findCol(['descripción', 'descripcion', 'observaciones', 'notas']);
        const pricePurchaseIdx = findCol(['preciocompra', 'preciocompra', 'costo', 'preciodecosto', 'cost']);
        const priceSaleIdx = findCol(['precioventa', 'precioventa', 'precio', 'price', 'preciodeventa']);
        const stockIdx = findCol(['stock', 'cantidad', 'existencia', 'quantity']);
        const stockMinIdx = findCol(['stockminimo', 'stockmínimo', 'alertastockmínimo', 'alertastockminimo', 'stockmin']);
        const brandIdx = findCol(['marca', 'brand', 'marc']);
        const categoryIdx = findCol(['categoría', 'categoria', 'rubro', 'category', 'categ']);

        if (nameIdx === -1 || priceSaleIdx === -1 || stockIdx === -1) {
          toast.error('No se encontraron columnas obligatorias. El CSV debe tener: Nombre/Descripción, Precio y Stock. Columnas detectadas: ' + rawHeaders.join(', '));
          return;
        }

        toast.loading('Importando productos...', { id: 'import-toast' });

        const [bRes, cRes] = await Promise.all([
          fetch('/api/brands'),
          fetch('/api/categories')
        ]);
        
        const currentBrands = await bRes.ok ? await bRes.json() : [];
        const currentCategories = await cRes.ok ? await cRes.json() : [];

        let successCount = 0;
        let errorCount = 0;
        let duplicateCount = 0;
        
        // Mapa para recordar categorías asociadas a su ID (útil si faltan en filas posteriores)
        const categoryIdToName: Record<string, string> = {};

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i];
          if (row.length <= 1) continue;

          const name = row[nameIdx]?.trim();
          if (!name) continue;

          const sku = skuIdx !== -1 ? row[skuIdx]?.trim() || null : null;
          const description = descIdx !== -1 ? row[descIdx]?.trim() || null : null;
          const pricePurchase = pricePurchaseIdx !== -1 ? row[pricePurchaseIdx]?.trim() || '' : '';
          const priceSale = parseFloat(row[priceSaleIdx]?.replace(',', '.'));
          const quantityStock = parseInt(row[stockIdx]) || 0;
          const stockMinAlert = stockMinIdx !== -1 ? parseInt(row[stockMinIdx]) || null : null;
          
          const rawIdRubro = row[6]?.trim();
          const rawRubro = categoryIdx !== -1 ? row[categoryIdx]?.trim() : '';
          
          if (rawIdRubro && rawRubro) {
            categoryIdToName[rawIdRubro] = rawRubro;
          }
          
          const resolvedCategory = rawRubro || (rawIdRubro ? categoryIdToName[rawIdRubro] : '') || 'General';

          const brandName = brandIdx !== -1 ? (row[brandIdx]?.trim() || 'Genérica') : 'Genérica';
          const categoryName = resolvedCategory;

          if (isNaN(priceSale)) { errorCount++; continue; }

          // Verificar SKU duplicado
          if (sku) {
            const dupRes = await fetch(`/api/products?search=${encodeURIComponent(sku)}`);
            if (dupRes.ok) {
              const dupData = await dupRes.json();
              const found = Array.isArray(dupData) ? dupData.find((p: any) => p.sku === sku) : dupData.data?.find((p: any) => p.sku === sku);
              if (found) { duplicateCount++; continue; }
            }
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
            pricePurchase: pricePurchase || 0,
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
        const parts = [`Creados: ${successCount}`];
        if (duplicateCount) parts.push(`Duplicados omitidos: ${duplicateCount}`);
        if (errorCount) parts.push(`Errores: ${errorCount}`);
        toast.success(`Importación finalizada. ${parts.join(' | ')}`);
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

      {isBatchSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-muted text-foreground rounded-lg shadow-xl w-full max-w-md m-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Asignar Proveedor</h3>
            <p className="text-sm text-foreground-muted mb-4">
              Asignar proveedor a {selectedIds.size} producto{selectedIds.size !== 1 ? 's' : ''}.
            </p>
            <Select
              label="Proveedor"
              name="batchSupplierId"
              value={batchSupplierId}
              onChange={(e) => setBatchSupplierId(e.target.value)}
            >
              <option value="">Seleccionar proveedor...</option>
              {suppliers.map(s => (
                <option key={s.id} value={String(s.id)}>{s.name}</option>
              ))}
            </Select>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsBatchSupplierModalOpen(false);
                  setBatchSupplierId('');
                }}
                disabled={isSavingBatch}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleBatchSupplier}
                disabled={isSavingBatch || !batchSupplierId}
              >
                {isSavingBatch ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}

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
            <Select
              name="supplierId"
              value={filters.supplierId}
              onChange={handleFilterChange}
              aria-label="Filtrar por Proveedor"
            >
              <option value="">Todos los Proveedores</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={String(supplier.id)}>
                  {supplier.name}
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
        {selectedIds.size > 0 && (
          <div className="mb-4 p-3 bg-primary/5 border border-primary/30 rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {selectedIds.size} producto{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                <X size={14} className="mr-1" />
                Limpiar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsBatchSupplierModalOpen(true)}
              >
                <Users size={14} className="mr-1" />
                Asignar Proveedor
              </Button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          {/* Tabla para Escritorio (oculta en móvil) */}
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
                                <p className="text-xs text-foreground-muted">Precio Venta</p>
                                <p className="font-semibold text-foreground">{formatCurrency(product.priceSale)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-foreground-muted">Precio Compra</p>
                                <p className="font-semibold text-foreground">{formatCurrency(product.pricePurchase ?? 0)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-foreground-muted">Stock</p>
                                <p className="font-semibold text-foreground">{product.quantityStock}{product.unitType === 'WEIGHT' ? ' kg' : product.unitType === 'VOLUME' ? ' L' : ''}</p>
                            </div>
                            <div className="col-span-1">
                                <p className="text-xs text-foreground-muted">Marca</p>
                                <p className="font-medium text-foreground">{product.brand.name}</p>
                            </div>
                             <div className="col-span-1 text-right">
                                <p className="text-xs text-foreground-muted">Categoría</p>
                                <p className="font-medium text-foreground">{product.category.name}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-xs text-foreground-muted">Proveedor</p>
                                <p className="font-medium text-foreground">{product.supplier?.name || '-'}</p>
                            </div>
                        </div>
                    </div>
                ))
            )}
          </div>
        </div>
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border mt-4">
            <p className="text-sm text-foreground-muted whitespace-nowrap">
              {totalProducts} producto{totalProducts !== 1 ? 's' : ''} · Página {page} de {totalPages}
            </p>
            <div className="flex items-center gap-1 flex-wrap justify-center">
              <Button variant="outline" size="sm" onClick={() => handlePageChange(page - 1)} disabled={page <= 1}>
                <ChevronLeft size={16} />
              </Button>
              {(() => {
                const pages: (number | string)[] = [];
                const range = 1;
                const first = 1;
                const last = totalPages;
                const left = Math.max(first, page - range);
                const right = Math.min(last, page + range);
                if (left > first + 1) pages.push(first, 'left-ellipsis');
                else if (left === first + 1) pages.push(first);
                for (let i = left; i <= right; i++) pages.push(i);
                if (right < last - 1) pages.push('right-ellipsis', last);
                else if (right === last - 1) pages.push(last);
                return pages.map((p) =>
                  typeof p === 'string' ? (
                    <span key={p} className="px-1 text-foreground-muted text-sm">...</span>
                  ) : (
                    <Button key={p} variant={p === page ? 'primary' : 'outline'} size="sm" onClick={() => handlePageChange(p)} className="min-w-[32px]">{p}</Button>
                  )
                );
              })()}
              <Button variant="outline" size="sm" onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}>
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ProductTable;