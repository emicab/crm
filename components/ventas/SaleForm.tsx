"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Client, Seller, Product, PaymentTypeEnum } from "@/types";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import { toast } from "react-hot-toast";
import { Loader2, ShoppingCart, Trash2, XCircle } from "lucide-react";
import { getPaymentTypeDisplay } from "@/lib/displayTexts";

// --- Interfaces para el estado del formulario ---

// Para el ítem que se está configurando antes de añadirlo al carrito
interface CurrentItemState {
  productId: string;
  productName: string;
  quantity: number | "";
  priceAtSale: number | "";
  availableStock: number;
}

// Para los ítems que ya están en el carrito de la venta
interface SaleItemInCart
  extends Omit<CurrentItemState, "quantity" | "priceAtSale"> {
  tempId: number; // ID temporal para la key de React y para eliminar/editar
  quantity: number;
  priceAtSale: number;
  subtotal: number;
}

// Para el estado principal del formulario
interface SaleFormData {
  clientId: string;
  sellerId: string;
  paymentType: PaymentTypeEnum | "";
  notes: string;
  items: SaleItemInCart[];
  discountCode: string;
}

const initialCurrentItemState: CurrentItemState = {
  productId: "",
  productName: "",
  quantity: 1,
  priceAtSale: 0,
  availableStock: 0,
};

const initialFormData: SaleFormData = {
  clientId: "",
  sellerId: "",
  paymentType: "",
  notes: "",
  items: [],
  discountCode: "",
};

// --- Componente Principal ---

const SaleForm = () => {
  const router = useRouter();

  // --- Estados del Componente ---
  const [formData, setFormData] = useState<SaleFormData>(initialFormData);
  const [clients, setClients] = useState<Client[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInitialData, setIsFetchingInitialData] = useState(true);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [searchedProducts, setSearchedProducts] = useState<Product[]>([]);
  const [currentItem, setCurrentItem] = useState<CurrentItemState>(
    initialCurrentItemState
  );
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [searchedClients, setSearchedClients] = useState<Client[]>([]);

  // --- Carga de Datos Inicial ---
  useEffect(() => {
    const fetchData = async () => {
      setIsFetchingInitialData(true);
      try {
        const [clientsRes, sellersRes, productsRes] = await Promise.all([
          fetch("/api/clients"),
          fetch("/api/vendedores"),
          fetch("/api/products"),
        ]);

        if (!clientsRes.ok || !sellersRes.ok || !productsRes.ok) {
          throw new Error(
            "Error al cargar datos iniciales para el formulario de venta."
          );
        }

        setClients(await clientsRes.json());
        setSellers(await sellersRes.json());
        const productsData = await productsRes.json();
        setAllProducts(
          productsData.map((p: any) => ({
            ...p,
            priceSale: parseFloat(p.priceSale),
            quantityStock: parseInt(p.quantityStock),
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

  // --- Handlers de Cliente ---
  const handleClientSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value;
    setClientSearchTerm(searchTerm);
    if (searchTerm.trim() === "") {
      setSearchedClients([]);
      setFormData((prev) => ({ ...prev, clientId: "" }));
      return;
    }
    const filtered = clients.filter((client) =>
      `${client.firstName} ${client.lastName || ""}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
    setSearchedClients(filtered.slice(0, 5));
  };

  const handleSelectClient = (client: Client) => {
    setClientSearchTerm(`${client.firstName} ${client.lastName || ""}`.trim());
    setFormData((prev) => ({ ...prev, clientId: String(client.id) }));
    setSearchedClients([]);
  };

  const handleClearClientSelection = () => {
    setClientSearchTerm("");
    setFormData((prev) => ({ ...prev, clientId: "" }));
  };

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
        (product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (product.sku &&
            product.sku.toLowerCase().includes(searchTerm.toLowerCase())))
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

  const handleCurrentItemFieldChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setCurrentItem((prev) => {
      let processedValue: number | "" =
        value === ""
          ? ""
          : name === "quantity"
          ? parseInt(value, 10)
          : parseFloat(value);
      if (isNaN(Number(processedValue)))
        processedValue = prev[name as keyof CurrentItemState] as number | "";
      if (
        name === "quantity" &&
        typeof processedValue === "number" &&
        processedValue > prev.availableStock
      ) {
        toast.error(
          `Stock máximo para ${prev.productName} es ${prev.availableStock}.`
        );
        processedValue = prev.availableStock;
      }
      return { ...prev, [name]: processedValue };
    });
  };

  const handleAddItemToSaleList = () => {
    const quantity = Number(currentItem.quantity);
    const priceAtSale = Number(currentItem.priceAtSale);

    if (!currentItem.productId) {
      toast.error("Por favor, selecciona un producto.");
      return;
    }
    if (quantity <= 0) {
      toast.error("La cantidad debe ser mayor a cero.");
      return;
    }
    if (priceAtSale < 0) {
      toast.error("El precio de venta no puede ser negativo.");
      return;
    }
    if (quantity > currentItem.availableStock) {
      toast.error(
        `Stock insuficiente. Disponible: ${currentItem.availableStock}.`
      );
      return;
    }

    const newItem: SaleItemInCart = {
      productId: currentItem.productId,
      productName: currentItem.productName,
      availableStock: currentItem.availableStock,
      quantity,
      priceAtSale,
      tempId: Date.now(),
      subtotal: quantity * priceAtSale,
    };
    setFormData((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    setCurrentItem(initialCurrentItemState);
    setProductSearchTerm("");
  };

  const handleItemDetailChange = (
    tempIdToUpdate: number,
    field: "quantity" | "priceAtSale",
    value: string
  ) => {
    const numericValue =
      value === ""
        ? 0
        : field === "quantity"
        ? parseInt(value)
        : parseFloat(value);
    if (isNaN(numericValue)) return;

    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.tempId === tempIdToUpdate) {
          let updatedItem = { ...item };
          if (field === "quantity") {
            if (numericValue > item.availableStock) {
              toast.error(
                `Stock máximo para ${item.productName} es ${item.availableStock}.`
              );
              updatedItem.quantity = item.availableStock;
            } else {
              updatedItem.quantity = numericValue < 0 ? 0 : numericValue;
            }
          } else {
            // es priceAtSale
            updatedItem.priceAtSale = numericValue < 0 ? 0 : numericValue;
          }
          updatedItem.subtotal = updatedItem.quantity * updatedItem.priceAtSale;
          return updatedItem;
        }
        return item;
      }),
    }));
  };

  const handleRemoveItem = (tempIdToRemove: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.tempId !== tempIdToRemove),
    }));
  };

  // --- Handlers de Formulario Principal ---
  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const calculateTotal = useCallback(() => {
    return formData.items.reduce((sum, item) => sum + item.subtotal, 0);
  }, [formData.items]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    if (
      !formData.sellerId ||
      !formData.paymentType ||
      formData.items.length === 0
    ) {
      toast.error(
        "Completa Vendedor, Tipo de Pago y añade al menos un producto."
      );
      setIsLoading(false);
      return;
    }
    const dataToSend = {
      clientId: formData.clientId ? parseInt(formData.clientId) : null,
      sellerId: parseInt(formData.sellerId),
      paymentType: formData.paymentType as PaymentTypeEnum,
      notes: formData.notes.trim() || null,
      items: formData.items.map((item) => ({
        productId: parseInt(item.productId),
        quantity: item.quantity,
        priceAtSale: item.priceAtSale,
      })),
      discountCodeApplied: formData.discountCode.trim() || null,
    };
    try {
      const response = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }
      toast.success("¡Venta registrada exitosamente!");
      setFormData(initialFormData);
      setClientSearchTerm("");
      setTimeout(() => {
        router.push("/ventas");
        router.refresh();
      }, 1500);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al registrar la venta."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCurrentItem = () => {
    setCurrentItem(initialCurrentItemState);
    setProductSearchTerm("");
  };

  // --- Helpers de Renderizado ---
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  };

  if (isFetchingInitialData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={24} className="animate-spin text-primary mr-2" />{" "}
        Cargando datos...
      </div>
    );
  }

  // --- JSX del Componente ---
  return (
    <form
      onSubmit={handleSubmit}
      className="bg-muted p-6 sm:p-8 rounded-lg shadow space-y-8"
    >
      {/* Sección Datos Generales */}
      <fieldset className="border border-border p-4 rounded-md">
        <legend className="text-lg font-medium text-primary px-2">
          Datos de la Venta
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          <div className="relative">
            <Input
              label="Cliente (Opcional)"
              name="clientSearch"
              placeholder="Buscar cliente..."
              value={clientSearchTerm}
              onChange={handleClientSearchChange}
              autoComplete="off"
            />
            {formData.clientId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearClientSelection}
                className="absolute top-7 right-1 h-7 w-7 p-0"
                title="Deseleccionar cliente"
              >
                <XCircle
                  size={16}
                  className="text-foreground-muted hover:text-destructive"
                />
              </Button>
            )}
            {searchedClients.length > 0 && (
              <ul className="absolute z-20 w-full bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                {searchedClients.map((client) => (
                  <li
                    key={client.id}
                    onClick={() => handleSelectClient(client)}
                    className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                  >
                    <p className="font-medium text-foreground">
                      {client.firstName} {client.lastName || ""}
                    </p>
                    <p className="text-xs text-foreground-muted">
                      {client.email || "Sin email"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Select
            label="Vendedor *"
            name="sellerId"
            value={formData.sellerId}
            onChange={handleFormChange}
            required
          >
            <option value="">Selecciona un vendedor</option>
            {sellers.map((seller) => (
              <option key={seller.id} value={String(seller.id)}>
                {seller.name}
              </option>
            ))}
          </Select>
          <Select
            label="Tipo de Pago *"
            name="paymentType"
            value={formData.paymentType}
            onChange={handleFormChange}
            required
          >
            <option value="">Selecciona un tipo de pago</option>
            {Object.values(PaymentTypeEnum).map((type) => (
              <option key={type} value={type}>
                {getPaymentTypeDisplay(type)}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Input
            label="Código de Descuento (Opcional)"
            name="discountCode"
            value={formData.discountCode}
            onChange={handleFormChange}
            placeholder="Ej: VERANO20"
          />
          <div className="md:col-span-2">
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-foreground-muted mb-1.5"
            >
              Notas Adicionales (Opcional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              value={formData.notes}
              onChange={handleFormChange}
              className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      </fieldset>

      {/* Sección Agregar Productos */}
      <fieldset className="border border-border p-4 rounded-md">
        <legend className="text-lg font-medium text-primary px-2">
          Agregar Productos
        </legend>
        <div className="relative mb-2">
          <Input
            type="text"
            placeholder="Buscar producto por nombre o SKU..."
            value={productSearchTerm}
            onChange={handleProductSearchChange}
            autoComplete="off"
          />
          {searchedProducts.length > 0 && (
            <ul className="absolute z-10 w-full bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
              {searchedProducts.map((product) => (
                <li
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                >
                  {product.name} (Stock: {product.quantityStock}) -{" "}
                  {formatCurrency(product.priceSale)}
                </li>
              ))}
            </ul>
          )}
        </div>
        {currentItem.productId && (
          <div className="mt-4 p-4 border border-primary/50 rounded-md bg-primary/5 space-y-3 relative">
            {" "}
            {/* 'relative' para el botón de cerrar */}
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-foreground">
                Añadir: {currentItem.productName}
              </h3>
              {/* --- BOTÓN PARA CERRAR/DESELECCIONAR REINTRODUCIDO --- */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClearCurrentItem}
                title="Cancelar selección de este producto"
                className="absolute top-2 right-2 p-1 h-auto w-auto"
              >
                <XCircle
                  size={20}
                  className="text-destructive hover:text-destructive/80"
                />
              </Button>
            </div>
            <p className="text-xs text-foreground-muted">
              Stock Disponible: {currentItem.availableStock}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <Input
                label="Cantidad *"
                type="number"
                name="quantity"
                value={String(currentItem.quantity)}
                onChange={handleCurrentItemFieldChange}
                min="1"
                required
                className="h-10"
              />
              <Input
                label="Precio Venta (u.) *"
                type="number"
                name="priceAtSale"
                value={String(currentItem.priceAtSale)}
                onChange={handleCurrentItemFieldChange}
                step="0.01"
                min="0"
                required
                className="h-10"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddItemToSaleList}
                className="h-10"
              >
                <ShoppingCart size={16} className="mr-2" /> Añadir a Venta
              </Button>
            </div>
          </div>
        )}
      </fieldset>

      {/* Sección Ítems en la Venta */}
      {formData.items.length > 0 && (
        <fieldset className="border border-border p-4 rounded-md">
          <legend className="text-lg font-medium text-primary px-2">Ítems en la Venta</legend>
          
          {/* Tabla para Escritorio (oculta en móvil) */}
          <div className="mt-4 overflow-x-auto hidden md:block">
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
                    <td className="p-2 text-sm text-foreground font-medium align-middle">{item.productName}<p className="text-xs text-foreground-muted">Stock: {item.availableStock}</p></td>
                    <td className="p-2 align-middle"><Input type="number" value={String(item.quantity)} onChange={(e) => handleItemDetailChange(item.tempId, 'quantity', e.target.value)} min="0" max={String(item.availableStock)} className="w-20 text-center h-9 py-1 mx-auto" aria-label={`Cantidad para ${item.productName}`} /></td>
                    <td className="p-2 align-middle"><Input type="number" value={String(item.priceAtSale)} onChange={(e) => handleItemDetailChange(item.tempId, 'priceAtSale', e.target.value)} step="0.01" min="0" className="w-28 text-right h-9 py-1 ml-auto" aria-label={`Precio para ${item.productName}`} /></td>
                    <td className="p-2 text-sm text-foreground text-right align-middle">{formatCurrency(item.subtotal)}</td>
                    <td className="p-2 text-center align-middle"><Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(item.tempId)} title="Eliminar item"><Trash2 size={16} className="text-destructive" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Lista de Tarjetas para Móvil (oculta en escritorio) */}
          <div className="mt-4 space-y-3 md:hidden">
            {formData.items.map((item) => (
                <div key={item.tempId} className="bg-background p-3 rounded-lg border border-border">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-semibold text-foreground">{item.productName}</p>
                            <p className="text-xs text-foreground-muted">Subtotal: {formatCurrency(item.subtotal)}</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(item.tempId)} title="Eliminar item" className="h-8 w-8 -mr-2 -mt-1">
                            <Trash2 size={16} className="text-destructive" />
                        </Button>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/60 grid grid-cols-2 gap-3 items-end">
                        <Input 
                            label="Cantidad"
                            type="number"
                            value={String(item.quantity)}
                            onChange={(e) => handleItemDetailChange(item.tempId, 'quantity', e.target.value)}
                            min="0" max={String(item.availableStock)}
                            className="h-9 py-1"
                        />
                         <Input 
                            label="Precio Unit."
                            type="number"
                            value={String(item.priceAtSale)}
                            onChange={(e) => handleItemDetailChange(item.tempId, 'priceAtSale', e.target.value)}
                            step="0.01" min="0"
                            className="h-9 py-1"
                        />
                    </div>
                </div>
            ))}
          </div>
        </fieldset>
      )}
      {/* Total y Botones de Envío */}
      <div className="flex flex-col items-end mt-6">
        <p className="text-2xl font-bold text-foreground mb-4">
          TOTAL: {formatCurrency(calculateTotal())}
        </p>
        <div className="flex justify-end space-x-3 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/ventas")}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || formData.items.length === 0}
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin mr-2" />
            ) : null}
            {isLoading ? "Procesando Venta..." : "Finalizar Venta"}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default SaleForm;
