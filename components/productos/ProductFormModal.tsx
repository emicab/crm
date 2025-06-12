// components/productos/ProductFormModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import type { Brand, Category, Product } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Loader2, X } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (newProduct: Product) => void; // Callback para devolver el producto creado
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, onProductCreated }) => {
  const [formData, setFormData] = useState({
    name: '', sku: '', brandId: '', categoryId: '', priceSale: '', pricePurchase: ''
  });
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar Marcas y Categorías para los desplegables del modal
  useEffect(() => {
    if (isOpen) {
      const fetchDropdownData = async () => {
        try {
          const [brandsRes, categoriesRes] = await Promise.all([
            fetch('/api/brands'),
            fetch('/api/categories'),
          ]);
          setBrands(await brandsRes.json());
          setCategories(await categoriesRes.json());
        } catch (error) {
          toast.error("Error al cargar marcas y categorías.");
        }
      };
      fetchDropdownData();
    }
  }, [isOpen]); // Se ejecuta cada vez que se abre el modal

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.name || !formData.brandId || !formData.categoryId || !formData.priceSale) {
      toast.error("Nombre, Marca, Categoría y Precio de Venta son obligatorios.");
      setIsLoading(false);
      return;
    }
    
    // El stock inicial será 0, ya que se añadirá en el formulario de compra
    const dataToSend = {
      ...formData,
      quantityStock: 0, 
      priceSale: parseFloat(formData.priceSale),
      pricePurchase: formData.pricePurchase ? parseFloat(formData.pricePurchase) : 0,
      brandId: parseInt(formData.brandId),
      categoryId: parseInt(formData.categoryId),
    };

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'No se pudo crear el producto.');
      }
      
      const newProduct = await response.json();
      toast.success(`Producto "${newProduct.name}" creado exitosamente.`);
      onProductCreated(newProduct); // Llama al callback con el nuevo producto
      onClose(); // Cierra el modal
      setFormData({ name: '', sku: '', brandId: '', categoryId: '', priceSale: '', pricePurchase: '' }); // Resetea el form

    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="bg-muted text-foreground rounded-lg shadow-xl w-full max-w-lg m-4" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmit}>
              <div className="flex justify-between items-center p-4 border-b border-border">
                <h2 className="text-xl font-semibold">Crear Nuevo Producto</h2>
                <Button type="button" variant="ghost" size="icon" onClick={onClose}><X size={20} /></Button>
              </div>
              <div className="p-6 space-y-4">
                <Input label="Nombre del Producto *" name="name" value={formData.name} onChange={handleChange} required />
                <Input label="SKU (Opcional)" name="sku" value={formData.sku} onChange={handleChange} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select label="Marca *" name="brandId" value={formData.brandId} onChange={handleChange} required>
                    <option value="">Selecciona una marca</option>
                    {brands.map(brand => <option key={brand.id} value={String(brand.id)}>{brand.name}</option>)}
                  </Select>
                  <Select label="Categoría *" name="categoryId" value={formData.categoryId} onChange={handleChange} required>
                    <option value="">Selecciona una categoría</option>
                    {categories.map(category => <option key={category.id} value={String(category.id)}>{category.name}</option>)}
                  </Select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Precio de Compra (Costo)" name="pricePurchase" type="number" step="0.01" value={formData.pricePurchase} onChange={handleChange} />
                    <Input label="Precio de Venta *" name="priceSale" type="number" step="0.01" value={formData.priceSale} onChange={handleChange} required />
                </div>
              </div>
              <div className="bg-background px-6 py-3 flex justify-end space-x-3 rounded-b-lg">
                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                <Button type="submit" variant="primary" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : "Crear Producto"}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProductFormModal;