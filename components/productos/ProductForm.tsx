"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Brand, Category, Supplier, Product } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Loader2, AlertCircle, Upload, Search, Image as ImageIcon, Check, X } from 'lucide-react';
import { useQuickCreate } from '@/hooks/useQuickCreate';
import QuickCreateModal from './QuickCreateModal';
import toast from 'react-hot-toast';

interface ProductFormData {
  name: string;
  sku: string;
  description: string;
  imageUrl: string;
  pricePurchase: string;
  priceSale: string;
  quantityStock: string;
  stockMinAlert: string;
  brandId: string;
  categoryId: string;
  supplierId: string;
  unitType: string;
}

interface ProductFormProps {
  initialProductData?: Product | null;
}

const ProductForm: React.FC<ProductFormProps> = ({ initialProductData }) => {
  const router = useRouter();
  const [formData, setFormData] = useState<ProductFormData>({
    name: '', sku: '', description: '', imageUrl: '', pricePurchase: '', priceSale: '',
    quantityStock: '', stockMinAlert: '', brandId: '', categoryId: '', supplierId: '',
    unitType: '',
  });
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingDropdowns, setIsFetchingDropdowns] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSearchingML, setIsSearchingML] = useState(false);
  const [mlCandidates, setMlCandidates] = useState<Array<{ id: string; title: string; imageUrl: string; thumbnail: string }>>([]);
  const [isMLModalOpen, setIsMLModalOpen] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const toastId = toast.loading('Procesando imagen...');
      try {
        const cloudRes = await fetch('/api/upload/cloudinary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: dataUrl }),
        });

        const cloudData = await cloudRes.json();
        if (cloudRes.ok && cloudData.url) {
          setFormData(prev => ({ ...prev, imageUrl: cloudData.url }));
          toast.success('Imagen subida a Cloudinary exitosamente.', { id: toastId });
        } else {
          setFormData(prev => ({ ...prev, imageUrl: dataUrl }));
          toast.success('Imagen cargada desde tu PC (Vista previa).', { id: toastId });
        }
      } catch {
        setFormData(prev => ({ ...prev, imageUrl: dataUrl }));
        toast.success('Imagen cargada desde tu PC.', { id: toastId });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSearchMLImage = async () => {
    const searchQuery = formData.name || formData.sku;
    if (!searchQuery.trim()) {
      toast.error('Ingresa el Nombre del producto para buscar su foto.');
      return;
    }

    setIsSearchingML(true);
    try {
      const res = await fetch(`/api/products/search-image?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'No se encontraron imágenes.');
      }

      if (data.candidates && data.candidates.length > 0) {
        setMlCandidates(data.candidates);
        setIsMLModalOpen(true);
        toast.success(`Se encontraron ${data.candidates.length} fotos en Mercado Libre.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al buscar foto.');
    } finally {
      setIsSearchingML(false);
    }
  };

  const brandQuickCreate = useQuickCreate({
    apiEndpoint: '/api/brands',
    label: 'marca',
    onCreated: (created) => setBrands(prev => [...prev, created as Brand].sort((a, b) => a.name.localeCompare(b.name))),
    onFieldSelect: (id) => setFormData(prev => ({ ...prev, brandId: id })),
  });

  const categoryQuickCreate = useQuickCreate({
    apiEndpoint: '/api/categories',
    label: 'categoría',
    onCreated: (created) => setCategories(prev => [...prev, created as Category].sort((a, b) => a.name.localeCompare(b.name))),
    onFieldSelect: (id) => setFormData(prev => ({ ...prev, categoryId: id })),
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsFetchingDropdowns(true);
      try {
        const [brandsRes, categoriesRes, suppliersRes] = await Promise.all([
          fetch('/api/brands'),
          fetch('/api/categories'),
          fetch('/api/proveedores'),
        ]);
        if (!brandsRes.ok || !categoriesRes.ok || !suppliersRes.ok) {
          throw new Error('Error al cargar datos para el formulario.');
        }
        const brandsData = await brandsRes.json();
        const categoriesData = await categoriesRes.json();
        const suppliersData = await suppliersRes.json();
        setBrands(brandsData);
        setCategories(categoriesData);
        setSuppliers(suppliersData);
      } catch (err: any) {
        setError(err.message || 'Error cargando datos.');
      } finally {
        setIsFetchingDropdowns(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (initialProductData) {
      setFormData({
        name: initialProductData.name || '',
        sku: initialProductData.sku || '',
        description: initialProductData.description || '',
        imageUrl: initialProductData.imageUrl || '',
        pricePurchase: initialProductData.pricePurchase !== null && initialProductData.pricePurchase !== undefined ? String(initialProductData.pricePurchase) : '',
        priceSale: String(initialProductData.priceSale) || '',
        quantityStock: String(initialProductData.quantityStock) || '',
        stockMinAlert: initialProductData.stockMinAlert !== null && initialProductData.stockMinAlert !== undefined ? String(initialProductData.stockMinAlert) : '',
        brandId: String(initialProductData.brandId) || '',
        categoryId: String(initialProductData.categoryId) || '',
        supplierId: initialProductData.supplierId ? String(initialProductData.supplierId) : '',
        unitType: initialProductData.unitType || '',
      });
    }
  }, [initialProductData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!formData.name || !formData.brandId || !formData.categoryId || !formData.priceSale || !formData.quantityStock || !formData.unitType) {
      setError('Por favor, completa todos los campos obligatorios (Nombre, Marca, Categoría, Tipo de Unidad, Precio Venta, Stock).');
      setIsLoading(false);
      return;
    }

    const method = initialProductData ? 'PUT' : 'POST';
    const apiUrl = initialProductData
      ? `/api/products/${initialProductData.id}`
      : '/api/products';

    const dataToSend = {
        name: formData.name,
        sku: formData.sku || null,
        description: formData.description || null,
        imageUrl: formData.imageUrl || null,
        pricePurchase: formData.pricePurchase ? parseFloat(formData.pricePurchase) : null,
        priceSale: parseFloat(formData.priceSale),
        quantityStock: parseFloat(formData.quantityStock),
        stockMinAlert: formData.stockMinAlert ? parseFloat(formData.stockMinAlert) : null,
        brandId: parseInt(formData.brandId),
        categoryId: parseInt(formData.categoryId),
        supplierId: formData.supplierId ? parseInt(formData.supplierId) : null,
        unitType: formData.unitType || null,
    };
    try {
      const response = await fetch(apiUrl, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      setSuccessMessage(initialProductData ? '¡Producto actualizado exitosamente!' : '¡Producto creado exitosamente!');

      if (!initialProductData) {
        setFormData({
            name: '', sku: '', description: '', imageUrl: '', pricePurchase: '', priceSale: '',
            quantityStock: '', stockMinAlert: '', brandId: '', categoryId: '', supplierId: '',
            unitType: '',
        });
      }

      setTimeout(() => {
        router.push('/productos');
        router.refresh();
      }, 1500);

    } catch (err: any) {
      setError(err.message || `Ocurrió un error al ${initialProductData ? 'actualizar' : 'crear'} el producto.`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingDropdowns && !initialProductData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={24} className="animate-spin text-primary mr-2" />
        Cargando datos del formulario...
      </div>
    );
  }

  const submitButtonText = initialProductData ? 'Actualizar Producto' : 'Guardar Producto';
  const loadingButtonText = initialProductData ? 'Actualizando...' : 'Guardando...';

  return (
    <>
    <form onSubmit={handleSubmit} className="bg-muted p-6 sm:p-8 rounded-lg shadow space-y-6 max-w-2xl mx-auto">
      {error && (
        <div className="flex items-center bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          <AlertCircle size={18} className="mr-2" /> {error}
        </div>
      )}
      {successMessage && (
        <div className="flex items-center bg-success/10 text-success text-sm p-3 rounded-md">
          <AlertCircle size={18} className="mr-2" /> {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input label="Nombre del Producto *" name="name" value={formData.name} onChange={handleChange} required />
        <Input label="SKU (Opcional)" name="sku" value={formData.sku} onChange={handleChange} />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-foreground-muted mb-1.5">Descripción (Opcional)</label>
        <textarea
          id="description" name="description" rows={3} value={formData.description} onChange={handleChange}
          className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Sección de Imagen de Producto */}
      <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="block text-sm font-semibold text-foreground">
            Imagen del Producto (para Tienda Web)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              title="Cargar una foto guardada en tu computadora"
              className="text-xs flex items-center gap-1.5"
            >
              <Upload size={14} /> Subir desde PC
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSearchMLImage}
              disabled={isSearchingML || (!formData.name && !formData.sku)}
              title="Buscar foto oficial automáticamente en Mercado Libre por nombre"
              className="text-xs flex items-center gap-1.5 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
            >
              {isSearchingML ? (
                <Loader2 size={14} className="animate-spin text-amber-700" />
              ) : (
                <Search size={14} className="text-amber-700" />
              )}
              {isSearchingML ? "Buscando..." : "🔍 Buscar Foto en Mercado Libre"}
            </Button>
          </div>
        </div>

        <Input
          label=""
          name="imageUrl"
          placeholder="O pega directamente la URL de la imagen (https://...)"
          value={formData.imageUrl}
          onChange={handleChange}
        />

        {formData.imageUrl && (
          <div className="flex items-center justify-between gap-3 bg-background p-3 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <img
                src={formData.imageUrl}
                alt="Vista previa del producto"
                className="w-16 h-16 object-cover rounded-md border border-border"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <div>
                <p className="text-xs font-semibold text-foreground">Vista previa lista</p>
                <p className="text-[11px] text-foreground-muted truncate max-w-xs">
                  {formData.imageUrl.startsWith("data:")
                    ? "Imagen cargada desde tu PC"
                    : formData.imageUrl}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFormData((prev) => ({ ...prev, imageUrl: "" }))}
              className="text-xs text-destructive hover:bg-destructive/10"
              title="Quitar foto"
            >
              <X size={16} /> Quitar
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Select label="Marca *" name="brandId" value={formData.brandId} onChange={handleChange} required disabled={isFetchingDropdowns}>
            <option value="">{isFetchingDropdowns ? 'Cargando...' : 'Selecciona una marca'}</option>
            {brands.map(brand => <option key={brand.id} value={String(brand.id)}>{brand.name}</option>)}
          </Select>
          <button type="button" onClick={() => brandQuickCreate.setIsOpen(true)} className="mt-1 text-xs text-primary hover:underline flex items-center">
            + Nueva Marca
          </button>
        </div>
        <div>
          <Select label="Categoría *" name="categoryId" value={formData.categoryId} onChange={handleChange} required disabled={isFetchingDropdowns}>
            <option value="">{isFetchingDropdowns ? 'Cargando...' : 'Selecciona una categoría'}</option>
            {categories.map(category => <option key={category.id} value={String(category.id)}>{category.name}</option>)}
          </Select>
          <button type="button" onClick={() => categoryQuickCreate.setIsOpen(true)} className="mt-1 text-xs text-primary hover:underline flex items-center">
            + Nueva Categoría
          </button>
        </div>
      </div>

      <Select label="Proveedor (Opcional)" name="supplierId" value={formData.supplierId} onChange={handleChange} disabled={isFetchingDropdowns}>
        <option value="">{isFetchingDropdowns ? 'Cargando...' : 'Sin proveedor'}</option>
        {suppliers.map(supplier => <option key={supplier.id} value={String(supplier.id)}>{supplier.name}</option>)}
      </Select>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input label="Precio de Compra" name="pricePurchase" type="number" step="0.01" value={formData.pricePurchase} onChange={handleChange} />
        <Input label="Precio de Venta *" name="priceSale" type="number" step="0.01" value={formData.priceSale} onChange={handleChange} required />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Select label="Tipo de Unidad *" name="unitType" value={formData.unitType} onChange={handleChange} required>
          <option value="">Seleccionar...</option>
          <option value="UNIT">Unidad</option>
          <option value="WEIGHT">Peso (kg)</option>
          <option value="VOLUME">Volumen (L)</option>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input label={`Cantidad en Stock * ${formData.unitType === 'WEIGHT' ? '(kg)' : formData.unitType === 'VOLUME' ? '(L)' : ''}`} name="quantityStock" type="number" step="0.001" value={formData.quantityStock} onChange={handleChange} required />
        <Input label={`Alerta Stock Mínimo ${formData.unitType === 'WEIGHT' ? '(kg)' : formData.unitType === 'VOLUME' ? '(L)' : '(Opcional)'}`} name="stockMinAlert" type="number" step="0.001" value={formData.stockMinAlert} onChange={handleChange} />
      </div>

      <div className="flex justify-end pt-4">
        <Button type="button" variant="outline" onClick={() => router.push('/productos')} className="mr-3" disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
          {isLoading ? loadingButtonText : submitButtonText}
        </Button>
      </div>
    </form>

      <QuickCreateModal
        isOpen={brandQuickCreate.isOpen}
        title="Nueva Marca"
        value={brandQuickCreate.name}
        isLoading={brandQuickCreate.isCreating}
        onChange={brandQuickCreate.setName}
        onSubmit={brandQuickCreate.handleCreate}
        onClose={() => brandQuickCreate.setIsOpen(false)}
      />

      <QuickCreateModal
        isOpen={categoryQuickCreate.isOpen}
        title="Nueva Categoría"
        value={categoryQuickCreate.name}
        isLoading={categoryQuickCreate.isCreating}
        onChange={categoryQuickCreate.setName}
        onSubmit={categoryQuickCreate.handleCreate}
        onClose={() => categoryQuickCreate.setIsOpen(false)}
      />

      {/* Modal Selector de Fotos de Mercado Libre */}
      {isMLModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                🔍 Imágenes Encontradas en Mercado Libre
              </h3>
              <button
                type="button"
                onClick={() => setIsMLModalOpen(false)}
                className="text-foreground-muted hover:text-foreground p-1"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-foreground-muted">
              Selecciona la foto oficial que quieras usar para <strong className="text-foreground">&quot;{formData.name}&quot;</strong>:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-1">
              {mlCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, imageUrl: candidate.imageUrl }));
                    setIsMLModalOpen(false);
                    toast.success("Foto oficial asignada al producto.");
                  }}
                  className="group relative bg-muted/40 border border-border hover:border-primary rounded-lg p-2 flex flex-col items-center justify-between text-center cursor-pointer transition-all hover:shadow-md"
                >
                  <img
                    src={candidate.imageUrl || candidate.thumbnail}
                    alt={candidate.title}
                    className="w-20 h-20 object-contain rounded mb-2 group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = candidate.thumbnail;
                    }}
                  />
                  <p className="text-[11px] font-medium text-foreground line-clamp-2 leading-tight">
                    {candidate.title}
                  </p>
                  <span className="mt-2 w-full py-1 text-[10px] font-bold bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white rounded transition-colors">
                    Usar esta foto
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-3 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsMLModalOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductForm;
