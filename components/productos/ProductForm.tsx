
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Brand, Category, Supplier, Product } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Loader2, AlertCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

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
  supplierId: string;
}


interface ProductFormProps {
  initialProductData?: Product | null;
}

const ProductForm: React.FC<ProductFormProps> = ({ initialProductData }) => {
  const router = useRouter();
  const [formData, setFormData] = useState<ProductFormData>({
    name: '', sku: '', description: '', pricePurchase: '', priceSale: '',
    quantityStock: '', stockMinAlert: '', brandId: '', categoryId: '', supplierId: '',
  });
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingDropdowns, setIsFetchingDropdowns] = useState(true); 
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados para creación rápida de Marca y Categoría
  const [showNewBrandModal, setShowNewBrandModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);

  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    setIsCreatingBrand(true);
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBrandName.trim() }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al crear la marca.');
      }
      const createdBrand = await res.json();
      setBrands(prev => [...prev, createdBrand].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData(prev => ({ ...prev, brandId: String(createdBrand.id) }));
      toast.success('¡Marca creada exitosamente!');
      setShowNewBrandModal(false);
      setNewBrandName('');
    } catch (err: any) {
      toast.error(err.message || 'Error al crear la marca.');
    } finally {
      setIsCreatingBrand(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setIsCreatingCategory(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al crear la categoría.');
      }
      const createdCategory = await res.json();
      setCategories(prev => [...prev, createdCategory].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData(prev => ({ ...prev, categoryId: String(createdCategory.id) }));
      toast.success('¡Categoría creada exitosamente!');
      setShowNewCategoryModal(false);
      setNewCategoryName('');
    } catch (err: any) {
      toast.error(err.message || 'Error al crear la categoría.');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  
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
        
        pricePurchase: initialProductData.pricePurchase !== null && initialProductData.pricePurchase !== undefined ? String(initialProductData.pricePurchase) : '',
        priceSale: String(initialProductData.priceSale) || '', 
        quantityStock: String(initialProductData.quantityStock) || '', 
        stockMinAlert: initialProductData.stockMinAlert !== null && initialProductData.stockMinAlert !== undefined ? String(initialProductData.stockMinAlert) : '',
        brandId: String(initialProductData.brandId) || '',
        categoryId: String(initialProductData.categoryId) || '',
        supplierId: initialProductData.supplierId ? String(initialProductData.supplierId) : '',
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
        supplierId: formData.supplierId ? parseInt(formData.supplierId) : null,
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
            quantityStock: '', stockMinAlert: '', brandId: '', categoryId: '', supplierId: '',
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
          id="description"
          name="description"
          rows={3}
          value={formData.description}
          onChange={handleChange}
          className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Select label="Marca *" name="brandId" value={formData.brandId} onChange={handleChange} required disabled={isFetchingDropdowns}>
            <option value="">{isFetchingDropdowns ? 'Cargando...' : 'Selecciona una marca'}</option>
            {brands.map(brand => <option key={brand.id} value={String(brand.id)}>{brand.name}</option>)}
          </Select>
          <button
            type="button"
            onClick={() => setShowNewBrandModal(true)}
            className="mt-1 text-xs text-primary hover:underline flex items-center"
          >
            + Nueva Marca
          </button>
        </div>
        <div>
          <Select label="Categoría *" name="categoryId" value={formData.categoryId} onChange={handleChange} required disabled={isFetchingDropdowns}>
            <option value="">{isFetchingDropdowns ? 'Cargando...' : 'Selecciona una categoría'}</option>
            {categories.map(category => <option key={category.id} value={String(category.id)}>{category.name}</option>)}
          </Select>
          <button
            type="button"
            onClick={() => setShowNewCategoryModal(true)}
            className="mt-1 text-xs text-primary hover:underline flex items-center"
          >
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

      {/* Modal para crear marca rápida */}
      <AnimatePresence>
        {showNewBrandModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowNewBrandModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-muted text-foreground rounded-lg shadow-xl w-full max-w-md m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleCreateBrand}>
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-foreground">
                      Nueva Marca
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowNewBrandModal(false)}
                      className="p-1 rounded-full hover:bg-border transition-colors text-foreground-muted hover:text-foreground"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <Input
                      label="Nombre de la Marca *"
                      type="text"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <div className="bg-background px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 rounded-b-lg gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isCreatingBrand}
                    className="w-full sm:w-auto"
                  >
                    {isCreatingBrand ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                    Guardar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewBrandModal(false)}
                    disabled={isCreatingBrand}
                    className="w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal para crear categoría rápida */}
      <AnimatePresence>
        {showNewCategoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowNewCategoryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-muted text-foreground rounded-lg shadow-xl w-full max-w-md m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleCreateCategory}>
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-foreground">
                      Nueva Categoría
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowNewCategoryModal(false)}
                      className="p-1 rounded-full hover:bg-border transition-colors text-foreground-muted hover:text-foreground"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <Input
                      label="Nombre de la Categoría *"
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <div className="bg-background px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 rounded-b-lg gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isCreatingCategory}
                    className="w-full sm:w-auto"
                  >
                    {isCreatingCategory ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                    Guardar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewCategoryModal(false)}
                    disabled={isCreatingCategory}
                    className="w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProductForm;