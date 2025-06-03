// components/ventas/SaleForm.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Client, Seller, Product, PaymentTypeEnum } from '@/types';

import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import { Loader2, AlertCircle, PlusCircle, XCircle, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { getPaymentTypeDisplay } from '@/lib/displayTexts';

// Estado para el ítem individual que se está configurando para añadir a la venta
interface CurrentItemState {
  productId: string;
  productName: string;
  quantity: number;
  priceAtSale: number;
  availableStock: number;
}

const initialCurrentItemState: CurrentItemState = {
  productId: '',
  productName: '',
  quantity: 1,
  priceAtSale: 0,
  availableStock: 0,
};

// Interfaz para los ítems en el carrito de la venta (formData.items)
interface SaleItemInCart extends CurrentItemState {
  tempId: number; // ID temporal para la key en la lista y para eliminar
  subtotal: number;
}

interface SaleFormData {
  clientId: string;
  sellerId: string;
  paymentType: PaymentTypeEnum | '';
  notes: string;
  items: SaleItemInCart[];
  discountCode: string;
}

const initialFormData: SaleFormData = {
  clientId: '',
  sellerId: '',
  paymentType: '',
  notes: '',
  items: [],
  discountCode: '',
};

const SaleForm = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<SaleFormData>(initialFormData);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]); 

  const [isLoading, setIsLoading] = useState(false); 
  const [isFetchingInitialData, setIsFetchingInitialData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [searchedProducts, setSearchedProducts] = useState<Product[]>([]);
  const [currentItem, setCurrentItem] = useState<CurrentItemState>(initialCurrentItemState);

  // ... (useEffect para cargar datos iniciales como estaba) ...
  useEffect(() => {
    const fetchData = async () => {
      setIsFetchingInitialData(true);
      try {
        const [clientsRes, sellersRes, productsRes] = await Promise.all([
          fetch('/api/clients'),
          fetch('/api/vendedores'),
          fetch('/api/products'), 
        ]);

        if (!clientsRes.ok || !sellersRes.ok || !productsRes.ok) {
          throw new Error('Error al cargar datos iniciales para el formulario de venta.');
        }
        
        const clientsData = await clientsRes.json();
        const sellersData = await sellersRes.json();
        const productsData = await productsRes.json();

        setClients(clientsData);
        setSellers(sellersData);
        setAllProducts(productsData.map((p: any) => ({
          ...p,
          priceSale: parseFloat(p.priceSale),
          pricePurchase: p.pricePurchase ? parseFloat(p.pricePurchase) : 0,
          quantityStock: parseInt(p.quantityStock)
        })));

      } catch (err: any) {
        setError(err.message || 'Error cargando datos.');
        console.error(err);
      } finally {
        setIsFetchingInitialData(false);
      }
    };
    fetchData();
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccessMessage(null);
  };
  
  const handleProductSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value;
    setProductSearchTerm(searchTerm);
    setItemError(null); 

    if (searchTerm.trim() === '') {
      setSearchedProducts([]);
      return;
    }
    const itemsInCartIds = formData.items.map(item => parseInt(item.productId));
    const filtered = allProducts.filter(product =>
      !itemsInCartIds.includes(product.id) && 
      (product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())))
    );
    setSearchedProducts(filtered.slice(0, 5));
  };

  const handleSelectProduct = (product: Product) => {
    setCurrentItem({
      productId: String(product.id),
      productName: product.name,
      quantity: 1,
      priceAtSale: product.priceSale, 
      availableStock: product.quantityStock,
    });
    setProductSearchTerm(product.name); 
    setSearchedProducts([]); 
  };

  const handleCurrentItemFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setCurrentItem(prev => {
        let processedValue: number | string = value;
        if (name === 'quantity') {
            const intVal = parseInt(value);
            processedValue = isNaN(intVal) ? (value === '' ? '' : prev.quantity) : intVal;
            if (typeof processedValue === 'number' && processedValue > prev.availableStock) {
                processedValue = prev.availableStock;
                setItemError(`La cantidad no puede exceder el stock disponible (${prev.availableStock}).`);
            } else if (typeof processedValue === 'number' && processedValue < 0) {
                processedValue = 0;
            } else {
                setItemError(null);
            }
        } else if (name === 'priceAtSale') {
            const floatVal = parseFloat(value);
            processedValue = isNaN(floatVal) ? (value === '' ? '' : prev.priceAtSale) : floatVal;
             if (typeof processedValue === 'number' && processedValue < 0) {
                processedValue = 0;
            }
        }
        return { ...prev, [name]: processedValue };
    });
  };

  const handleItemDetailChange = (tempIdToUpdate: number, field: 'quantity' | 'priceAtSale', value: string) => {
    const isQuantity = field === 'quantity';
    const numericValue = isQuantity ? parseInt(value) : parseFloat(value);

    setFormData(prevFormData => {
      const updatedItems = prevFormData.items.map(item => {
        if (item.tempId === tempIdToUpdate) {
          let newFieldValue = numericValue;

          if (isNaN(numericValue) && value !== '') return item; // Si no es número y no es string vacío, no cambiar
          if (isNaN(numericValue) && value === '') newFieldValue = 0; // Permitir vaciar el campo a 0

          let newQuantity = item.quantity;
          let newPriceAtSale = item.priceAtSale;

          if (isQuantity) {
            newQuantity = newFieldValue;
            if (newQuantity < 0) newQuantity = 0;
            if (newQuantity > item.availableStock) {
              newQuantity = item.availableStock;
              setItemError(`Stock máximo para ${item.productName} es ${item.availableStock}.`);
              // Podrías mostrar un error específico para este ítem en la UI
            } else {
              setItemError(null);
            }
          } else { // es priceAtSale
            newPriceAtSale = newFieldValue;
            if (newPriceAtSale < 0) newPriceAtSale = 0;
          }
          
          return {
            ...item,
            quantity: newQuantity,
            priceAtSale: newPriceAtSale,
            subtotal: newQuantity * newPriceAtSale,
          };
        }
        return item;
      });
      return { ...prevFormData, items: updatedItems };
    });
  };

  const handleClearCurrentItem = () => {
    setCurrentItem(initialCurrentItemState); // Resetea el ítem actual a su estado inicial
    setProductSearchTerm(''); // Limpia el término de búsqueda de producto
    setItemError(null); // Limpia cualquier error específico del ítem
    // Opcional: si el input de búsqueda de producto tiene un ref, podrías hacer focus en él.
  };
  
  const handleAddItemToSaleList = () => {
    setItemError(null);
    const quantity = Number(currentItem.quantity); // Asegurar que sea número
    const priceAtSale = Number(currentItem.priceAtSale); // Asegurar que sea número

    if (!currentItem.productId || !currentItem.productName) {
      setItemError('Por favor, selecciona un producto válido de la búsqueda.');
      return;
    }
    // Permitir cantidad 0 temporalmente si se está editando, pero no añadir si es 0.
    // La validación de cantidad > 0 es más para cuando se añade un *nuevo* item.
    // Si se edita a 0, quizás se debería eliminar o advertir. Por ahora, permitimos editar a 0.
    if (quantity <= 0 && currentItem.productId) { // Ajuste para permitir 0 solo si no es el placeholder
         setItemError('La cantidad debe ser mayor a cero para añadir un nuevo producto.');
         return;
    }
    if (priceAtSale < 0) { 
      setItemError('El precio de venta no puede ser negativo.');
      return;
    }
    if (quantity > currentItem.availableStock) {
      setItemError(`Stock insuficiente para ${currentItem.productName}. Disponible: ${currentItem.availableStock}.`);
      return;
    }

    const newItem: SaleItemInCart = {
      ...currentItem,
      productId: currentItem.productId,
      quantity: quantity,
      priceAtSale: priceAtSale,
      tempId: Date.now(), 
      subtotal: quantity * priceAtSale,
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    setCurrentItem(initialCurrentItemState); 
    setProductSearchTerm(''); 
  };

  // *** NUEVA FUNCIÓN ***
  const handleRemoveItem = (tempIdToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.tempId !== tempIdToRemove)
    }));
  };
  
  // *** MODIFICADA PARA USAR useCallback Y ASEGURAR TIPOS NUMÉRICOS ***
  const calculateTotal = useCallback(() => {
    return formData.items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const price = Number(item.priceAtSale) || 0;
      return sum + (quantity * price);
    }, 0);
  }, [formData.items]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    // ... (lógica de handleSubmit como estaba) ...
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!formData.sellerId || !formData.paymentType || formData.items.length === 0) {
      setError('Por favor, completa Vendedor, Tipo de Pago y añade al menos un producto.');
      setIsLoading(false);
      return;
    }

    const dataToSend = {
      clientId: formData.clientId ? parseInt(formData.clientId) : null,
      sellerId: parseInt(formData.sellerId),
      paymentType: formData.paymentType as PaymentTypeEnum,
      notes: formData.notes || null,
      items: formData.items.map(item => ({
        productId: parseInt(item.productId), // productId en el item del form es string
        quantity: item.quantity,
        priceAtSale: item.priceAtSale,
      })),
      discountCodeApplied: formData.discountCode.trim() || null,
    };

    try {
      const response = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      setSuccessMessage('¡Venta registrada exitosamente!');
      setFormData(initialFormData); 

      setTimeout(() => {
        router.push('/ventas'); 
        router.refresh();
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al registrar la venta.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // ... (if isFetchingInitialData, return ... como estaba) ...
  if (isFetchingInitialData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={24} className="animate-spin text-primary mr-2" />
        Cargando datos para el formulario...
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-muted p-6 sm:p-8 rounded-lg shadow space-y-8">
      
      {error && (
        <div className="flex items-center bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-6">
          <AlertCircle size={18} className="mr-2" /> {error}
        </div>
      )}
      {successMessage && (
        <div className="flex items-center bg-success/10 text-success text-sm p-3 rounded-md mb-6">
          <AlertCircle size={18} className="mr-2" /> {successMessage}
        </div>
      )}

      
       <fieldset className="border border-border p-4 rounded-md">
        <legend className="text-lg font-medium text-primary px-2">Datos de la Venta</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          <Select label="Cliente (Opcional)" name="clientId" value={formData.clientId} onChange={handleFormChange}>
            <option value="">Selecciona un cliente (o venta anónima)</option>
            {clients.map(client => <option key={client.id} value={String(client.id)}>{client.firstName} {client.lastName || ''}</option>)}
          </Select>
          <Select label="Vendedor *" name="sellerId" value={formData.sellerId} onChange={handleFormChange} required>
            <option value="">Selecciona un vendedor</option>
            {sellers.map(seller => <option key={seller.id} value={String(seller.id)}>{seller.name}</option>)}
          </Select>
          <Select 
    label="Tipo de Pago *" 
    name="paymentType" 
    value={formData.paymentType} 
    onChange={handleFormChange} 
    required
>
  <option value="">Selecciona un tipo de pago</option>
  {Object.values(PaymentTypeEnum).map(type => (
    <option key={type} value={type}> {/* El 'value' sigue siendo el enum en inglés */}
      {getPaymentTypeDisplay(type)}   {/* El texto visible es en español */}
    </option>
  ))}
</Select>
        </div>
        <div className="mt-6">
          <Input
            label="Código de Descuento (Opcional)"
            name="discountCode"
            value={formData.discountCode}
            onChange={handleFormChange}
            placeholder="Ej: VERANO20, 10OFF"
          />
        </div>
        <div className="mt-6">
          <label htmlFor="notes" className="block text-sm font-medium text-foreground-muted mb-1.5">Notas Adicionales (Opcional)</label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            value={formData.notes}
            onChange={handleFormChange}
            className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </fieldset>

      
      <fieldset className="border border-border p-4 rounded-md">
        <legend className="text-lg font-medium text-primary px-2">Agregar Productos a la Venta</legend>
        {itemError && (
            <div className="flex items-center bg-destructive/10 text-destructive text-sm p-3 rounded-md my-4">
                <AlertCircle size={18} className="mr-2" /> {itemError}
            </div>
        )}
        <div className="relative mb-2">
          <Input
            type="text"
            placeholder="Buscar producto por nombre o SKU..."
            value={productSearchTerm}
            onChange={handleProductSearchChange}
            // icon={<Search size={16} className="text-foreground-muted" />} // Si modificaste Input para aceptar icono
            className="peer"
          />
           {productSearchTerm && searchedProducts.length > 0 && ( // Mostrar solo si hay término y resultados
            <ul className="absolute z-10 w-full bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
              {searchedProducts.map(product => (
                <li
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                >
                  {product.name} (Stock: {product.quantityStock}) - {formatCurrency(product.priceSale)}
                </li>
              ))}
            </ul>
          )}
        </div>
        {currentItem.productId && (
          <div className="mt-4 p-4 border border-primary/50 rounded-md bg-primary/5 space-y-3 relative"> 
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-foreground">Añadir Producto: {currentItem.productName}</h3>
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                onClick={handleClearCurrentItem} 
                title="Cancelar selección de este producto"
                className="absolute top-2 right-2 p-1 h-auto w-auto" 
              >
                <XCircle size={20} className="text-destructive hover:text-destructive/80" />
              </Button>
            </div>
            <p className="text-xs text-foreground-muted">Stock Disponible: {currentItem.availableStock}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <Input
                label="Cantidad *"
                type="number"
                name="quantity"
                value={String(currentItem.quantity === 0 && currentItem.productId ? '' : currentItem.quantity)}
                onChange={handleCurrentItemFieldChange}
                min="0" // Permitir 0 aquí, la validación de >0 está al añadir
                max={String(currentItem.availableStock)}
                required
                className="h-10"
              />
              <Input
                label="Precio Venta (u.) *"
                type="number"
                name="priceAtSale"
                value={String(currentItem.priceAtSale === 0 && currentItem.productId ? '' : currentItem.priceAtSale)}
                onChange={handleCurrentItemFieldChange}
                step="0.01"
                min="0"
                required
                className="h-10"
              />
              <Button type="button" variant="secondary" onClick={handleAddItemToSaleList} className="h-10"> 
                <ShoppingCart size={16} className="mr-2" /> Añadir a Venta
              </Button>
            </div>
          </div>
        )}
      </fieldset>
      
      
      {formData.items.length > 0 && (
        <fieldset className="border border-border p-4 rounded-md">
          <legend className="text-lg font-medium text-primary px-2">Ítems en la Venta</legend>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left">
              <thead className="border-b border-border">
                <tr>
                  <th className="p-2 text-sm font-semibold text-foreground">Producto</th>
                  <th className="p-2 text-sm font-semibold text-foreground w-28 text-center">Cantidad</th>
                  <th className="p-2 text-sm font-semibold text-foreground w-36 text-right">Precio Unit.</th>
                  <th className="p-2 text-sm font-semibold text-foreground w-36 text-right">Subtotal</th>
                  <th className="p-2 text-sm font-semibold text-foreground w-20 text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {formData.items.map((item) => (
                  <tr key={item.tempId} className="border-b border-border last:border-b-0">
                    <td className="p-2 text-sm text-foreground font-medium align-middle">
                      {item.productName}
                      <p className="text-xs text-foreground-muted">Stock: {item.availableStock}</p>
                    </td>
                    <td className="p-2 text-sm text-foreground text-center align-middle">
                      <Input
                        type="number"
                        value={String(item.quantity)} // El input espera string
                        onChange={(e) => handleItemDetailChange(item.tempId, 'quantity', e.target.value)}
                        min="0" // Permitir 0, luego se puede validar o eliminar el item si es 0
                        max={String(item.availableStock)}
                        className="w-20 text-center h-9 py-1" // Clases para hacerlo más pequeño
                        aria-label={`Cantidad para ${item.productName}`}
                      />
                    </td>
                    <td className="p-2 text-sm text-foreground text-right align-middle">
                      <Input
                        type="number"
                        value={String(item.priceAtSale)} // El input espera string
                        onChange={(e) => handleItemDetailChange(item.tempId, 'priceAtSale', e.target.value)}
                        step="0.01"
                        min="0"
                        className="w-28 text-right h-9 py-1"
                        aria-label={`Precio para ${item.productName}`}
                      />
                    </td>
                    <td className="p-2 text-sm text-foreground text-right align-middle">
                      {formatCurrency(item.subtotal)}
                    </td>
                    <td className="p-2 text-center align-middle">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveItem(item.tempId)} 
                        title="Eliminar item"
                      >
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </fieldset>
      )}

      
       <div className="flex flex-col items-end mt-6">
          <p className="text-2xl font-bold text-foreground mb-4">
            TOTAL: {formatCurrency(calculateTotal())}
          </p>
          <div className="flex justify-end space-x-3 w-full">
            <Button type="button" variant="outline" onClick={() => router.push('/ventas')} disabled={isLoading}>
            Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading || formData.items.length === 0}>
            {isLoading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
            {isLoading ? 'Procesando Venta...' : 'Finalizar Venta'}
            </Button>
        </div>
      </div>
    </form>
  );
};

export default SaleForm;