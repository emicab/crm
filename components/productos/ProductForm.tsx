
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Brand, Category, Product } from '@/types'; 
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Loader2, AlertCircle } from 'lucide-react';

interface ProductFormData {
  name: string;
  sku: string;
  description: string;
  pricePurchase: string;
  priceSale: string;
  quantityStock: string;
  stockMinAlert: string;
  brandId: string;
  categoryId: string;
}


interface ProductFormProps {
  initialProductData?: Product | null;
}

const ProductForm: React.FC<ProductFormProps> = ({ initialProductData }) => {
  const router = useRouter();
  const [formData, setFormData] = useState<ProductFormData>({
    name: '', sku: '', description: '', pricePurchase: '', priceSale: '',
    quantityStock: '', stockMinAlert: '', brandId: '', categoryId: '',
  });
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingDropdowns, setIsFetchingDropdowns] = useState(true); 
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  
  useEffect(() => {
    const fetchData = async () => {
      setIsFetchingDropdowns(true);
      try {
        const [brandsRes, categoriesRes] = await Promise.all([
          fetch('/api/brands'),
          fetch('/api/categories'),
        ]);
        if (!brandsRes.ok || !categoriesRes.ok) {
          throw new Error('Error al cargar datos para el formulario.');
        }
        const brandsData = await brandsRes.json();
        const categoriesData = await categoriesRes.json();
        setBrands(brandsData);
        setCategories(categoriesData);
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
        
        pricePurchase: initialProductData.pricePurchase !== null && initialProductData.pricePurchase !== undefined ? String(initialProductData.pricePurchase) : '',
        priceSale: String(initialProductData.priceSale) || '', 
        quantityStock: String(initialProductData.quantityStock) || '', 
        stockMinAlert: initialProductData.stockMinAlert !== null && initialProductData.stockMinAlert !== undefined ? String(initialProductData.stockMinAlert) : '',
        brandId: String(initialProductData.brandId) || '',
        categoryId: String(initialProductData.categoryId) || '',
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

    if (!formData.name || !formData.brandId || !formData.categoryId || !formData.priceSale || !formData.quantityStock) {
      setError('Por favor, completa todos los campos obligatorios (Nombre, Marca, Categoría, Precio Venta, Stock).');
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
        
        pricePurchase: formData.pricePurchase ? parseFloat(formData.pricePurchase) : null, 
        priceSale: parseFloat(formData.priceSale), 
        quantityStock: parseInt(formData.quantityStock), 
        
        stockMinAlert: formData.stockMinAlert ? parseInt(formData.stockMinAlert) : null,
        brandId: parseInt(formData.brandId), 
        categoryId: parseInt(formData.categoryId), 
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
            name: '', sku: '', description: '', pricePurchase: '', priceSale: '',
            quantityStock: '', stockMinAlert: '', brandId: '', categoryId: '',
        });
      }

      /* setTimeout(() => {
        router.push('/productos'); 
        router.refresh();
      }, 1500); */

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
          id="description"
          name="description"
          rows={3}
          value={formData.description}
          onChange={handleChange}
          className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Select label="Marca *" name="brandId" value={formData.brandId} onChange={handleChange} required disabled={isFetchingDropdowns}>
          <option value="">{isFetchingDropdowns ? 'Cargando...' : 'Selecciona una marca'}</option>
          {brands.map(brand => <option key={brand.id} value={String(brand.id)}>{brand.name}</option>)}
        </Select>
        <Select label="Categoría *" name="categoryId" value={formData.categoryId} onChange={handleChange} required disabled={isFetchingDropdowns}>
          <option value="">{isFetchingDropdowns ? 'Cargando...' : 'Selecciona una categoría'}</option>
          {categories.map(category => <option key={category.id} value={String(category.id)}>{category.name}</option>)}
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input label="Precio de Compra" name="pricePurchase" type="number" step="0.01" value={formData.pricePurchase} onChange={handleChange} />
        <Input label="Precio de Venta *" name="priceSale" type="number" step="0.01" value={formData.priceSale} onChange={handleChange} required />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input label="Cantidad en Stock *" name="quantityStock" type="number" step="1" value={formData.quantityStock} onChange={handleChange} required />
        <Input label="Alerta Stock Mínimo (Opcional)" name="stockMinAlert" type="number" step="1" value={formData.stockMinAlert} onChange={handleChange} />
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
  );
};

export default ProductForm;