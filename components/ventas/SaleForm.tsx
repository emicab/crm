"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Client, Seller, Product, PaymentTypeEnum, Combo, Promotion } from "@/types";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import { toast } from "react-hot-toast";
import { Loader2, ShoppingCart, Trash2, XCircle, Package, Percent, ShoppingBag } from "lucide-react";
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
  comboBatchId?: number; // para rastrear items agregados por combo
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
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barcodeInput = useRef("");
  const productInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // --- Estados del Componente ---
  const [formData, setFormData] = useState<SaleFormData>(initialFormData);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInitialData, setIsFetchingInitialData] = useState(true);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [searchedProducts, setSearchedProducts] = useState<Product[]>([]);
  const [currentItem, setCurrentItem] = useState<CurrentItemState>(
    initialCurrentItemState
  );
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [searchedClients, setSearchedClients] = useState<Client[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [appliedPromotion, setAppliedPromotion] = useState<{ promotionId: number; name: string; type: string; discountAmount: number; discountLabel: string } | null>(null);
  const [comboDiscounts, setComboDiscounts] = useState<Record<number, number>>({});
  const comboDiscount = Object.values(comboDiscounts).reduce((sum, d) => sum + d, 0);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [hasOpenCaja, setHasOpenCaja] = useState(false);
  const [showCajaModal, setShowCajaModal] = useState(false);
  const [cajaInitialBalance, setCajaInitialBalance] = useState('0');
  const [cajaSellerId, setCajaSellerId] = useState('');
  const [isOpeningCaja, setIsOpeningCaja] = useState(false);

  // --- Carga de Datos Inicial ---
  useEffect(() => {
    const fetchData = async () => {
      setIsFetchingInitialData(true);
      try {
        const [sellersRes, cajaRes, combosRes, promosRes, configRes] = await Promise.all([
          fetch("/api/vendedores"),
          fetch("/api/caja"),
          fetch("/api/combos"),
          fetch("/api/promotions"),
          fetch("/api/config"),
        ]);

        if (!sellersRes.ok) {
          throw new Error(
            "Error al cargar datos iniciales para el formulario de venta."
          );
        }

        const sellersData = await sellersRes.json();
        setSellers(sellersData);

        // Auto-seleccionar vendedor desde caja abierta
        if (cajaRes.ok) {
          const cajaData = await cajaRes.json();
          setHasOpenCaja(!!cajaData.open);
          if (cajaData.open?.seller?.id) {
            setFormData((prev) => ({ ...prev, sellerId: String(cajaData.open.seller.id) }));
          }
        }

        if (combosRes.ok) {
          const combosData = await combosRes.json();
          setCombos(combosData.filter((c: any) => c.active).map((c: any) => ({
            ...c,
            price: parseFloat(c.price),
            items: c.items.map((i: any) => ({ ...i, customPrice: i.customPrice ? parseFloat(i.customPrice) : null })),
          })));
        }

        if (promosRes.ok) {
          const promosData = await promosRes.json();
          setPromotions(promosData.filter((p: any) => {
            if (p.status !== 'ACTIVE') return false;
            const now = new Date();
            if (p.startDate && new Date(p.startDate) > now) return false;
            if (p.endDate && new Date(p.endDate) < now) return false;
            return true;
          }).map((p: any) => ({
            ...p,
            discountValue: parseFloat(p.discountValue),
          })));
        }

        if (configRes.ok) {
          setConfig(await configRes.json());
        }
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

  // Cargar productos recientemente vendidos
  useEffect(() => {
    fetch('/api/ventas/recent-products')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setRecentProducts(data.map((p: any) => ({
            ...p,
            priceSale: parseFloat(p.priceSale),
            quantityStock: parseInt(p.quantityStock),
          })));
        }
      })
      .catch(() => {});
  }, []);

  // Auto-foco en input de producto al cargar
  useEffect(() => {
    if (!isFetchingInitialData) {
      productInputRef.current?.focus();
    }
  }, [isFetchingInitialData]);

  // --- Atajos de Teclado Globales ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {

      // F8 o Ctrl+K: enfocar búsqueda de producto
      if (e.key === 'F8' || (e.ctrlKey && e.key === 'k')) {
        e.preventDefault();
        productInputRef.current?.focus();
        return;
      }

      // Escape: limpiar selección de producto
      if (e.key === 'Escape' && currentItem.productId) {
        e.preventDefault();
        handleClearCurrentItem();
        return;
      }

      // F2: enfocar tipo de pago
      if (e.key === 'F2') {
        e.preventDefault();
        const paymentSelect = document.querySelector<HTMLSelectElement>('select[name="paymentType"]');
        paymentSelect?.focus();
        return;
      }

      // Ctrl+Enter: finalizar venta
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        submitButtonRef.current?.click();
        return;
      }

      // F10: finalizar venta (alternativa)
      if (e.key === 'F10') {
        e.preventDefault();
        submitButtonRef.current?.click();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // --- Handlers de Cliente ---
  useEffect(() => {
    if (clientSearchTerm.trim() === "") {
      setSearchedClients([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients?search=${encodeURIComponent(clientSearchTerm)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchedClients(data);
        }
      } catch (err) {
        console.error(err);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [clientSearchTerm]);

  const handleClientSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value;
    setClientSearchTerm(searchTerm);
    if (searchTerm.trim() === "") {
      setFormData((prev) => ({ ...prev, clientId: "" }));
    }
  };

  const handleSelectClient = (client: Client) => {
    setClientSearchTerm(`${client.firstName} ${client.lastName || ""}`.trim());
    setFormData((prev) => ({ ...prev, clientId: String(client.id) }));
    setSearchedClients([]);
  };

  const handleClearClientSelection = () => {
    setClientSearchTerm("");
    setFormData((prev) => ({ ...prev, clientId: "" }));
    setSearchedClients([]);
  };

  // --- Handlers de Producto/Ítems ---
  useEffect(() => {
    if (!productSearchTerm.trim()) {
      setSearchedProducts([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(productSearchTerm)}`);
        if (res.ok) {
          const data = await res.json();
          const itemsInCartIds = formData.items.map((item) => parseInt(item.productId));
          const filtered = data
            .filter((p: any) => !itemsInCartIds.includes(p.id))
            .map((p: any) => ({
              ...p,
              priceSale: parseFloat(p.priceSale),
              quantityStock: parseInt(p.quantityStock),
            }));
          setSearchedProducts(filtered.slice(0, 5));
        }
      } catch (err) {
        console.error(err);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [productSearchTerm, formData.items]);

  const handleProductSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setProductSearchTerm(value);

    // Detectar lector de código de barras (caracteres rápidos consecutivos)
    if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
    if (value.length > barcodeInput.current.length) {
      barcodeInput.current = value;
      barcodeTimer.current = setTimeout(() => {
        barcodeInput.current = "";
      }, 100);
    } else {
      barcodeInput.current = "";
    }
  };

  const handleProductKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && barcodeInput.current.length > 0) {
      e.preventDefault();
      const code = barcodeInput.current;
      barcodeInput.current = "";
      // Buscar producto por código de barras (SKU)
      fetch(`/api/products?search=${encodeURIComponent(code)}`).then((res) => {
        if (res.ok) return res.json();
        return [];
      }).then((data) => {
        const product = data?.[0];
        if (product) {
          handleSelectProduct({
            ...product,
            priceSale: parseFloat(product.priceSale),
            quantityStock: parseInt(product.quantityStock),
          });
        } else {
          toast.error(`Producto con código "${code}" no encontrado.`);
        }
      }).catch(() => {
        toast.error("Error al buscar producto por código de barras.");
      });
    }
  };

  const handleSelectProduct = (product: Product) => {
    if (product.quantityStock <= 0) {
      toast.error(`"${product.name}" no tiene stock disponible.`);
      setProductSearchTerm("");
      setSearchedProducts([]);
      productInputRef.current?.focus();
      return;
    }
    if (formData.items.some(i => i.productId === String(product.id))) {
      toast.error(`"${product.name}" ya está en la venta.`);
      setProductSearchTerm("");
      setSearchedProducts([]);
      productInputRef.current?.focus();
      return;
    }
    const newItem: SaleItemInCart = {
      productId: String(product.id),
      productName: product.name,
      availableStock: product.quantityStock,
      quantity: 1,
      priceAtSale: product.priceSale,
      tempId: Date.now(),
      subtotal: product.priceSale,
    };
    setFormData((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    setProductSearchTerm("");
    setSearchedProducts([]);
    setTimeout(() => productInputRef.current?.focus(), 50);
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
    // Auto-foco para el siguiente producto
    setTimeout(() => productInputRef.current?.focus(), 50);
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
          const updatedItem = { ...item };
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
    setFormData((prev) => {
      const removedItem = prev.items.find(i => i.tempId === tempIdToRemove);
      const remaining = prev.items.filter((item) => item.tempId !== tempIdToRemove);
      // si el item eliminado pertenecía a un combo, limpiar descuento si no quedan items de ese batch
      if (removedItem?.comboBatchId) {
        const batchStillPresent = remaining.some(i => i.comboBatchId === removedItem.comboBatchId);
        if (!batchStillPresent) {
          setComboDiscounts(prevDiscounts => {
            const next = { ...prevDiscounts };
            delete next[removedItem.comboBatchId!];
            return next;
          });
        }
      }
      return { ...prev, items: remaining };
    });
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

  const subtotal = calculateTotal();
  const paymentMethodDiscountPct = formData.paymentType ? parseFloat(config[`discount_${formData.paymentType}`] || '0') : 0;
  const paymentMethodDiscount = subtotal * (paymentMethodDiscountPct / 100);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    if (!formData.paymentType) {
      toast.error("Seleccioná un tipo de pago.");
      setIsLoading(false);
      return;
    }
    if (formData.items.length === 0) {
      toast.error("Añadí al menos un producto a la venta.");
      setIsLoading(false);
      return;
    }
    if (!formData.sellerId) {
      if (!hasOpenCaja) {
        setShowCajaModal(true);
        setIsLoading(false);
        return;
      }
      toast.error("La caja abierta no tiene un vendedor asignado. Asigná un vendedor en la caja.");
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
      paymentMethodDiscount,
      promotionsApplied: [
        ...(comboDiscount > 0 ? [{ promotionId: 0, name: 'Descuento combo', type: 'COMBO', discountAmount: comboDiscount }] : []),
        ...(appliedPromotion ? [{
          promotionId: appliedPromotion.promotionId,
          name: appliedPromotion.name,
          type: appliedPromotion.type,
          discountAmount: appliedPromotion.discountAmount,
        }] : []),
      ],
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
      setComboDiscounts({});
      setAppliedPromotion(null);
      setTimeout(() => productInputRef.current?.focus(), 50);
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

  const handleOpenCajaFromSale = async () => {
    if (!cajaSellerId) {
      toast.error("Seleccioná un vendedor para abrir la caja.");
      return;
    }
    setIsOpeningCaja(true);
    try {
      const res = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initialBalance: parseFloat(cajaInitialBalance) || 0,
          sellerId: cajaSellerId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      toast.success("Caja abierta exitosamente.");
      setShowCajaModal(false);
      setHasOpenCaja(true);
      setFormData((prev) => ({ ...prev, sellerId: cajaSellerId }));
      setTimeout(() => productInputRef.current?.focus(), 50);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error al abrir la caja."
      );
    } finally {
      setIsOpeningCaja(false);
    }
  };

  const handleSelectCombo = (combo: Combo) => {
    if (!combo.items || combo.items.length === 0) {
      toast.error('El combo no tiene productos.');
      return;
    }

    const batchId = Date.now();
    const newItems: SaleItemInCart[] = combo.items.map(item => ({
      productId: String(item.productId),
      productName: `${item.product?.name || `#${item.productId}`} (Combo: ${combo.name})`,
      availableStock: item.product?.quantityStock ?? 999,
      quantity: item.quantity,
      priceAtSale: item.customPrice ?? item.product?.priceSale ?? 0,
      tempId: batchId + item.productId,
      subtotal: (item.customPrice ?? item.product?.priceSale ?? 0) * item.quantity,
      comboBatchId: batchId,
    }));

    const fullSum = newItems.reduce((sum, item) => sum + item.subtotal, 0);
    const discount = Math.max(0, fullSum - combo.price);

    setFormData((prev) => ({ ...prev, items: [...prev.items, ...newItems] }));
    setComboDiscounts(prev => ({ ...prev, [batchId]: discount }));
    setProductSearchTerm("");
    setSearchedProducts([]);
    toast.success(`Combo "${combo.name}" agregado ($${combo.price}, ahorro $${discount}).`);
    setTimeout(() => productInputRef.current?.focus(), 50);
  };

  const evaluatePromotions = useCallback((items: SaleItemInCart[], subtotal: number) => {
    if (!promotions.length || items.length === 0) {
      setAppliedPromotion(null);
      return;
    }

    const itemCountByProductId: Record<string, number> = {};
    const itemSubtotalByProductId: Record<string, number> = {};

    items.forEach(item => {
      const pid = item.productId;
      itemCountByProductId[pid] = (itemCountByProductId[pid] || 0) + item.quantity;
      itemSubtotalByProductId[pid] = (itemSubtotalByProductId[pid] || 0) + item.subtotal;
      // We don't have category info in cart items, so category-based promos are limited
    });

    let bestPromo: { promotionId: number; name: string; type: string; discountAmount: number; discountLabel: string } | null = null;

    for (const promo of promotions) {
      if (!promo.conditions || promo.conditions.length === 0) continue;

      let discount = 0;
      let qualifies = false;

      if (promo.type === 'BUY_X_GET_Y') {
        // Check each condition: if cart has >= minQuantity of the product, apply discount
        for (const cond of promo.conditions) {
          if (!cond.productId) continue;
          const pid = String(cond.productId);
          const qtyInCart = itemCountByProductId[pid] || 0;
          if (qtyInCart >= cond.minQuantity) {
            qualifies = true;
            const times = Math.floor(qtyInCart / cond.minQuantity);
            const maxDiscountUnits = promo.maxDiscountQty || 1;
            const discountUnits = Math.min(times, maxDiscountUnits);
            const unitPrice = itemSubtotalByProductId[pid] / qtyInCart;
            if (promo.discountType === 'PERCENTAGE') {
              discount += unitPrice * discountUnits * (promo.discountValue / 100);
            } else {
              discount += promo.discountValue * discountUnits;
            }
          }
        }
      } else if (promo.type === 'SET_DISCOUNT') {
        // Check if ALL conditions are met (each product in cart with required qty)
        qualifies = promo.conditions.every(cond => {
          if (cond.productId) {
            return (itemCountByProductId[String(cond.productId)] || 0) >= cond.minQuantity;
          }
          return false;
        });
        if (qualifies) {
          if (promo.discountType === 'PERCENTAGE') {
            discount = subtotal * (promo.discountValue / 100);
          } else {
            discount = promo.discountValue;
          }
        }
      } else if (promo.type === 'THRESHOLD') {
        const threshold = promo.minQuantity || 0;
        if (subtotal >= threshold) {
          qualifies = true;
          if (promo.discountType === 'PERCENTAGE') {
            discount = subtotal * (promo.discountValue / 100);
          } else {
            discount = promo.discountValue;
          }
        }
      }

      if (qualifies && discount > 0 && (!bestPromo || discount > bestPromo.discountAmount)) {
        const label = promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}%` : `$${promo.discountValue}`;
        bestPromo = {
          promotionId: promo.id,
          name: promo.name,
          type: promo.type,
          discountAmount: discount,
          discountLabel: label,
        };
      }
    }

    setAppliedPromotion(bestPromo);
  }, [promotions]);

  // Re-evaluate promos when items change
  useEffect(() => {
    const subtotal = calculateTotal();
    evaluatePromotions(formData.items, subtotal);
  }, [formData.items, calculateTotal, evaluatePromotions]);

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
    <>
    <form
      onSubmit={handleSubmit}
      noValidate
      className="bg-muted p-6 sm:p-8 rounded-lg shadow space-y-6"
    >
      {/* Sección Producto (principal) */}
      <fieldset className="border border-border p-4 rounded-md">
        <legend className="text-lg font-medium text-primary px-2">
          Producto
        </legend>
        <div className="relative mb-2">
          <Input
            ref={productInputRef}
            type="text"
            placeholder="Buscar producto por nombre o SKU... (código de barras automático)"
            value={productSearchTerm}
            onChange={handleProductSearchChange}
            onKeyDown={handleProductKeyDown}
            autoComplete="off"
          />
          <p className="text-[10px] text-foreground-muted/60 mt-1">
            <kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono text-[9px]">F8</kbd> buscar &middot;
            <kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono text-[9px] ml-1">Esc</kbd> limpiar &middot;
            código de barras automático
          </p>
          {combos.length > 0 && !productSearchTerm && searchedProducts.length === 0 && (
            <div className="mt-2 mb-1">
              <p className="text-[10px] text-foreground-muted/70 mb-1.5 flex items-center gap-1">
                <ShoppingBag size={10} /> Combos disponibles
              </p>
              <div className="flex flex-wrap gap-1.5">
                {combos.map((combo) => (
                  <button
                    key={combo.id}
                    type="button"
                    onClick={() => handleSelectCombo(combo)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-amber-400/40 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                  >
                    <ShoppingBag size={12} />
                    {combo.name}
                    <span className="text-[10px] text-amber-500/70">{formatCurrency(combo.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {recentProducts.length > 0 && !productSearchTerm && searchedProducts.length === 0 && (
            <div className="mt-2 mb-1">
              <p className="text-[10px] text-foreground-muted/70 mb-1.5 flex items-center gap-1">
                <Package size={10} /> Últimos vendidos
              </p>
              <div className="flex flex-wrap gap-1.5">
                {recentProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProduct(p)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      p.quantityStock <= 0
                        ? 'border-destructive/40 text-destructive hover:bg-destructive/10'
                        : 'border-primary/30 text-primary hover:bg-primary/10'
                    }`}
                  >
                    {p.name}
                    <span className={`text-[10px] ${p.quantityStock <= 0 ? 'text-destructive/70' : 'text-primary/70'}`}>
                      {formatCurrency(p.priceSale)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {searchedProducts.length > 0 && (
            <ul className="absolute z-10 w-full bg-background border border-border rounded-md shadow-lg max-h-72 overflow-y-auto mt-1">
              {searchedProducts.map((product) => (
                <li
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className="px-4 py-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1 mr-4">
                      <p className="font-medium text-sm text-foreground truncate">{product.name}</p>
                      {product.sku && <p className="text-[11px] text-foreground-muted truncate">SKU: {product.sku}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-primary">{formatCurrency(product.priceSale)}</p>
                      <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-medium ${product.quantityStock <= 0 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                        Stock: {product.quantityStock}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {currentItem.productId && (
          <div className="mt-4 p-4 border border-primary/50 rounded-md bg-primary/5 space-y-3 relative">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-foreground">
                Añadir: {currentItem.productName}
              </h3>
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
            <p className="text-[10px] text-foreground-muted/60 mt-2">
              <kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono text-[9px]">Enter</kbd> añadir &middot;
              <kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono text-[9px] ml-1">Ctrl+Enter</kbd> finalizar venta
            </p>
          </div>
        )}
      </fieldset>

      {/* Sección Pago */}
      <fieldset className="border border-border p-4 rounded-md">
        <legend className="text-lg font-medium text-primary px-2">
          Pago
        </legend>
        <div className="mt-4">
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
          <p className="text-[10px] text-foreground-muted/60 mt-1">
            <kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono text-[9px]">F2</kbd> enfocar
          </p>
        </div>
      </fieldset>

      {/* Sección Detalles Adicionales (colapsable) */}
      <details className="border border-border rounded-md p-4">
        <summary className="text-sm font-medium text-primary cursor-pointer select-none">
          Detalles adicionales (cliente, vendedor, descuento)
        </summary>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <Input
            label="Código de Descuento (Opcional)"
            name="discountCode"
            value={formData.discountCode}
            onChange={handleFormChange}
            placeholder="Ej: VERANO20"
          />
        </div>
        <div className="mt-4">
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
      </details>

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
        <div className="text-right mb-4 space-y-1">
          <p className="text-lg text-foreground-muted">
            Subtotal: {formatCurrency(subtotal)}
          </p>
          {comboDiscount > 0 && (
            <p className="text-sm font-medium text-amber-600 flex items-center justify-end gap-1">
              <ShoppingBag size={14} />
              Descuento combo: -{formatCurrency(comboDiscount)}
            </p>
          )}
          {paymentMethodDiscount > 0 && (
            <p className="text-sm font-medium text-blue-600 flex items-center justify-end gap-1">
              <Percent size={14} />
              Desc. {getPaymentTypeDisplay(formData.paymentType as any)} ({paymentMethodDiscountPct}%): -{formatCurrency(paymentMethodDiscount)}
            </p>
          )}
          {appliedPromotion && (
            <p className="text-sm font-medium text-success flex items-center justify-end gap-1">
              <Percent size={14} />
              Promo: {appliedPromotion.name} (-{appliedPromotion.discountLabel})
            </p>
          )}
          <p className="text-2xl font-bold text-foreground">
            TOTAL: {formatCurrency(subtotal - comboDiscount - paymentMethodDiscount - (appliedPromotion?.discountAmount || 0))}
          </p>
        </div>
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
            ref={submitButtonRef}
            type="submit"
            variant="primary"
            disabled={isLoading || formData.items.length === 0}
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin mr-2" />
            ) : null}
            {isLoading ? "Procesando Venta..." : "Finalizar Venta"}
          </Button>
          <p className="text-[10px] text-foreground-muted/60 mt-2 text-right w-full">
            <kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono text-[9px]">Ctrl+Enter</kbd> &middot;
            <kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono text-[9px] ml-1">F10</kbd> finalizar
          </p>
        </div>
      </div>
    </form>

      {showCajaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCajaModal(false)}>
          <div className="bg-muted text-foreground rounded-lg shadow-xl w-full max-w-md m-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-1">No tenés una caja abierta</h3>
            <p className="text-sm text-foreground-muted mb-4">
              Para registrar una venta necesitás tener una caja abierta. Seleccioná el vendedor y el saldo inicial.
            </p>
            <div className="space-y-4">
              <Select label="Vendedor *" value={cajaSellerId} onChange={(e) => setCajaSellerId(e.target.value)} required>
                <option value="">Selecciona un vendedor</option>
                {sellers.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
              </Select>
              <Input label="Saldo Inicial ($)" type="number" step="0.01" value={cajaInitialBalance} onChange={(e) => setCajaInitialBalance(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setShowCajaModal(false)} disabled={isOpeningCaja}>Cancelar</Button>
              <Button type="button" variant="primary" onClick={handleOpenCajaFromSale} disabled={isOpeningCaja || !cajaSellerId}>
                {isOpeningCaja ? 'Abriendo...' : 'Abrir Caja'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SaleForm;
