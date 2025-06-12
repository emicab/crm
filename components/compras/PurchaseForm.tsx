// components/compras/PurchaseForm.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Supplier, Product } from "@/types";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import { toast } from "react-hot-toast";
import { Loader2, PlusCircle, ShoppingCart, Trash2, XCircle } from "lucide-react";
import ProductFormModal from "../productos/ProductFormModal";

// --- Interfaces para el estado del formulario ---
interface CurrentPurchaseItemState {
    productId: string;
    productName: string;
    quantity: number | "";
    purchasePrice: number | ""; // Costo por unidad
}

const initialCurrentItemState: CurrentPurchaseItemState = {
    productId: "",
    productName: "",
    quantity: 1,
    purchasePrice: 0,
};

interface PurchaseItemInCart extends CurrentPurchaseItemState {
    tempId: number;
    subtotal: number;
}

interface PurchaseFormData {
    supplierId: string;
    invoiceNumber: string;
    notes: string;
    items: PurchaseItemInCart[];
}

const initialFormData: PurchaseFormData = {
    supplierId: "",
    invoiceNumber: "",
    notes: "",
    items: [],
};

// --- Componente Principal ---
const PurchaseForm = () => {
    const router = useRouter();

    // --- Estados ---
    const [formData, setFormData] = useState<PurchaseFormData>(initialFormData);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingInitialData, setIsFetchingInitialData] = useState(true);
    const [productSearchTerm, setProductSearchTerm] = useState("");
    const [searchedProducts, setSearchedProducts] = useState<Product[]>([]);
    const [currentItem, setCurrentItem] = useState<CurrentPurchaseItemState>(
        initialCurrentItemState
    );
     const [isProductModalOpen, setIsProductModalOpen] = useState(false);

    // --- Carga de Datos Inicial ---
    useEffect(() => {
        const fetchData = async () => {
            setIsFetchingInitialData(true);
            try {
                const [suppliersRes, productsRes] = await Promise.all([
                    fetch("/api/proveedores"),
                    fetch("/api/products"),
                ]);
                if (!suppliersRes.ok || !productsRes.ok)
                    throw new Error("Error al cargar datos iniciales.");

                setSuppliers(await suppliersRes.json());
                const productsData = await productsRes.json();
                setAllProducts(
                    productsData.map((p: any) => ({
                        ...p,
                        priceSale: parseFloat(p.priceSale),
                    }))
                );
            } catch (err: unknown) {
                toast.error(
                    err instanceof Error ? err.message : "Error cargando datos."
                );
            } finally {
                setIsFetchingInitialData(false);
            }
        };
        fetchData();
    }, []);

    // --- Handlers de Producto/Ítems ---
    const handleProductSearchChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const searchTerm = e.target.value;
        setProductSearchTerm(searchTerm);
        if (!searchTerm) {
            setSearchedProducts([]);
            return;
        }
        const itemsInCartIds = formData.items.map((item) =>
            parseInt(item.productId)
        );
        const filtered = allProducts.filter(
            (product) =>
                !itemsInCartIds.includes(product.id) &&
                (product.name
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                    (product.sku &&
                        product.sku
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase())))
        );
        setSearchedProducts(filtered.slice(0, 5));
    };

    const handleSelectProduct = (product: Product) => {
        setCurrentItem({
            productId: String(product.id),
            productName: product.name,
            quantity: 1,
            purchasePrice: product.pricePurchase || 0, // Usar el último precio de compra como sugerencia
        });
        setProductSearchTerm(product.name);
        setSearchedProducts([]);
    };

    const handleCurrentItemFieldChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const { name, value } = e.target;
        setCurrentItem((prev) => ({
            ...prev,
            [name]:
                value === ""
                    ? ""
                    : name === "quantity"
                    ? parseInt(value, 10)
                    : parseFloat(value),
        }));
    };

    const handleNewProductCreated = (newProduct: Product) => {
        // Añadir el nuevo producto a la lista de productos disponibles en el formulario
        setAllProducts(prev => [...prev, newProduct]);
        // Seleccionar automáticamente el producto recién creado para añadirlo a la compra
        handleSelectProduct(newProduct);
    };

    const handleAddItemToPurchaseList = () => {
        const quantity = Number(currentItem.quantity);
        const purchasePrice = Number(currentItem.purchasePrice);
        if (!currentItem.productId) {
            toast.error("Selecciona un producto.");
            return;
        }
        if (quantity <= 0) {
            toast.error("La cantidad debe ser mayor a cero.");
            return;
        }
        if (purchasePrice < 0) {
            toast.error("El costo no puede ser negativo.");
            return;
        }

        const newItem: PurchaseItemInCart = {
            productId: currentItem.productId,
            productName: currentItem.productName,
            quantity,
            purchasePrice,
            tempId: Date.now(),
            subtotal: quantity * purchasePrice,
        };
        setFormData((prev) => ({ ...prev, items: [...prev.items, newItem] }));
        setCurrentItem(initialCurrentItemState);
        setProductSearchTerm("");
    };

    const handleRemoveItem = (tempIdToRemove: number) => {
        setFormData((prev) => ({
            ...prev,
            items: prev.items.filter((item) => item.tempId !== tempIdToRemove),
        }));
    };

    const calculateTotal = useCallback(
        () => formData.items.reduce((sum, item) => sum + item.subtotal, 0),
        [formData.items]
    );

    // --- Handler Principal de Envío ---
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        if (!formData.supplierId || formData.items.length === 0) {
            toast.error("Completa Proveedor y añade al menos un producto.");
            setIsLoading(false);
            return;
        }
        const dataToSend = {
            supplierId: parseInt(formData.supplierId),
            invoiceNumber: formData.invoiceNumber.trim() || null,
            notes: formData.notes.trim() || null,
            items: formData.items.map((item) => ({
                productId: parseInt(item.productId),
                quantity: item.quantity,
                purchasePrice: item.purchasePrice,
            })),
        };
        try {
            const response = await fetch("/api/compras", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dataToSend),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.message || `Error HTTP: ${response.status}`
                );
            }
            toast.success("¡Compra registrada y stock actualizado!");
            setFormData(initialFormData);
            setTimeout(() => {
                router.push("/compras");
                router.refresh();
            }, 1500);
        } catch (err: unknown) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Ocurrió un error al registrar la compra."
            );
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
        }).format(amount);

    if (isFetchingInitialData) {
        return (
            <div className='flex justify-center p-8'>
                <Loader2 className='animate-spin text-primary' />
            </div>
        );
    }

    // --- JSX del Componente ---
    return (
        <>
            <ProductFormModal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                onProductCreated={handleNewProductCreated}
            />
            <form
                onSubmit={handleSubmit}
                className='bg-muted p-6 sm:p-8 rounded-lg shadow space-y-8'
            >
                {/* Datos Generales de la Compra */}
                <fieldset className='border border-border p-4 rounded-md'>
                  
                    <legend className='text-lg font-medium text-primary px-2'>
                        Datos de la Compra
                    </legend>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mt-4'>
                        <Select
                            label='Proveedor *'
                            name='supplierId'
                            value={formData.supplierId}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    supplierId: e.target.value,
                                }))
                            }
                            required
                        >
                            <option value=''>Selecciona un proveedor</option>
                            {suppliers.map((s) => (
                                <option key={s.id} value={String(s.id)}>
                                    {s.name}
                                </option>
                            ))}
                        </Select>
                        <Input
                            label='Nº de Factura (Opcional)'
                            name='invoiceNumber'
                            value={formData.invoiceNumber}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    invoiceNumber: e.target.value,
                                }))
                            }
                        />
                    </div>
                    <div className='mt-6'>
                        <label
                            htmlFor='notes'
                            className='block text-sm font-medium text-foreground-muted mb-1.5'
                        >
                            Notas
                        </label>
                        <textarea
                            id='notes'
                            name='notes'
                            rows={2}
                            value={formData.notes}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    notes: e.target.value,
                                }))
                            }
                            className='block w-full rounded-md border border-border bg-background'
                        />
                    </div>
                </fieldset>
                {/* Agregar Productos */}
                <fieldset className='border border-border p-4 rounded-md'>
                    <legend className='text-lg font-medium text-primary px-2'>
                        Agregar Productos a la Compra
                    </legend>
                    <div className='relative mb-2'>
                        <Input
                            type='text'
                            placeholder='Buscar producto...'
                            value={productSearchTerm}
                            onChange={handleProductSearchChange}
                            autoComplete='off'
                        />
                        
                        {searchedProducts.length > 0 && (
                            <ul className='absolute z-10 w-full bg-background border rounded-md shadow-lg max-h-60 overflow-auto mt-1'>
                                {searchedProducts.map((p) => (
                                    <li
                                        key={p.id}
                                        onClick={() => handleSelectProduct(p)}
                                        className='px-3 py-2 hover:bg-muted cursor-pointer text-sm'
                                    >
                                        {p.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setIsProductModalOpen(true)}
                        >
                            <PlusCircle size={16} className="mr-2" />
                            Nuevo Producto
                        </Button>
                    {currentItem.productId && (
                        <div className='mt-4 p-4 border border-primary/50 rounded-md bg-primary/5 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end'>
                            <div className='sm:col-span-3'>
                                <h3 className='font-medium'>
                                    {currentItem.productName}
                                </h3>
                            </div>
                            <Input
                                label='Cantidad *'
                                type='number'
                                name='quantity'
                                value={String(currentItem.quantity)}
                                onChange={handleCurrentItemFieldChange}
                                min='1'
                                required
                            />
                            <Input
                                label='Costo Unit. *'
                                type='number'
                                name='purchasePrice'
                                value={String(currentItem.purchasePrice)}
                                onChange={handleCurrentItemFieldChange}
                                step='0.01'
                                min='0'
                                required
                            />
                            <Button
                                type='button'
                                variant='secondary'
                                onClick={handleAddItemToPurchaseList}
                            >
                                <ShoppingCart size={16} className='mr-2' />{" "}
                                Añadir
                            </Button>
                        </div>
                    )}
                </fieldset>

                {/* Ítems en la Compra */}
                {formData.items.length > 0 && (
                    <fieldset className='border border-border p-4 rounded-md'>
                        <legend className='text-lg font-medium text-primary px-2'>
                            Ítems en la Compra
                        </legend>
                        <div className='mt-4 overflow-x-auto'>
                            <table className='w-full'>
                                <thead className='border-b'>
                                    <tr>
                                        <th className='p-2 text-left'>
                                            Producto
                                        </th>
                                        <th className='p-2 text-center'>
                                            Cantidad
                                        </th>
                                        <th className='p-2 text-right'>
                                            Costo Unit.
                                        </th>
                                        <th className='p-2 text-right'>
                                            Subtotal
                                        </th>
                                        <th className='p-2 text-center'>
                                            Acción
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.items.map((item) => (
                                        <tr
                                            key={item.tempId}
                                            className='border-b last:border-b-0'
                                        >
                                            <td className='p-2 font-medium'>
                                                {item.productName}
                                            </td>
                                            <td className='p-2 text-center'>
                                                {item.quantity}
                                            </td>
                                            <td className='p-2 text-right'>
                                                {formatCurrency(
                                                    item.purchasePrice
                                                )}
                                            </td>
                                            <td className='p-2 text-right font-semibold'>
                                                {formatCurrency(item.subtotal)}
                                            </td>
                                            <td className='p-2 text-center'>
                                                <Button
                                                    type='button'
                                                    variant='ghost'
                                                    size='icon'
                                                    onClick={() =>
                                                        handleRemoveItem(
                                                            item.tempId
                                                        )
                                                    }
                                                >
                                                    <Trash2
                                                        size={16}
                                                        className='text-destructive'
                                                    />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </fieldset>
                )}
                {/* Total y Botones de Envío */}
                <div className='flex flex-col items-end mt-6'>
                    <p className='text-2xl font-bold mb-4'>
                        TOTAL COMPRA: {formatCurrency(calculateTotal())}
                    </p>
                    <div className='flex justify-end space-x-3 w-full'>
                        <Button
                            type='button'
                            variant='outline'
                            onClick={() => router.push("/compras")}
                            disabled={isLoading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type='submit'
                            variant='primary'
                            disabled={isLoading || formData.items.length === 0}
                        >
                            {isLoading ? (
                                <Loader2 className='animate-spin mr-2' />
                            ) : (
                                "Registrar Compra"
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </>
    );
};

export default PurchaseForm;
